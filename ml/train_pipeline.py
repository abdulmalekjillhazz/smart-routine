#!/usr/bin/env python3
"""Train the missed-routine model from consented, pseudonymized completions.

Usage:
  python ml/train_pipeline.py --input ml/data/completions.csv --out ml/artifacts
  python ml/train_pipeline.py --input ml/data/synthetic.csv --out ml/artifacts --synthetic

Refuses to train on too little data, and explains why in plain words.
Writes a versioned artifact, a SHA-256 sidecar, and parity fixtures for the JavaScript test.
Never writes raw user data.
"""
import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, roc_auc_score
from sklearn.model_selection import GridSearchCV, StratifiedKFold

FEATURES = ["early", "start_hour", "duration_min", "weekday", "priority_low", "priority_medium"]
REQUIRED_COLUMNS = {"user_hash", "day", "start_hour", "duration_min", "weekday", "priority", "missed"}
MIN_ROWS = 200
MIN_TEST_ROWS = 50
MIN_MINORITY_TRAIN = 10
C_GRID = [0.1, 1.0, 10.0]
CALIBRATION_RANGE = (0.8, 1.2)
TEST_FRACTION = 0.2
PARITY_CASES = 50
CONSENT_VERSION = "model-training-v1"


class Refusal(Exception):
    """The data is not good enough. The message says why, in plain words."""


def load_rows(path):
    df = pd.read_csv(path, dtype={"user_hash": str, "day": str, "priority": str})
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise Refusal(f"The CSV is missing columns: {', '.join(sorted(missing))}.")
    if len(df) < MIN_ROWS:
        raise Refusal(
            f"Only {len(df)} rows. At least {MIN_ROWS} consented completions are needed. No model was trained."
        )
    if df["missed"].nunique() < 2:
        raise Refusal("The data has only one outcome (all missed or all done). No model was trained.")
    return df


def to_features(df):
    out = pd.DataFrame(index=df.index)
    out["early"] = (df["start_hour"] < 8).astype(float)
    out["start_hour"] = df["start_hour"].astype(float)
    out["duration_min"] = df["duration_min"].astype(float)
    out["weekday"] = df["weekday"].astype(float)
    out["priority_low"] = (df["priority"] == "low").astype(float)
    out["priority_medium"] = (df["priority"] == "medium").astype(float)
    return out[FEATURES].to_numpy(dtype=float)


def time_split(df):
    # Day strings are YYYY-MM-DD, so sorting them sorts by date.
    days = sorted(df["day"].unique())
    cut = int(len(days) * (1 - TEST_FRACTION))
    if cut < 1 or cut >= len(days):
        raise Refusal("Need data from at least two different days for a time-based split.")
    cutoff = days[cut]
    return df[df["day"] < cutoff], df[df["day"] >= cutoff], cutoff


def predict_manual(mean, scale, coef, intercept, X):
    # Same formula as shared/src/ml.js. Keep them in step.
    z = (X - mean) / scale
    logit = intercept + z @ coef
    return 1.0 / (1.0 + np.exp(-logit))


def calibration_slope(y, p):
    eps = 1e-6
    p = np.clip(p, eps, 1 - eps)
    logit = np.log(p / (1 - p)).reshape(-1, 1)
    # C this large is effectively unpenalized. Works across scikit-learn versions.
    m = LogisticRegression(C=1e12, max_iter=1000).fit(logit, y)
    return float(m.coef_[0][0]), float(m.intercept_[0])


def expected_calibration_error(y, p, bins=10):
    edges = np.linspace(0, 1, bins + 1)
    idx = np.clip(np.digitize(p, edges[1:-1]), 0, bins - 1)
    total = len(p)
    ece = 0.0
    for b in range(bins):
        mask = idx == b
        if mask.any():
            ece += mask.sum() / total * abs(p[mask].mean() - y[mask].mean())
    return float(ece)


def metrics(y, p):
    slope, intercept = calibration_slope(y, p)
    return {
        "auc": float(roc_auc_score(y, p)),
        "brier": float(brier_score_loss(y, p)),
        "calibrationSlope": slope,
        "calibrationIntercept": intercept,
        "expectedCalibrationError": expected_calibration_error(y, p),
        "holdoutRows": int(len(y)),
        "holdoutMissRate": float(np.mean(y)),
    }


def baselines(train, test, y_test):
    rate = float(train["missed"].mean())
    const = np.full(len(test), rate)
    per_priority = train.groupby("priority")["missed"].mean()
    p_priority = test["priority"].map(per_priority).fillna(rate).to_numpy(dtype=float)
    return {
        "constant": {"brier": float(brier_score_loss(y_test, const)), "auc": float(roc_auc_score(y_test, const))},
        "perPriority": {
            "brier": float(brier_score_loss(y_test, p_priority)),
            "auc": float(roc_auc_score(y_test, p_priority)),
        },
    }


def decide(m, base):
    reasons = []
    if m["holdoutRows"] < MIN_TEST_ROWS:
        reasons.append(f"holdout has fewer than {MIN_TEST_ROWS} rows")
    if m["brier"] >= min(base["constant"]["brier"], base["perPriority"]["brier"]):
        reasons.append("Brier score is not better than both baselines")
    if m["auc"] <= max(base["constant"]["auc"], base["perPriority"]["auc"]):
        reasons.append("AUC is not better than both baselines")
    lo, hi = CALIBRATION_RANGE
    if not lo <= m["calibrationSlope"] <= hi:
        reasons.append(f"calibration slope {m['calibrationSlope']:.2f} is outside {lo} to {hi}")
    return ("candidate" if not reasons else "rejected"), reasons


def fit(X, y):
    if np.bincount(y).min() < MIN_MINORITY_TRAIN:
        raise Refusal(f"Too few examples of one outcome in the training period (need {MIN_MINORITY_TRAIN}).")
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=7)
    grid = GridSearchCV(LogisticRegression(max_iter=1000), {"C": C_GRID}, scoring="neg_log_loss", cv=cv)
    grid.fit(X, y)
    return grid.best_estimator_, float(grid.best_params_["C"])


def parity_fixtures(mean, scale, coef, intercept, version):
    rng = np.random.default_rng(20260610)
    cases = []
    for _ in range(PARITY_CASES):
        start = int(rng.integers(300, 1380))
        duration = int(rng.integers(15, 181))
        end = (start + duration) % 1440
        priority = ["low", "medium", "high"][int(rng.integers(0, 3))]
        weekday = int(rng.integers(0, 7))
        d = end - start
        if d <= 0:
            d += 1440
        start_hour = start // 60
        features = {
            "early": 1 if start_hour < 8 else 0,
            "start_hour": start_hour,
            "duration_min": d,
            "weekday": weekday,
            "priority_low": 1 if priority == "low" else 0,
            "priority_medium": 1 if priority == "medium" else 0,
        }
        vector = np.array([[features[f] for f in FEATURES]], dtype=float)
        expected = float(predict_manual(mean, scale, coef, intercept, vector)[0])
        cases.append({
            "routine": {"startTime": f"{start // 60:02d}:{start % 60:02d}", "endTime": f"{end // 60:02d}:{end % 60:02d}", "priority": priority},
            "weekday": weekday,
            "features": features,
            "expected": expected,
        })
    return {"version": version, "cases": cases}


def run(args):
    df = load_rows(args.input)
    train, test, cutoff = time_split(df)
    if train["missed"].nunique() < 2 or test["missed"].nunique() < 2:
        raise Refusal("Both the training period and the test period need both outcomes.")

    X_tr, y_tr = to_features(train), train["missed"].to_numpy(dtype=int)
    X_te, y_te = to_features(test), test["missed"].to_numpy(dtype=int)
    mean = X_tr.mean(axis=0)
    scale = X_tr.std(axis=0)
    scale = np.where(scale == 0, 1.0, scale)

    model, chosen_c = fit((X_tr - mean) / scale, y_tr)
    coef = model.coef_[0].astype(float)
    intercept = float(model.intercept_[0])

    p_te = predict_manual(mean, scale, coef, intercept, X_te)
    m = metrics(y_te, p_te)
    base = baselines(train, test, y_te)
    status, reasons = decide(m, base)

    now = datetime.now(timezone.utc)
    prefix = "synthetic-" if args.synthetic else ""
    version = f"{prefix}v{now.strftime('%Y%m%d-%H%M%S')}"
    if args.synthetic:
        status = "synthetic"
        reasons = ["synthetic data: for testing the pipeline only"] + reasons

    artifact = {
        "version": version,
        "createdAt": now.isoformat(),
        "status": status,
        "consentVersion": CONSENT_VERSION,
        "features": FEATURES,
        "mean": mean.tolist(),
        "scale": scale.tolist(),
        "coefficients": coef.tolist(),
        "intercept": intercept,
        "chosenC": chosen_c,
        "metrics": {**m, "baselines": base},
        "trainingWindow": {
            "start": str(train["day"].min()),
            "cutoff": cutoff,
            "end": str(test["day"].max()),
            "trainRows": int(len(train)),
            "testRows": int(len(test)),
        },
        "rows": int(len(df)),
        "decision": {"status": status, "reasons": reasons},
    }

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    body = json.dumps(artifact, indent=2).encode("utf-8")
    (out / f"{version}.json").write_bytes(body)
    (out / f"{version}.sha256").write_text(hashlib.sha256(body).hexdigest() + "\n", encoding="utf-8")
    (out / "parity-fixtures.json").write_text(
        json.dumps(parity_fixtures(mean, scale, coef, intercept, version), indent=2), encoding="utf-8"
    )

    print(f"Version {version}: {status}")
    print(f"  AUC {m['auc']:.3f} (baselines {base['constant']['auc']:.3f}, {base['perPriority']['auc']:.3f})")
    print(f"  Brier {m['brier']:.4f} (baselines {base['constant']['brier']:.4f}, {base['perPriority']['brier']:.4f})")
    print(f"  Calibration slope {m['calibrationSlope']:.2f}, holdout rows {m['holdoutRows']}")
    for r in reasons:
        print(f"  - {r}")
    return status


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out", default="ml/artifacts")
    parser.add_argument("--synthetic", action="store_true", help="mark the artifact as synthetic (never activated)")
    args = parser.parse_args()
    try:
        run(args)
    except Refusal as err:
        print(f"Not trained: {err}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()

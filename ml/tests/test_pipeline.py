import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

ML_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ML_DIR))

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import train_pipeline as tp  # noqa: E402
from make_synthetic import generate  # noqa: E402


class PipelineRefusals(unittest.TestCase):
    def write(self, df):
        f = tempfile.NamedTemporaryFile(suffix=".csv", delete=False)
        df.to_csv(f.name, index=False)
        return f.name

    def test_refuses_fewer_than_200_rows(self):
        df = generate(users=2, days=5)
        with self.assertRaises(tp.Refusal) as ctx:
            tp.load_rows(self.write(df))
        self.assertIn("consented completions are needed", str(ctx.exception))

    def test_refuses_a_single_outcome(self):
        df = generate(users=30, days=10)
        df["missed"] = 0
        with self.assertRaises(tp.Refusal):
            tp.load_rows(self.write(df))

    def test_refuses_a_missing_column(self):
        df = generate(users=30, days=10).drop(columns=["weekday"])
        with self.assertRaises(tp.Refusal) as ctx:
            tp.load_rows(self.write(df))
        self.assertIn("weekday", str(ctx.exception))


class TimeSplit(unittest.TestCase):
    def test_test_period_is_strictly_later_than_training(self):
        df = generate(users=40, days=40)
        train, test, cutoff = tp.time_split(df)
        self.assertTrue((train["day"] < cutoff).all())
        self.assertTrue((test["day"] >= cutoff).all())
        self.assertEqual(len(train) + len(test), len(df))


class Decision(unittest.TestCase):
    def test_rejects_a_model_that_does_not_beat_the_baselines(self):
        m = {"holdoutRows": 100, "brier": 0.25, "auc": 0.5, "calibrationSlope": 1.0}
        base = {"constant": {"brier": 0.2, "auc": 0.5}, "perPriority": {"brier": 0.2, "auc": 0.5}}
        status, reasons = tp.decide(m, base)
        self.assertEqual(status, "rejected")
        self.assertTrue(any("Brier" in r for r in reasons))

    def test_rejects_bad_calibration_even_when_ranking_is_good(self):
        m = {"holdoutRows": 100, "brier": 0.05, "auc": 0.9, "calibrationSlope": 1.5}
        base = {"constant": {"brier": 0.2, "auc": 0.5}, "perPriority": {"brier": 0.2, "auc": 0.5}}
        status, reasons = tp.decide(m, base)
        self.assertEqual(status, "rejected")
        self.assertTrue(any("calibration" in r for r in reasons))

    def test_accepts_when_everything_passes(self):
        m = {"holdoutRows": 100, "brier": 0.05, "auc": 0.9, "calibrationSlope": 1.0}
        base = {"constant": {"brier": 0.2, "auc": 0.5}, "perPriority": {"brier": 0.15, "auc": 0.6}}
        self.assertEqual(tp.decide(m, base)[0], "candidate")


class EndToEnd(unittest.TestCase):
    def test_writes_artifact_sidecar_and_fixtures(self):
        df = generate(users=60, days=60)
        with tempfile.TemporaryDirectory() as out:
            path = os.path.join(out, "in.csv")
            df.to_csv(path, index=False)

            class Args:
                input = path
                synthetic = True

            args = Args()
            args.out = out
            status = tp.run(args)
            self.assertEqual(status, "synthetic")

            artifacts = [p for p in Path(out).glob("synthetic-v*.json")]
            self.assertEqual(len(artifacts), 1)
            artifact = json.loads(artifacts[0].read_text())
            self.assertEqual(artifact["features"], tp.FEATURES)
            self.assertEqual(len(artifact["coefficients"]), len(tp.FEATURES))
            self.assertIn("baselines", artifact["metrics"])
            self.assertTrue(artifact["metrics"]["holdoutRows"] >= 50)

            import hashlib
            sidecar = artifacts[0].with_suffix(".sha256").read_text().strip()
            self.assertEqual(sidecar, hashlib.sha256(artifacts[0].read_bytes()).hexdigest())

            fixtures = json.loads((Path(out) / "parity-fixtures.json").read_text())
            self.assertEqual(len(fixtures["cases"]), tp.PARITY_CASES)


if __name__ == "__main__":
    unittest.main()

# G. ML Lifecycle Plan (Phase 6): Training Your Own Model

## 1. Current state (from the uploaded code)
- The active model is a logistic regression trained on 2,500 synthetic rows (ml/train_pipeline.py).
- The weights are written straight into client/src/data/missed_model.json. There is no version, no metrics, and no holdout.
- The real-data path (ml/train_real.py) runs only when at least 200 real rows exist. It has no train and test split and no evaluation.
- The export (server/scripts/export-training.js) has no consent filter and falls back to a public default salt.
- The browser and Python must compute the same features. This is not tested yet.

Honest point: the synthetic labels encode the rules that were written into the generator. A model trained on them mostly learns those rules. Real data is the only way the model can learn real behaviour.

## 2. Why a logistic model first
- Few features, a binary outcome, and modest data: logistic regression is stable and easy to explain to users.
- Coefficients export to plain JavaScript with no runtime library, so the core app works offline.
- Calibration is usually good enough that the output can be shown as a rough percentage.
Move to gradient boosting only if it beats logistic regression on a time-based holdout by a clear margin, and only after the export and parity test exist for it.

## 3. Data requirements
- Consent: only users with an active model-training consent in the consents collection are exported. Withdrawal removes their rows from the next export.
- Minimum: 200 rows and both outcomes present (the existing check). Recommended before trusting results: at least 1,000 completions and at least 150 missed examples.
- Pseudonymization: user_hash = HMAC-SHA256(TRAINING_SECRET, userId), truncated. TRAINING_SECRET has no default value and is never committed. Rotating it breaks linkage on purpose.
- Fields kept: start hour, duration, weekday, priority, outcome. No titles, notes, dates, or ids.
- Retention: exports are deleted after the model is trained and recorded. The model file has no personal data.

## 4. Features (fixed contract shared with JavaScript)
early (start before 08:00), start_hour, duration_min, weekday (in user's timezone), priority_low, priority_medium.
Changing any feature means a new model version and a new parity fixture.

## 5. Training method
1. Export with the consent filter and pseudonymization.
2. Time-based split: train on the earlier 80 percent of days, test on the latest 20 percent. Random splits overstate accuracy for habit data.
3. Standardize numeric features using training data only. Save the means and scales in the model file.
4. Fit with L2 regularization. Choose the strength with cross-validation inside the training window.
5. Compare against two baselines: the overall miss rate, and the miss rate per priority. A model that does not beat them is not released.
6. Record every run in mlModels with the metrics below, the training window, the row count, and the file hash.

## 6. Metrics (stored with each version)
- AUC on the holdout: ranking quality. Target: at least 0.70 and above both baselines.
- Brier score: overall accuracy of probabilities. Lower is better. Report it next to the baseline Brier score.
- Calibration: split predictions into 10 bins and compare predicted and observed miss rates. Report the calibration slope (target near 1.0) and expected calibration error.
- Holdout size and miss rate, so a weak result cannot hide behind a small sample.
- Per-group check: metrics for each priority level, so the model does not fail quietly for one group.

Release rule: publish a candidate only when it beats both baselines on Brier score and AUC, and its calibration slope is between 0.8 and 1.2.

## 7. Parity test (Python and JavaScript)
- The Python script writes a fixture file: 50 sample routines with expected probabilities from Python.
- A JavaScript test loads the same model file and asserts that each probability matches within 0.000001.
- The test runs in CI. A failing parity test blocks the release.

## 8. Versioning and rollback
- The model file is named with its version and stored with its sha256 in mlModels.
- The API serves the active version from GET /api/model/current with CDN caching. The client checks the hash before using a new file.
- Rollback: set the previous version to active in mlModels, and the next client load uses it. Keep the last three versions.
- If the client cannot load a model, the app shows routines without a risk badge. The core app keeps working.

## 9. Monitoring and drift
- Monthly: compare feature distributions (population stability index) and the observed miss rate with the training window.
- Alert when PSI exceeds 0.2 on any feature or the observed miss rate moves by more than 5 points.
- Retrain on a schedule only after a drift alert or after 3 months of new consented data, whichever comes first.

## 10. Honest limits
- The model predicts a routine being missed. It cannot prove cause. Show it as "a pattern in your history", never as a judgement about the user.
- Users must be told that the estimate comes from a simple model and can be wrong.
- Bangladesh-specific patterns (Ramadan schedules, power cuts, exam periods) are not in the features. Add them only after the data shows they matter.

## 11. Acceptance tests (Phase 6)
- Export excludes users without consent. A test seeds one consenting and one non-consenting user and checks the output.
- Export output contains no raw ids, titles, or notes. A test scans for them.
- Training fails cleanly below 200 rows or with one outcome.
- Metrics are written to mlModels for every run, including failed releases.
- Parity test passes in CI.
- Rollback to the previous version works on a staging database.

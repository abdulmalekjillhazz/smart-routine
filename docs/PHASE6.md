# Phase 6: ML lifecycle

## Built
- Consent: only users who granted model-training consent for the current version (model-training-v1), and who have not deleted their account, are exported.
- Pseudonyms: a keyed HMAC (TRAINING_SECRET, at least 32 characters, no default) of the user id. Without the secret, a hash cannot be matched to a user.
- Export: rows contain only hash, calendar day, start hour, duration, weekday, priority, and outcome. No titles, notes, or ids. A test scans the output for them.
- Trainer (ml/train_pipeline.py): time-based split (earliest 80 percent of days for training, latest 20 percent for holdout), feature standardization from training data only, logistic regression with C chosen by cross-validation.
- Refusals: fewer than 200 rows, one outcome only, missing columns, or too few examples in the training period. The message says why, and no model is written.
- Metrics stored per version: AUC, Brier score, calibration slope and intercept, expected calibration error (10 bins), holdout size and miss rate, and the scores of both baselines (constant rate, and rate per priority).
- Release rule: candidate only if it beats both baselines on Brier score and AUC, and its calibration slope is between 0.8 and 1.2. Otherwise rejected, with reasons written.
- Artifact: versioned JSON file, with a SHA-256 sidecar. Import refuses a file that does not match its sidecar.
- Registry: import, activate, rollback, list. At most one active model (enforced by a unique index). Synthetic models can never be activated. Every import, activation, and rollback writes an audit row.
- Serving: GET /api/model/current (public, no personal data). Sends an ETag and answers 304 when the browser already has the model. Cached for an hour.
- Parity: shared/src/ml.js and ml/train_pipeline.py use the same feature rules and the same formula. A JavaScript test checks 50 Python-generated cases to within 1e-6.

## Decisions and trade-offs
1. The export includes the calendar day. A time-based split needs dates. The day is the only time field, and it is a calendar date without a time of day.
2. Skipped completions are left out of training. A skip does not say whether the routine was missed.
3. Logistic regression is kept on purpose. It is stable on small data, its weights are easy to ship to a browser, and its output can be checked for calibration. A more complex model only earns a place if it clearly beats this one on the same holdout, and only after its export and parity test exist.
4. Changing TRAINING_SECRET makes new pseudonyms that cannot be linked to old ones. Treat it as permanent once training starts.
5. Withdrawing consent removes a user from the next export. Rows already in an old training file are not deleted from that file. Old artifacts contain only weights and numbers, not rows.
6. The browser is not yet using the model. The web app will fetch /api/model/current and use predictMissProbability. The old client/src/data/missed_model.json from the prototype is not carried over.
7. Activation and rollback are commands on your machine (scripts/ml.js). Admin screens for them can come later with the web app.

## Demo data in this repository (not real)
- ml/data/ is ignored by Git. The synthetic dataset was made by make_synthetic.py and deleted before packaging.
- ml/artifacts contains one SYNTHETIC model (status "synthetic") and parity-fixtures.json. They exist only so the parity test has something to check. Synthetic models cannot be activated.

## Manual checks (Git Bash)
1. Make sure at least 200 real users have granted consent and completed routines.
2. Set TRAINING_SECRET in server/.env (at least 32 characters). Keep a backup of it.
3. npm run export-training -w server
4. python ml/train_pipeline.py --input ml/data/completions.csv --out ml/artifacts
5. npm run ml -w server -- import ml/artifacts/<version>.json
6. npm run ml -w server -- activate <version>
7. curl -s http://localhost:5000/api/model/current
8. If something goes wrong: npm run ml -w server -- rollback

## Acceptance tests
- Python (8 tests, run here, pass): refusals for too few rows, one outcome, missing columns; time split is strictly ordered; decision rules; a full run writes the artifact, sidecar, and fixtures.
- JavaScript parity (3 tests, run here, pass): feature list matches, routine features match Python, predictions match within 1e-6.
- API unit (run here, pass): pseudonyms, secret length check, weekday calculation, CSV columns, artifact hash check.
- API integration (tests/integration/ml.test.js, 6 tests): consent filter (consenting only, withdrawn and deleted excluded, no titles or ids), synthetic refused, tampered file refused, activation and rollback, ETag and 304, single active model. NOT run here (no MongoDB).

## Unverified in this sandbox
- The database export and registry integration tests were not run.
- No real data was used. The model is not ready for real users until 200 or more consented completions exist and a real candidate passes the release rule.
- The Node export script was not run against a real database.
- Calibration and baselines on real behaviour are unknown until real data exists.

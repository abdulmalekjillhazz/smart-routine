# ML: missed-routine model

## What it does
Estimates the chance that a routine will be missed, from its start time, length, weekday, and priority. It is a logistic regression. Its weights are shipped to the app as a versioned file, and the same formula runs in JavaScript.

## Rules
- Only users who gave model-training consent (version model-training-v1) and have not deleted their account are used.
- Users are identified only by a keyed hash (TRAINING_SECRET). Rows contain no titles, notes, or raw ids.
- The trainer refuses to run with fewer than 200 rows, or with only one outcome. Real training needs real consented data.
- A model is a candidate only if it beats both baselines on Brier score and AUC, and its calibration slope is between 0.8 and 1.2.
- Synthetic models (made from make_synthetic.py) are labelled "synthetic" and can never be activated.

## Steps
1. Export consented data (on your machine, with MONGODB_URI and TRAINING_SECRET set):
   npm run export-training -w server
2. Train:
   python ml/train_pipeline.py --input ml/data/completions.csv --out ml/artifacts
3. Check the parity test (JavaScript must match Python):
   npm test -w shared
4. Import and activate with the registry CLI:
   npm run ml -w server -- import ml/artifacts/<version>.json
   npm run ml -w server -- activate <version>
5. Roll back if needed: npm run ml -w server -- rollback

## Demo files in this repo
ml/artifacts contains a SYNTHETIC demo model and its parity fixtures. They exist only so the parity test has something to check. They are not a real model.

## Tests
- Python: python -m unittest discover -s ml/tests
- JavaScript parity: npm test -w shared

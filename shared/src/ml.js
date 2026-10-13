// The model's feature contract. The Python trainer and this file must agree exactly.
// If a feature changes, make a new model version and regenerate the parity fixtures.
export const TRAINING_CONSENT_VERSION = 'model-training-v1';
export const MODEL_FEATURES = ['early', 'start_hour', 'duration_min', 'weekday', 'priority_low', 'priority_medium'];

const toMinutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

// weekday: 0 = Sunday ... 6 = Saturday, in the user's own calendar.
export function routineFeatures({ startTime, endTime, priority }, weekday) {
  const start = toMinutes(startTime);
  let duration = toMinutes(endTime) - start;
  if (duration <= 0) duration += 1440; // crosses midnight
  const startHour = Math.floor(start / 60);
  return {
    early: startHour < 8 ? 1 : 0,
    start_hour: startHour,
    duration_min: duration,
    weekday,
    priority_low: priority === 'low' ? 1 : 0,
    priority_medium: priority === 'medium' ? 1 : 0,
  };
}

// model: { features, mean, scale, coefficients, intercept } from a versioned artifact.
// Standardize each feature with the training mean and scale, then apply the logistic function.
export function predictMissProbability(model, features) {
  let logit = model.intercept;
  model.features.forEach((name, i) => {
    const z = (features[name] - model.mean[i]) / model.scale[i];
    logit += model.coefficients[i] * z;
  });
  return 1 / (1 + Math.exp(-logit));
}

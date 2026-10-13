// Feature flags: which features are on, and for what share of users.
// Defaults keep every feature on, so an empty database changes nothing.
export const FLAG_DEFAULTS = Object.freeze({
  'lessons.quiz': { enabled: true, rolloutPercent: 100, description: 'Quiz attempts on lessons' },
  'push.reminders': { enabled: true, rolloutPercent: 100, description: 'Scheduled push reminders' },
  'ml.predictions': { enabled: true, rolloutPercent: 100, description: 'Miss-risk model served to browsers' },
});

// FNV-1a 32-bit hash. Same answer on every server and in the browser, so a user's bucket never changes.
export function bucketOf(key, subject) {
  let h = 0x811c9dc5;
  const text = `${key}:${subject}`;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % 100;
}

// True when this subject falls inside the rollout. 0 means nobody, 100 means everybody.
export function inRollout(key, subject, rolloutPercent) {
  if (rolloutPercent >= 100) return true;
  if (rolloutPercent <= 0) return false;
  return bucketOf(key, subject) < rolloutPercent;
}

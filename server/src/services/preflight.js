// Checks a configuration before it goes live. Pure function, so it is unit tested.
// "error" blocks launch. "warn" should be fixed, but does not block.
export function preflightIssues(config) {
  const issues = [];
  const add = (level, message) => issues.push({ level, message });
  const production = config.NODE_ENV === 'production';

  if (production && !config.CLIENT_ORIGIN.startsWith('https://')) {
    add('error', 'CLIENT_ORIGIN must be an https address in production (cookies are Secure there).');
  }
  if (production && /localhost|127\.0\.0\.1/.test(config.MONGODB_URI)) {
    add('error', 'MONGODB_URI points at localhost in production.');
  }
  if (!config.ADMIN_ENC_KEY) {
    add(production ? 'error' : 'warn', 'ADMIN_ENC_KEY is not set: staff cannot turn on two-factor sign-in.');
  }
  if (production && !config.READY_TOKEN) {
    add('warn', 'READY_TOKEN is not set: readiness details are hidden. Set it so your monitor can see the checks.');
  }
  if (production && !config.SENTRY_DSN) {
    add('warn', 'SENTRY_DSN is not set: errors are logged but not tracked.');
  }
  if (production && !config.TRAINING_SECRET) {
    add('warn', 'TRAINING_SECRET is not set: the training export cannot run.');
  }
  const pushParts = [config.VAPID_PUBLIC_KEY, config.VAPID_PRIVATE_KEY, config.VAPID_SUBJECT].filter(Boolean).length;
  if (production && pushParts === 0) {
    add('warn', 'Web Push is off: reminders work only while the app is open.');
  }
  if (production && !config.CLOUDINARY_CLOUD_NAME) {
    add('warn', 'Cloudinary is not set: lesson images and video cannot be uploaded.');
  }
  return issues;
}

# A secret may have leaked

Secrets: MONGODB_URI, SESSION-related keys, ADMIN_ENC_KEY, CLOUDINARY_API_SECRET, VAPID_PRIVATE_KEY, TRAINING_SECRET, GEMINI key, READY_TOKEN.

## Do this within the hour
1. Rotate the secret at its source (MongoDB user password, Cloudinary API secret, Google key, and so on).
2. Update the host's secret store and restart the API.
3. Check the Git history with: git log -p | grep -iE "secret|password|token|key" and remove anything found. Then rotate it anyway, because history is already public if the repo was public.

## Special cases
- ADMIN_ENC_KEY: rotating it makes all staff two-factor secrets unreadable. Plan a reset of two-factor for all staff (reset-mfa for each) and tell them first.
- TRAINING_SECRET: rotating it breaks the link to earlier pseudonyms. This is acceptable only after a decision, and the change is recorded in the model notes.
- VAPID_PRIVATE_KEY: rotating it makes every push subscription invalid. Users must subscribe again.

## Afterwards
- Write an incident (incident-template.md).
- Check audit logs for unusual admin actions in the period.

# Environments

| | Local (developer) | Staging | Production |
|---|---|---|---|
| Database | Local MongoDB | Separate Atlas cluster | Production Atlas cluster |
| Cloudinary | Test folder | Staging cloud | Production cloud |
| Sentry | Off | Staging project | Production project |
| Push keys | Off | Staging keys | Production keys |
| Real users | None | Testers only | Public |
| Load tests | Never | Yes | Never (except a planned, announced test) |

Rules
- Staging never uses production secrets. Production never uses staging secrets.
- Every environment has its own TRAINING_SECRET, ADMIN_ENC_KEY, and READY_TOKEN.
- Run npm run preflight -w server before each deployment to production.
- Keep a list of who holds each secret, and rotate after anyone leaves.

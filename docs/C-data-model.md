# C. Data Model

Rule: a user reads and writes only documents where userId equals the session user. Admin access is by role. "Server only" means no browser access.

| Collection | Key fields | Indexes | Retention | Access |
|---|---|---|---|---|
| users | email (lowercased), passwordHash (argon2id), displayName, locale (bn or en), timezone (IANA, default Asia/Dhaka), role (user, editor, viewer, owner), deletedAt | unique email | Until deletion; purge 30 days after deletedAt | Self; admins see limited view; hash never returned |
| consents | userId, type, version, grantedAt, withdrawnAt | {userId, type} | 5 years | Self; server writes |
| sessions | userId, tokenHash (SHA-256), familyId, expiresAt, revokedAt, userAgent (truncated) | unique tokenHash; userId; TTL on expiresAt | 30 days | Server only |
| routines | userId, clientId (UUID), title (1 to 120), startTime, endTime (HH:mm), crossesMidnight, category, priority, note (max 300), isFrog, sortOrder, archivedAt, version | {userId, archivedAt}; unique {userId, clientId} | Until deletion | Owner only |
| completions | userId, routineId, date (logical day in user timezone), status (done, missed, skipped), clientUpdatedAt, serverUpdatedAt | unique {userId, routineId, date} | 2 years | Owner only |
| lessons | slug (unique), status (draft, review, published, archived), titleBn, titleEn, bodyBn, bodyEn, media (publicId, resourceType), vocabulary[], quiz[] (answerIndex server-only), aiDrafted, createdBy, reviewedBy, publishedAt, version | unique slug; {status, publishedAt} | Archived kept 1 year | Public reads published only (answers hidden); editors and owners write |
| lessonScores | userId, lessonId, score, total, answers, attemptedAt | {userId, lessonId, attemptedAt} | 1 year | Owner reads; server writes |
| pushSubscriptions | userId, endpoint (unique), p256dh, auth, userAgent, failureCount, lastSuccessAt, expiresAt | unique endpoint; userId | Removed on 410 or 90 days idle | Owner creates or deletes; server sends |
| reminderLog | userId, routineId, date, kind, sentAt, leaseUntil | unique {userId, routineId, date, kind}; TTL 7 days | 7 days | Server only |
| assistantUsage | userId, day (user timezone), count | unique {userId, day}; TTL 2 days | 2 days | Server only |
| notifications | titleBn, titleEn, body, audience, status (draft, approved, sent, cancelled), createdBy, approvedBy, sentAt, stats | {status, sentAt} | 1 year | Admins; owner approves before send |
| uploads | publicId (unique), resourceType, bytes, mime, uploadedBy, status (pending, attached, orphaned, deleted), attachedTo | unique publicId; {status, createdAt} | Deleted rows kept 90 days | Admins read; cleanup job writes |
| auditLogs | actorId, actorRole, action, targetType, targetId, summary (no personal text), ipHash, requestId, createdAt | {actorId, createdAt}; {targetType, targetId} | 2 years; append only | Owner reads; server appends |
| mlModels | version, createdAt, trainedRows, trainingWindow, metrics (AUC, Brier, calibration slope, holdout size), features[], coefficients, sha256, status (candidate, active, retired) | unique version; {status} | Keep all | Public reads active; pipeline writes |

Privacy note: routines and completions are personal data. The ML export uses a keyed HMAC of userId and only for users with active training consent.

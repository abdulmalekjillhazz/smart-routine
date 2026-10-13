#!/usr/bin/env bash
# Restore test: dump production (read-only user), restore into a SCRATCH database, verify, report.
# Needs MongoDB Database Tools (mongodump, mongorestore) on PATH. Run in Git Bash.
#
#   export BACKUP_URI="mongodb+srv://readonly-user:...@cluster/smart-routine"
#   export SCRATCH_URI="mongodb+srv://...@cluster/smart-routine-restore-test"
#   bash scripts/backup/restore-test.sh
set -euo pipefail

: "${BACKUP_URI:?Set BACKUP_URI to a read-only connection string for the source.}"
: "${SCRATCH_URI:?Set SCRATCH_URI to a SCRATCH database (name contains restore-test).}"

case "$SCRATCH_URI" in
  *restore*|*scratch*) ;;
  *) echo "Refusing: SCRATCH_URI must point to a database whose name contains 'restore' or 'scratch'." >&2; exit 1 ;;
esac

DUMP_DIR="$(mktemp -d)"
trap 'rm -rf "$DUMP_DIR"' EXIT

echo "1/3 Dumping source..."
mongodump --uri="$BACKUP_URI" --out="$DUMP_DIR" --quiet

echo "2/3 Restoring into scratch database (drops existing data there)..."
mongorestore --uri="$SCRATCH_URI" --drop --dir="$DUMP_DIR" --quiet

echo "3/3 Verifying..."
(cd server && SCRATCH_URI="$SCRATCH_URI" node scripts/verify-restore.js)

echo "Done. Record the date and the counts in the restore log, then delete the scratch database."

# Backups and restore test

## Backups
- MongoDB Atlas: enable continuous cloud backup (point-in-time) on the production cluster. Check it monthly in the Atlas console.
- Keep a read-only user for backups. It cannot write or delete.

## Restore test (monthly, and before every launch)
1. Install MongoDB Database Tools (mongodump, mongorestore) and put them on PATH.
2. Create a scratch database in Atlas whose name contains "restore-test". Never reuse production.
3. In Git Bash, from the project root:
   export BACKUP_URI="mongodb+srv://readonly-user:...@cluster/smart-routine"
   export SCRATCH_URI="mongodb+srv://...@cluster/smart-routine-restore-test"
   bash scripts/backup/restore-test.sh
4. Check the printed counts look reasonable compared with production (users, routines, lessons).
5. Record the date, counts, and result in the restore log. Delete the scratch database.

## Recovery from data loss
1. Stop writes if the loss is ongoing (take the API into maintenance).
2. Restore the chosen point in time into a new cluster or database, not over production.
3. Run verify-restore against the restored copy. Check counts and the unique email index.
4. Only then switch production to the restored data, and record the decision in the incident log.

## Targets
- Recovery point: up to a few minutes (continuous backup).
- Recovery time: target under 4 hours. Measure it during the monthly test and write the number down.

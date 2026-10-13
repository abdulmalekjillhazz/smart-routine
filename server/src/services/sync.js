import { Routine } from '../models/Routine.js';
import { Completion } from '../models/Completion.js';
import { IdempotencyRecord } from '../models/IdempotencyRecord.js';
import { AppError, MSG } from '../lib/AppError.js';
import { todayInZone, crossesMidnight } from '@smart-routine/shared';
import { toRoutineDto } from './dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Runs operations one by one, in the order received. Returns one result per operation.
// Conflict rule: last write wins per routine, by server arrival order (not by device clock).
export async function applySyncOps(user, ops) {
  const results = [];
  for (const op of ops) {
    results.push(await applyOne(user, op));
  }
  return results;
}

async function claimOp(userId, opId) {
  try {
    await IdempotencyRecord.create({
      userId,
      opId,
      status: 'pending',
      expiresAt: new Date(Date.now() + DAY_MS),
    });
    return { claimed: true };
  } catch (err) {
    if (err.code !== 11000) throw err;
    const record = await IdempotencyRecord.findOne({ userId, opId }).lean();
    return { claimed: false, record };
  }
}

async function applyOne(user, op) {
  const claim = await claimOp(user._id, op.opId);

  if (!claim.claimed) {
    // Seen before: return the stored result. Never run the operation again.
    if (claim.record?.status === 'done') return { ...claim.record.result, status: 'replayed' };
    return { opId: op.opId, status: 'in_progress' };
  }

  try {
    const result = await execute(user, op);
    await IdempotencyRecord.updateOne({ userId: user._id, opId: op.opId }, { $set: { status: 'done', result } });
    return result;
  } catch (err) {
    if (err instanceof AppError) {
      // A business rule refused it. That result is final, so store it.
      const result = { opId: op.opId, status: 'rejected', code: err.code, message: err.i18n };
      await IdempotencyRecord.updateOne({ userId: user._id, opId: op.opId }, { $set: { status: 'done', result } });
      return result;
    }
    // Unexpected failure: release the claim so a later retry can run the operation.
    await IdempotencyRecord.deleteOne({ userId: user._id, opId: op.opId });
    throw err;
  }
}

async function execute(user, op) {
  switch (op.type) {
    case 'routine.create':
      return createRoutine(user, op);
    case 'routine.update':
      return updateRoutine(user, op);
    case 'routine.delete':
      return deleteRoutine(user, op);
    case 'completion.set':
      return setCompletion(user, op);
    default:
      throw new AppError(400, 'VALIDATION_FAILED', MSG.invalid);
  }
}

async function createRoutine(user, op) {
  const d = op.data;
  if (d.clientId) {
    const existing = await Routine.findOne({ userId: user._id, clientId: d.clientId }).lean();
    if (existing) {
      return { opId: op.opId, status: 'applied', clientId: d.clientId, routine: toRoutineDto(existing) };
    }
  }
  try {
    const routine = await Routine.create({
      ...d,
      userId: user._id,
      crossesMidnight: crossesMidnight(d.startTime, d.endTime),
    });
    return { opId: op.opId, status: 'applied', clientId: d.clientId ?? null, routine: toRoutineDto(routine) };
  } catch (err) {
    // Two requests with the same clientId raced. The unique index kept one. Return that one.
    if (err.code === 11000 && d.clientId) {
      const existing = await Routine.findOne({ userId: user._id, clientId: d.clientId }).lean();
      return { opId: op.opId, status: 'applied', clientId: d.clientId, routine: toRoutineDto(existing) };
    }
    throw err;
  }
}

async function updateRoutine(user, op) {
  const current = await Routine.findOne({ _id: op.routineId, userId: user._id }).lean();
  if (!current) return { opId: op.opId, status: 'not_found' };

  const start = op.data.startTime ?? current.startTime;
  const end = op.data.endTime ?? current.endTime;
  if (start === end) throw new AppError(400, 'VALIDATION_FAILED', MSG.sameTime);

  const updated = await Routine.findOneAndUpdate(
    { _id: op.routineId, userId: user._id },
    { $set: { ...op.data, crossesMidnight: crossesMidnight(start, end) }, $inc: { version: 1 } },
    { new: true }
  ).lean();
  if (!updated) return { opId: op.opId, status: 'not_found' };
  return { opId: op.opId, status: 'applied', routine: toRoutineDto(updated) };
}

async function deleteRoutine(user, op) {
  // Deleting something already gone counts as success. The end state is the same.
  const removed = await Routine.findOneAndDelete({ _id: op.routineId, userId: user._id }).lean();
  if (removed) await Completion.deleteMany({ userId: user._id, routineId: removed._id });
  return { opId: op.opId, status: 'applied', routineId: op.routineId };
}

async function setCompletion(user, op) {
  const { routineId, date, status } = op.data;
  if (date > todayInZone(user.timezone)) {
    throw new AppError(400, 'VALIDATION_FAILED', MSG.futureDate, [{ path: 'date', message: 'future date' }]);
  }
  const owned = await Routine.exists({ _id: routineId, userId: user._id });
  if (!owned) return { opId: op.opId, status: 'not_found' };

  // Deterministic conflict rule: "done" always wins over "missed"/"skipped"
  // for the same calendar date (offline vs another device race).
  const existing = await Completion.findOne({ userId: user._id, routineId, date }).lean();
  let finalStatus = status;
  if (existing && existing.status === 'done' && status !== 'done') {
    finalStatus = 'done';
  }
  await Completion.findOneAndUpdate(
    { userId: user._id, routineId, date },
    { $set: { status: finalStatus } },
    { upsert: true, setDefaultsOnInsert: true }
  );
  return { opId: op.opId, status: 'applied', completion: { routineId, date, status: finalStatus } };
}

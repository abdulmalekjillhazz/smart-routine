import { Router } from 'express';
import mongoose from 'mongoose';
import { routineCreateSchema, routineUpdateSchema, routineListQuerySchema, todayInZone, crossesMidnight } from '@smart-routine/shared';
import { requireAuth } from '../middleware/requireAuth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { AppError, MSG } from '../lib/AppError.js';
import { Routine } from '../models/Routine.js';
import { Completion } from '../models/Completion.js';
import { toRoutineDto } from '../services/dto.js';

const MINUTE = 60 * 1000;

const isId = (value) => mongoose.isValidObjectId(value);
const notFound = () => new AppError(404, 'NOT_FOUND', MSG.notFound);
const conflict = () => new AppError(409, 'CONFLICT', MSG.conflict);

export function routinesRouter() {
  const r = Router();
  r.use(requireAuth);
  r.use(rateLimit({ name: 'routines', limit: 120, windowMs: MINUTE, by: 'user' }));

  // Every query includes userId. A routine id that belongs to someone else returns 404, not 403.
  r.get('/', validate({ query: routineListQuerySchema }), async (req, res, next) => {
    try {
      const date = req.query.date ?? todayInZone(req.user.timezone);
      const [routines, completions] = await Promise.all([
        Routine.find({ userId: req.userId }).sort({ startTime: 1 }).lean(),
        Completion.find({ userId: req.userId, date }).lean(),
      ]);
      const statusByRoutine = new Map(completions.map((c) => [String(c.routineId), c.status]));
      res.json({
        date,
        routines: routines.map((x) => ({
          ...toRoutineDto(x),
          completionStatus: statusByRoutine.get(String(x._id)) ?? null,
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  r.post('/', validate({ body: routineCreateSchema }), async (req, res, next) => {
    try {
      const routine = await Routine.create({
        ...req.body,
        userId: req.userId,
        crossesMidnight: crossesMidnight(req.body.startTime, req.body.endTime),
      });
      res.status(201).json({ routine: toRoutineDto(routine) });
    } catch (err) {
      next(err);
    }
  });

  r.patch('/:id', validate({ body: routineUpdateSchema }), async (req, res, next) => {
    try {
      if (!isId(req.params.id)) throw notFound();
      const current = await Routine.findOne({ _id: req.params.id, userId: req.userId }).lean();
      if (!current) throw notFound();

      const { expectedVersion, ...changes } = req.body;
      if (expectedVersion !== undefined && expectedVersion !== current.version) throw conflict();

      const start = changes.startTime ?? current.startTime;
      const end = changes.endTime ?? current.endTime;
      if (start === end) {
        throw new AppError(400, 'VALIDATION_FAILED', MSG.sameTime, [{ path: 'endTime', message: 'start and end must differ' }]);
      }

      // The version condition in the filter stops two edits from overwriting each other.
      const updated = await Routine.findOneAndUpdate(
        { _id: req.params.id, userId: req.userId, version: current.version },
        { $set: { ...changes, crossesMidnight: crossesMidnight(start, end) }, $inc: { version: 1 } },
        { new: true }
      ).lean();
      if (!updated) throw conflict();
      res.json({ routine: toRoutineDto(updated) });
    } catch (err) {
      next(err);
    }
  });

  r.delete('/:id', async (req, res, next) => {
    try {
      if (!isId(req.params.id)) throw notFound();
      const removed = await Routine.findOneAndDelete({ _id: req.params.id, userId: req.userId }).lean();
      if (!removed) throw notFound();
      await Completion.deleteMany({ userId: req.userId, routineId: removed._id });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return r;
}

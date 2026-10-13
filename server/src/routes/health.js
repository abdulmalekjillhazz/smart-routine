import { Router } from 'express';
import mongoose from 'mongoose';
import { safeEqual } from '../lib/crypto.js';
import { isCloudinaryConfigured } from '../services/cloudinary.js';
import { MlModel } from '../models/MlModel.js';

const PING_TIMEOUT_MS = 2000;

async function pingDatabase() {
  if (mongoose.connection.readyState !== 1) return 'fail';
  try {
    await Promise.race([
      mongoose.connection.db.admin().ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), PING_TIMEOUT_MS)),
    ]);
    return 'ok';
  } catch {
    return 'fail';
  }
}

// Liveness: is the process up? Uses no database, so it stays cheap for uptime monitors.
// Readiness: can the service do its job? Checks the database. Details need READY_TOKEN.
export function healthRouter(config) {
  const r = Router();

  r.get('/health', (_req, res) => {
    res.json({ ok: true, version: process.env.APP_VERSION || 'dev', uptimeSec: Math.round(process.uptime()) });
  });

  r.get('/ready', async (req, res, next) => {
    try {
      const database = await pingDatabase();
      const ready = database === 'ok';
      const showDetails = Boolean(config.READY_TOKEN) && safeEqual(req.get('x-ready-token'), config.READY_TOKEN);
      if (!showDetails) return res.status(ready ? 200 : 503).json({ ready });

      const checks = {
        database,
        model: database === 'ok' ? ((await MlModel.exists({ status: 'active' })) ? 'ok' : 'none') : 'unknown',
        cloudinary: isCloudinaryConfigured() ? 'configured' : 'off',
        push: config.VAPID_PUBLIC_KEY ? 'configured' : 'off',
        scheduler: config.VAPID_PUBLIC_KEY && config.SCHEDULER_ENABLED ? 'enabled' : 'off',
      };
      res.status(ready ? 200 : 503).json({ ready, checks });
    } catch (err) {
      next(err);
    }
  });

  return r;
}

// Vercel serverless entry for the API project (Root Directory: server/).
// Classic `node src/index.js` still works for Render/Railway; this file only
// adapts the same Express app to Vercel's (req, res) function model.
// NOTE: the reminder scheduler does NOT run here (serverless has no
// long-lived process). Use Vercel Cron or an external worker for that.
import mongoose from 'mongoose';
import { loadEnv } from '../src/config/env.js';
import { createApp } from '../src/app.js';
import { dbOptions } from '../src/lib/db.js';

let cached = globalThis.__srVercel ?? (globalThis.__srVercel = { app: null, dbReady: false });

async function ensureDb(uri, env) {
  if (mongoose.connection.readyState === 1) return;
  // Reuse the same pooled options as the classic server, single attempt per cold start.
  await mongoose.connect(uri, dbOptions(env));
}

function boot() {
  if (cached.app) return cached;
  const config = loadEnv();
  cached.app = createApp({ config });
  cached.config = config;
  return cached;
}

export default async function handler(req, res) {
  const { app, config } = boot();
  try {
    await ensureDb(config.MONGODB_URI, process.env);
  } catch {
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Database unavailable' }));
    return;
  }
  return app(req, res);
}

import 'dotenv/config';
import { loadEnv } from './config/env.js';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';
import { connectWithRetry } from './lib/db.js';
import { configurePush } from './services/push.js';
import { startScheduler } from './services/scheduler.js';
import { initSentry } from './lib/sentry.js';
import mongoose from 'mongoose';

async function main() {
  // Throws with variable names only if configuration is wrong. The process then exits.
  const config = loadEnv();
  initSentry({ dsn: config.SENTRY_DSN, environment: config.NODE_ENV });

  try {
    await connectWithRetry(config.MONGODB_URI);
  } catch {
    // Never print the URI: it contains the database password.
    throw new Error('Database connection failed. Check MONGODB_URI and that the database is reachable.');
  }

  const server = createApp({ config }).listen(config.PORT, () => {
    logger.info({ port: config.PORT }, 'Smart Routine API started');
  });

  let stopScheduler = () => {};
  if (config.VAPID_PUBLIC_KEY && config.SCHEDULER_ENABLED) {
    configurePush(config);
    stopScheduler = startScheduler();
    logger.info('reminder scheduler started');
  } else {
    logger.warn('push reminders are off (VAPID keys not set, or SCHEDULER_ENABLED=false)');
  }

  const shutdown = async (signal) => {
    logger.info({ signal }, 'shutting down');
    stopScheduler();
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error(`Startup failed: ${err.message}`);
  process.exit(1);
});

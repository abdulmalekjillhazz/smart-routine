// Runs the upload cleanup once. Schedule it with cron or Task Scheduler on the host, for example hourly.
//   node scripts/cleanup-uploads.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { loadEnv } from '../src/config/env.js';
import { configureCloudinary } from '../src/services/cloudinary.js';
import { cleanupUploads } from '../src/services/uploads.js';

const config = loadEnv();
configureCloudinary(config);
await mongoose.connect(config.MONGODB_URI);
const stats = await cleanupUploads();
console.log(`Cleanup done: marked orphaned ${stats.markedOrphaned}, deleted ${stats.deleted}, failed ${stats.failed}`);
await mongoose.disconnect();

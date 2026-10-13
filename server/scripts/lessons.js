// Editorial command-line tool. Run it on your own machine, not on the public server.
//   node scripts/lessons.js create scripts/examples/lesson-sample.json --author you@example.com
//   node scripts/lessons.js submit morning-plan --by you@example.com
//   node scripts/lessons.js publish morning-plan --by reviewer@example.com
//   node scripts/lessons.js list
// Phase 5 replaces this with admin screens and roles.
import 'dotenv/config';
import fs from 'node:fs';
import mongoose from 'mongoose';
import { lessonDraftSchema } from '@smart-routine/shared';
import { User } from '../src/models/User.js';
import { AppError } from '../src/lib/AppError.js';
import { createDraft, submitForReview, publishLesson, listAllLessons } from '../src/services/lessons.js';

const [, , command, target, ...flags] = process.argv;
const flag = (name) => {
  const i = flags.indexOf(`--${name}`);
  return i >= 0 ? flags[i + 1] : undefined;
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function actorFrom(email) {
  if (!email) fail('Missing --by or --author with the user email.');
  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
  if (!user) fail(`No active user with email ${email}. Register it in the app first.`);
  return user;
}

async function main() {
  if (!process.env.MONGODB_URI) fail('MONGODB_URI is not set. Check server/.env.');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    if (command === 'create') {
      if (!target) fail('Usage: create <file.json> --author <email>');
      const parsed = lessonDraftSchema.safeParse(JSON.parse(fs.readFileSync(target, 'utf8')));
      if (!parsed.success) {
        const names = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        fail(`Lesson file is not valid:\n  ${names.join('\n  ')}`);
      }
      const lesson = await createDraft(await actorFrom(flag('author')), parsed.data);
      console.log(`Draft created: ${lesson.slug} (status: ${lesson.status})`);
    } else if (command === 'submit') {
      const lesson = await submitForReview(target, await actorFrom(flag('by')));
      console.log(`Submitted for review: ${lesson.slug}`);
    } else if (command === 'publish') {
      const lesson = await publishLesson(target, await actorFrom(flag('by')));
      console.log(`Published: ${lesson.slug}`);
    } else if (command === 'list') {
      for (const l of await listAllLessons()) console.log(`${l.status.padEnd(10)} ${l.slug}`);
    } else {
      fail('Commands: create <file> --author <email> | submit <slug> --by <email> | publish <slug> --by <email> | list');
    }
  } catch (err) {
    if (err instanceof AppError) fail(err.i18n.en);
    throw err;
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => fail(`Failed: ${err.message}`));

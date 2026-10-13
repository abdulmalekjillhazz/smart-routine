import { Story } from '../models/Story.js';
import { AppError, MSG } from '../lib/AppError.js';

const SMSG = Object.freeze({
  slugTaken: { en: 'A story with this slug already exists.', bn: 'এই স্লাগ দিয়ে একটি গল্প আগে থেকেই আছে।' },
  notDraft: { en: 'Only a draft can be submitted for review.', bn: 'শুধু খসড়া গল্প পর্যালোচনার জন্য পাঠানো যায়।' },
  notReview: { en: 'Only a story in review can be published.', bn: 'শুধু পর্যালোচনায় থাকা গল্প প্রকাশ করা যায়।' },
  authorOnly: { en: 'Only the author can submit this story.', bn: 'শুধু লেখক এই গল্প জমা দিতে পারবেন।' },
  secondReviewer: {
    en: 'A second person must publish. The author cannot publish their own story.',
    bn: 'প্রকাশ করতে অন্য একজন ব্যক্তি লাগবে। লেখক নিজের গল্প প্রকাশ করতে পারবেন না।',
  },
});

// Only fields a reader may see. The internal author/review fields stay private.
export function toPublicStory(s) {
  return {
    id: String(s._id),
    slug: s.slug,
    title: s.title,
    body: s.body,
    // Text is in MongoDB; voice file is in Cloudinary, served via this URL.
    audio: s.audio?.url ? { url: s.audio.url, bytes: s.audio.bytes ?? null, durationSec: s.audio.durationSec ?? null } : null,
    publishedAt: s.publishedAt,
  };
}

export function toStorySummary(s) {
  return {
    id: String(s._id),
    slug: s.slug,
    title: s.title,
    hasAudio: Boolean(s.audio?.url),
    publishedAt: s.publishedAt,
  };
}

export async function listPublishedStories() {
  const stories = await Story.find({ status: 'published' }).sort({ publishedAt: -1 }).limit(50).lean();
  return stories.map(toStorySummary);
}

export async function findPublishedStoryBySlug(slug) {
  const story = await Story.findOne({ slug, status: 'published' }).lean();
  if (!story) throw new AppError(404, 'NOT_FOUND', MSG.notFound);
  return story;
}

export async function createStoryDraft(author, data) {
  if (await Story.exists({ slug: data.slug })) throw new AppError(409, 'CONFLICT', SMSG.slugTaken);
  return Story.create({ ...data, status: 'draft', createdBy: author._id });
}

async function findStoryBySlug(slug) {
  const story = await Story.findOne({ slug });
  if (!story) throw new AppError(404, 'NOT_FOUND', MSG.notFound);
  return story;
}

export async function submitStoryForReview(slug, actor) {
  const story = await findStoryBySlug(slug);
  if (story.status !== 'draft') throw new AppError(409, 'CONFLICT', SMSG.notDraft);
  if (String(story.createdBy) !== String(actor._id)) throw new AppError(403, 'FORBIDDEN', SMSG.authorOnly);
  const updated = await Story.findOneAndUpdate(
    { _id: story._id, status: 'draft' },
    { $set: { status: 'review' } },
    { new: true }
  );
  if (!updated) throw new AppError(409, 'CONFLICT', SMSG.notDraft);
  return updated;
}

export async function publishStory(slug, actor) {
  const story = await findStoryBySlug(slug);
  if (story.status !== 'review') throw new AppError(409, 'CONFLICT', SMSG.notReview);
  if (String(story.createdBy) === String(actor._id)) throw new AppError(403, 'FORBIDDEN', SMSG.secondReviewer);
  const updated = await Story.findOneAndUpdate(
    { _id: story._id, status: 'review' },
    {
      $set: { status: 'published', reviewedBy: actor._id, publishedAt: new Date() },
      $inc: { version: 1 },
    },
    { new: true }
  );
  if (!updated) throw new AppError(409, 'CONFLICT', SMSG.notReview);
  return updated;
}

export async function archiveStory(slug) {
  const story = await findStoryBySlug(slug);
  if (story.status === 'archived') throw new AppError(409, 'CONFLICT', SMSG.notReview);
  story.status = 'archived';
  await story.save();
  return story;
}

export async function listAllStories() {
  return Story.find({}, { slug: 1, status: 1, title: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean();
}

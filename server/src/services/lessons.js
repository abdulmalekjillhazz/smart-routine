import { Lesson } from '../models/Lesson.js';
import { LessonScore } from '../models/LessonScore.js';
import { AppError, MSG } from '../lib/AppError.js';
import { scoreQuiz } from '@smart-routine/shared';

// Messages for the editorial workflow. Bilingual, like everything the user sees.
const LMSG = Object.freeze({
  slugTaken: { en: 'A lesson with this slug already exists.', bn: 'এই স্লাগ দিয়ে একটি পাঠ আগে থেকেই আছে।' },
  notDraft: { en: 'Only a draft can be submitted for review.', bn: 'শুধু খসড়া পাঠ পর্যালোচনার জন্য পাঠানো যায়।' },
  notReview: { en: 'Only a lesson in review can be published.', bn: 'শুধু পর্যালোচনায় থাকা পাঠ প্রকাশ করা যায়।' },
  authorOnly: { en: 'Only the author can submit this lesson.', bn: 'শুধু লেখক এই পাঠ জমা দিতে পারবেন।' },
  secondReviewer: {
    en: 'A second person must publish. The author cannot publish their own lesson.',
    bn: 'প্রকাশ করতে অন্য একজন ব্যক্তি লাগবে। লেখক নিজের পাঠ প্রকাশ করতে পারবেন না।',
  },
  answerCount: { en: 'Answer count must match the number of questions.', bn: 'উত্তরের সংখ্যা প্রশ্নের সংখ্যার সমান হতে হবে।' },
});

// Only fields a learner may see. The answer key (answerIndex) and internal fields are never copied.
export function toPublicLesson(l) {
  return {
    id: String(l._id),
    slug: l.slug,
    title: l.title,
    body: l.body,
    vocabulary: (l.vocabulary || []).map((v) => ({ word: v.word, meaning: v.meaning })),
    quiz: (l.quiz || []).map((q) => ({ question: q.question, options: q.options })),
    // Only the server-built URL and its type. The Cloudinary public id stays private.
    media: l.media?.url ? { type: l.media.resourceType, url: l.media.url } : null,
    publishedAt: l.publishedAt,
  };
}

export function toLessonSummary(l) {
  return {
    id: String(l._id),
    slug: l.slug,
    title: l.title,
    publishedAt: l.publishedAt,
    questionCount: (l.quiz || []).length,
  };
}

export async function listPublished() {
  const lessons = await Lesson.find({ status: 'published' }).sort({ publishedAt: -1 }).limit(50).lean();
  return lessons.map(toLessonSummary);
}

export async function findPublishedBySlug(slug) {
  const lesson = await Lesson.findOne({ slug, status: 'published' }).lean();
  if (!lesson) throw new AppError(404, 'NOT_FOUND', MSG.notFound);
  return lesson;
}

export async function createDraft(author, data) {
  if (await Lesson.exists({ slug: data.slug })) throw new AppError(409, 'CONFLICT', LMSG.slugTaken);
  return Lesson.create({ ...data, status: 'draft', createdBy: author._id });
}

async function findBySlug(slug) {
  const lesson = await Lesson.findOne({ slug });
  if (!lesson) throw new AppError(404, 'NOT_FOUND', MSG.notFound);
  return lesson;
}

export async function submitForReview(slug, actor) {
  const lesson = await findBySlug(slug);
  if (lesson.status !== 'draft') throw new AppError(409, 'CONFLICT', LMSG.notDraft);
  if (String(lesson.createdBy) !== String(actor._id)) throw new AppError(403, 'FORBIDDEN', LMSG.authorOnly);
  // The status condition in the filter means two submits cannot both succeed.
  const updated = await Lesson.findOneAndUpdate(
    { _id: lesson._id, status: 'draft' },
    { $set: { status: 'review' } },
    { new: true }
  );
  if (!updated) throw new AppError(409, 'CONFLICT', LMSG.notDraft);
  return updated;
}

export async function publishLesson(slug, actor) {
  const lesson = await findBySlug(slug);
  if (lesson.status !== 'review') throw new AppError(409, 'CONFLICT', LMSG.notReview);
  if (String(lesson.createdBy) === String(actor._id)) throw new AppError(403, 'FORBIDDEN', LMSG.secondReviewer);
  const updated = await Lesson.findOneAndUpdate(
    { _id: lesson._id, status: 'review' },
    {
      $set: { status: 'published', reviewedBy: actor._id, publishedAt: new Date() },
      $inc: { version: 1 },
    },
    { new: true }
  );
  if (!updated) throw new AppError(409, 'CONFLICT', LMSG.notReview);
  return updated;
}

export async function archiveLesson(slug) {
  const lesson = await findBySlug(slug);
  if (lesson.status === 'archived') throw new AppError(409, 'CONFLICT', LMSG.notReview);
  lesson.status = 'archived';
  await lesson.save();
  return lesson;
}

export async function listAllLessons() {
  return Lesson.find({}, { slug: 1, status: 1, title: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean();
}

// The server scores the attempt. The browser never sees the answer key before submitting.
export async function submitAttempt(lessonId, user, answers) {
  const lesson = await Lesson.findOne({ _id: lessonId, status: 'published' }).lean();
  if (!lesson) throw new AppError(404, 'NOT_FOUND', MSG.notFound);
  if (answers.length !== lesson.quiz.length) throw new AppError(400, 'VALIDATION_FAILED', LMSG.answerCount);

  const { score, total, results } = scoreQuiz(lesson.quiz, answers);
  await LessonScore.create({ userId: user._id, lessonId: lesson._id, score, total, answers });
  return { score, total, results };
}

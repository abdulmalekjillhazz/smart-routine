import { Upload } from '../models/Upload.js';
import { Lesson } from '../models/Lesson.js';
import { Story } from '../models/Story.js';
import { AppError, MSG } from '../lib/AppError.js';
import { randomToken } from '../lib/crypto.js';
import { cloudinary, signParams } from './cloudinary.js';

const LESSON_FOLDER = 'smart-routine/lessons';
const STORY_FOLDER = 'smart-routine/stories';
const MIN = 60 * 1000;
const SPECS = {
  image: { formats: 'jpg,png,webp', maxBytes: 5 * 1024 * 1024, folder: LESSON_FOLDER },
  video: { formats: 'mp4,webm', maxBytes: 50 * 1024 * 1024, folder: LESSON_FOLDER },
  // Voice: stored in Cloudinary as a `video` resource (Cloudinary keeps audio under video).
  audio: { formats: 'mp3,wav,ogg,m4a,webm', maxBytes: 20 * 1024 * 1024, folder: STORY_FOLDER },
};
const ATTACH_WINDOW_MS = 60 * MIN;

const bad = (en, bn) => new AppError(400, 'VALIDATION_FAILED', { en, bn });

// The server chooses the file name and folder. The browser only gets a signature for those exact values.
export async function createSignature(actor, resourceType) {
  const { config } = cloudinary();
  const spec = SPECS[resourceType];
  if (!spec) throw bad('Unknown media type.', 'অজানা মিডিয়ার ধরন।');
  const folder = spec.folder;
  const publicId = `${folder}/${randomToken(16).replace(/[^A-Za-z0-9]/g, '').slice(0, 20)}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { allowed_formats: spec.formats, public_id: publicId, timestamp };

  await Upload.create({
    publicId,
    resourceType,
    uploadedBy: actor._id,
    expiresAt: new Date(Date.now() + ATTACH_WINDOW_MS),
  });

  return {
    cloudName: config.CLOUDINARY_CLOUD_NAME,
    apiKey: config.CLOUDINARY_API_KEY,
    timestamp,
    signature: signParams(params, config.CLOUDINARY_API_SECRET),
    publicId,
    allowedFormats: spec.formats,
    maxBytes: spec.maxBytes,
  };
}

function mediaUrl(cloudName, resourceType, publicId) {
  // Cloudinary serves audio files through the `video` delivery type.
  const delivery = resourceType === 'audio' ? 'video' : resourceType;
  return `https://res.cloudinary.com/${cloudName}/${delivery}/upload/${publicId}`;
}

// Cloudinary Admin API type for a logical resourceType.
function cloudType(resourceType) {
  return resourceType === 'audio' ? 'video' : resourceType;
}

async function claimPendingUpload(actor, publicId, resourceType) {
  const upload = await Upload.findOne({ publicId, uploadedBy: actor._id, status: 'pending' });
  if (!upload) throw new AppError(404, 'NOT_FOUND', MSG.notFound);
  if (upload.resourceType !== resourceType) throw bad('Media type does not match the upload.', 'মিডিয়ার ধরন আপলোডের সাথে মেলেনি।');
  if (upload.expiresAt < new Date()) {
    await Upload.updateOne({ _id: upload._id }, { $set: { status: 'orphaned' } });
    throw bad('The upload window has closed. Upload again.', 'আপলোডের সময়সীমা শেষ। আবার আপলোড করুন।');
  }
  return upload;
}

async function verifyAndConsume(actor, publicId, resourceType) {
  const { client } = cloudinary();
  const upload = await claimPendingUpload(actor, publicId, resourceType);
  const info = await client.resourceInfo(publicId, cloudType(resourceType));
  if (!info) throw bad('The file was not uploaded.', 'ফাইলটি আপলোড হয়নি।');

  const spec = SPECS[resourceType];
  const allowed = spec.formats.split(',');
  if (info.bytes > spec.maxBytes || !allowed.includes(String(info.format).toLowerCase())) {
    // Refuse and remove the file, so a bad upload does not stay in storage.
    await client.destroy(publicId, cloudType(resourceType));
    await Upload.updateOne({ _id: upload._id }, { $set: { status: 'deleted', deletedAt: new Date() } });
    throw bad('The file is too large or in the wrong format.', 'ফাইলটি অনেক বড় বা ভুল ধরনের।');
  }
  return { upload, info };
}

export async function attachMedia(slug, actor, { publicId, resourceType }) {
  if (resourceType === 'audio') throw bad('Use story audio upload for voice files.', 'ভয়েস ফাইলের জন্য গল্পের অডিও আপলোড ব্যবহার করুন।');
  const { config } = cloudinary();
  const { upload } = await verifyAndConsume(actor, publicId, resourceType);

  const lesson = await Lesson.findOne({ slug });
  if (!lesson || lesson.status === 'archived') throw new AppError(404, 'NOT_FOUND', MSG.notFound);

  // Replacing old media marks the old file as orphaned, so the cleanup job removes it.
  if (lesson.media?.publicId) {
    await Upload.updateOne({ publicId: lesson.media.publicId, status: 'attached' }, { $set: { status: 'orphaned' } });
  }

  lesson.media = { publicId, resourceType, url: mediaUrl(config.CLOUDINARY_CLOUD_NAME, resourceType, publicId) };
  await lesson.save();
  await Upload.updateOne({ _id: upload._id }, { $set: { status: 'attached', attachedTo: slug } });
  return lesson;
}

export async function detachMedia(slug) {
  const lesson = await Lesson.findOne({ slug });
  if (!lesson) throw new AppError(404, 'NOT_FOUND', MSG.notFound);
  if (lesson.media?.publicId) {
    await Upload.updateOne({ publicId: lesson.media.publicId, status: 'attached' }, { $set: { status: 'orphaned' } });
  }
  lesson.media = { publicId: null, resourceType: null, url: null };
  await lesson.save();
  return lesson;
}

// Story voice: text stays in MongoDB (Story.body), audio file stays in Cloudinary.
export async function attachStoryAudio(slug, actor, { publicId }) {
  const { config } = cloudinary();
  const { upload, info } = await verifyAndConsume(actor, publicId, 'audio');

  const story = await Story.findOne({ slug });
  if (!story || story.status === 'archived') throw new AppError(404, 'NOT_FOUND', MSG.notFound);

  if (story.audio?.publicId) {
    await Upload.updateOne({ publicId: story.audio.publicId, status: 'attached' }, { $set: { status: 'orphaned' } });
  }

  story.audio = {
    publicId,
    resourceType: 'audio',
    url: mediaUrl(config.CLOUDINARY_CLOUD_NAME, 'audio', publicId),
    bytes: info.bytes ?? null,
    durationSec: info.duration ?? null,
  };
  await story.save();
  await Upload.updateOne({ _id: upload._id }, { $set: { status: 'attached', attachedTo: `story:${slug}` } });
  return story;
}

export async function detachStoryAudio(slug) {
  const story = await Story.findOne({ slug });
  if (!story) throw new AppError(404, 'NOT_FOUND', MSG.notFound);
  if (story.audio?.publicId) {
    await Upload.updateOne({ publicId: story.audio.publicId, status: 'attached' }, { $set: { status: 'orphaned' } });
  }
  story.audio = { publicId: null, resourceType: null, url: null, bytes: null, durationSec: null };
  await story.save();
  return story;
}

// Run on a schedule (or by hand with scripts/cleanup-uploads.js).
// Pending uploads that were never attached are marked orphaned after their window closes.
// Orphaned files are destroyed in Cloudinary. A file that fails to delete stays orphaned and is retried next run.
export async function cleanupUploads({ now = new Date() } = {}) {
  const { client } = cloudinary();
  const expired = await Upload.updateMany(
    { status: 'pending', expiresAt: { $lt: now } },
    { $set: { status: 'orphaned' } }
  );

  const orphans = await Upload.find({ status: 'orphaned' }).lean();
  let deleted = 0;
  let failed = 0;
  for (const u of orphans) {
    try {
      // 'ok' or 'not found': either way the file is gone.
      // Audio is stored in Cloudinary as `video` type.
      await client.destroy(u.publicId, cloudType(u.resourceType));
      await Upload.updateOne({ _id: u._id }, { $set: { status: 'deleted', deletedAt: new Date() } });
      deleted += 1;
    } catch {
      failed += 1;
    }
  }
  return { markedOrphaned: expired.modifiedCount, deleted, failed };
}

import mongoose from 'mongoose';

const { Schema } = mongoose;

const bilingual = (max) => ({
  bn: { type: String, required: true, trim: true, maxlength: max },
  en: { type: String, required: true, trim: true, maxlength: max },
});

// Story text lives here in MongoDB. The voice file lives in Cloudinary;
// only its publicId + public URL are stored here (set via the upload service).
const storySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 80 },
    status: { type: String, enum: ['draft', 'review', 'published', 'archived'], default: 'draft', required: true },
    title: bilingual(200),
    body: bilingual(20000),
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    publishedAt: { type: Date, default: null },
    version: { type: Number, default: 1 },
    // Set only through the upload service. The public URL is built on the server, never typed by a user.
    audio: {
      publicId: { type: String, default: null },
      resourceType: { type: String, enum: ['audio', null], default: null },
      url: { type: String, default: null },
      bytes: { type: Number, default: null },
      durationSec: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

storySchema.index({ status: 1, publishedAt: -1 });

export const Story = mongoose.models.Story || mongoose.model('Story', storySchema);

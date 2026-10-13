import mongoose from 'mongoose';

const { Schema } = mongoose;

const bilingual = (max) => ({
  bn: { type: String, required: true, trim: true, maxlength: max },
  en: { type: String, required: true, trim: true, maxlength: max },
});

const lessonSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 80 },
    status: { type: String, enum: ['draft', 'review', 'published', 'archived'], default: 'draft', required: true },
    title: bilingual(200),
    body: bilingual(5000),
    vocabulary: [
      {
        _id: false,
        word: { type: String, required: true, maxlength: 60 },
        meaning: bilingual(200),
      },
    ],
    quiz: [
      {
        _id: false,
        question: bilingual(300),
        options: {
          type: [bilingual(120)],
          validate: { validator: (v) => v.length === 4, message: 'a question needs exactly 4 options' },
        },
        // Stored here, never returned by the public API.
        answerIndex: { type: Number, required: true, min: 0, max: 3 },
      },
    ],
    aiDrafted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    publishedAt: { type: Date, default: null },
    version: { type: Number, default: 1 },
    // Set only through the upload service. The public URL is built on the server, never typed by a user.
    media: {
      publicId: { type: String, default: null },
      resourceType: { type: String, enum: ['image', 'video', null], default: null },
      url: { type: String, default: null },
    },
  },
  { timestamps: true }
);

lessonSchema.index({ status: 1, publishedAt: -1 });

export const Lesson = mongoose.models.Lesson || mongoose.model('Lesson', lessonSchema);

import mongoose from 'mongoose';

const { Schema } = mongoose;

const lessonScoreSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
  score: { type: Number, required: true },
  total: { type: Number, required: true },
  answers: { type: [Number], required: true },
  attemptedAt: { type: Date, default: Date.now },
});

lessonScoreSchema.index({ userId: 1, lessonId: 1, attemptedAt: -1 });

export const LessonScore = mongoose.models.LessonScore || mongoose.model('LessonScore', lessonScoreSchema);

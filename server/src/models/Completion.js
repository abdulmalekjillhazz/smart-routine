import mongoose from 'mongoose';

const { Schema } = mongoose;

const completionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    routineId: { type: Schema.Types.ObjectId, ref: 'Routine', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    status: { type: String, enum: ['done', 'missed', 'skipped'], required: true },
  },
  { timestamps: true }
);

// One status per routine per day per user. The unique index also prevents duplicate rows under concurrency.
completionSchema.index({ userId: 1, routineId: 1, date: 1 }, { unique: true });

export const Completion = mongoose.models.Completion || mongoose.model('Completion', completionSchema);

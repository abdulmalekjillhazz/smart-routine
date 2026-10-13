import mongoose from 'mongoose';

const { Schema } = mongoose;

// Remembers the result of each sync operation for 24 hours, so a retry never applies it twice.
const idempotencySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    opId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'done'], default: 'pending' },
    result: { type: Schema.Types.Mixed, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

idempotencySchema.index({ userId: 1, opId: 1 }, { unique: true });
idempotencySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const IdempotencyRecord =
  mongoose.models.IdempotencyRecord || mongoose.model('IdempotencyRecord', idempotencySchema);

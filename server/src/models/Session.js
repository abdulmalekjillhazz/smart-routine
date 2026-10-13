import mongoose from 'mongoose';

const { Schema } = mongoose;

// One document per login. We store only hashes of tokens.
// previousHashes holds the token from before the last rotation; seeing it again means theft.
const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    familyId: { type: String, required: true, index: true },
    currentHash: { type: String, required: true, unique: true },
    previousHashes: { type: [String], default: [] },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    // When the second factor was last checked for this session. Staff actions need it to be recent.
    mfaVerifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

sessionSchema.index({ previousHashes: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);

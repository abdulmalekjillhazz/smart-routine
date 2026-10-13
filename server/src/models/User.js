import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, required: true, trim: true, maxlength: 60 },
    locale: { type: String, enum: ['bn', 'en'], default: 'bn' },
    timezone: { type: String, default: 'Asia/Dhaka' },
    // user = learner. viewer, editor, owner = staff. Staff need two-factor sign-in.
    role: { type: String, enum: ['user', 'viewer', 'editor', 'owner'], default: 'user' },
    mfa: {
      enabled: { type: Boolean, default: false },
      secretEnc: { type: String, select: false },
      lastStep: { type: Number, default: 0 },
    },
    consents: {
      modelTraining: {
        granted: { type: Boolean, default: false },
        version: { type: String, default: '' },
        updatedAt: { type: Date, default: null },
      },
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);

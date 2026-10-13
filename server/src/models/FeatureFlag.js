import mongoose from 'mongoose';

const { Schema } = mongoose;

// A row exists only after someone changes a flag. Otherwise the default in shared applies.
const flagSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    enabled: { type: Boolean, required: true },
    rolloutPercent: { type: Number, required: true, min: 0, max: 100 },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export const FeatureFlag = mongoose.models.FeatureFlag || mongoose.model('FeatureFlag', flagSchema);

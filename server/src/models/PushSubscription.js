import mongoose from 'mongoose';

const { Schema } = mongoose;

// A browser's push address. The endpoint is a URL the push service issued. Keys are used to encrypt messages.
const pushSubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true, maxlength: 2048 },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    failureCount: { type: Number, default: 0 },
    lastSuccessAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const PushSubscription =
  mongoose.models.PushSubscription || mongoose.model('PushSubscription', pushSubscriptionSchema);

import mongoose from 'mongoose';

const { Schema } = mongoose;

// Every signed upload is recorded here, so orphaned files can be found and deleted.
// pending: signed, not yet attached. attached: in use. orphaned: no longer used. deleted: removed from Cloudinary.
const uploadSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true },
    resourceType: { type: String, enum: ['image', 'video', 'audio'], required: true },
    status: { type: String, enum: ['pending', 'attached', 'orphaned', 'deleted'], default: 'pending', index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    attachedTo: { type: String, default: null },
    expiresAt: { type: Date, required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Upload = mongoose.models.Upload || mongoose.model('Upload', uploadSchema);

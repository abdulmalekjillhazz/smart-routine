import mongoose from 'mongoose';

const { Schema } = mongoose;

// Append-only. The application has no update or delete path for this collection.
// Summaries are short codes such as "role=editor". They never contain personal text.
const auditSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  actorRole: { type: String, required: true },
  action: { type: String, required: true },
  targetType: { type: String, required: true },
  targetId: { type: String, default: '' },
  summary: { type: String, default: '', maxlength: 200 },
  requestId: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true },
});

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditSchema);

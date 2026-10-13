import mongoose from 'mongoose';

const { Schema } = mongoose;

// One row per reminder. The unique index means a reminder is claimed once, even with several servers running.
const reminderLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  routineId: { type: Schema.Types.ObjectId, ref: 'Routine', required: true },
  date: { type: String, required: true },
  kind: { type: String, required: true },
  sentAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
});

reminderLogSchema.index({ userId: 1, routineId: 1, date: 1, kind: 1 }, { unique: true });
reminderLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ReminderLog = mongoose.models.ReminderLog || mongoose.model('ReminderLog', reminderLogSchema);

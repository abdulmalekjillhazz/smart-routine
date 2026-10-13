import mongoose from 'mongoose';

const { Schema } = mongoose;

// A lease lets only one server run a scheduler tick at a time. If that server dies, the lease expires.
const leaseSchema = new Schema({
  name: { type: String, required: true, unique: true },
  owner: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

export const SchedulerLease = mongoose.models.SchedulerLease || mongoose.model('SchedulerLease', leaseSchema);

import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { AppError, MSG } from '../lib/AppError.js';

export async function setRole(actor, targetId, role) {
  if (!mongoose.isValidObjectId(targetId)) throw new AppError(404, 'NOT_FOUND', MSG.notFound);
  // Nobody can change their own role. This stops an owner from quietly removing their own oversight.
  if (String(actor._id) === String(targetId)) {
    throw new AppError(403, 'FORBIDDEN', { en: 'You cannot change your own role.', bn: 'নিজের ভূমিকা নিজে বদলাতে পারবেন না।' });
  }
  const target = await User.findOneAndUpdate(
    { _id: targetId, deletedAt: null },
    { $set: { role } },
    { new: true }
  ).lean();
  if (!target) throw new AppError(404, 'NOT_FOUND', MSG.notFound);
  return target;
}

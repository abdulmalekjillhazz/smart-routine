import { FLAG_DEFAULTS, inRollout } from '@smart-routine/shared';
import { FeatureFlag } from '../models/FeatureFlag.js';

// Effective setting for each flag: the stored row if there is one, otherwise the default.
export async function effectiveFlags() {
  const rows = await FeatureFlag.find({}).lean();
  const stored = new Map(rows.map((r) => [r.key, r]));
  const out = {};
  for (const [key, def] of Object.entries(FLAG_DEFAULTS)) {
    const row = stored.get(key);
    out[key] = row
      ? { enabled: row.enabled, rolloutPercent: row.rolloutPercent }
      : { enabled: def.enabled, rolloutPercent: def.rolloutPercent };
  }
  return out;
}

export async function isEnabledFor(key, userId) {
  const flags = await effectiveFlags();
  const f = flags[key];
  if (!f) return false; // unknown flag: off
  return f.enabled && inRollout(key, String(userId), f.rolloutPercent);
}

export async function setFlag(key, { enabled, rolloutPercent }, actorId) {
  return FeatureFlag.findOneAndUpdate(
    { key },
    { $set: { enabled, rolloutPercent, updatedBy: actorId } },
    { upsert: true, new: true }
  ).lean();
}

import crypto from 'node:crypto';
import { MlModel } from '../models/MlModel.js';
import { AppError } from '../lib/AppError.js';
import { MODEL_FEATURES } from '@smart-routine/shared';

const msg = (en, bn) => ({ en, bn });

// The artifact file must match the SHA-256 written next to it. Anything else is refused.
export function verifyArtifactHash(bytes, sidecarHex) {
  const actual = crypto.createHash('sha256').update(bytes).digest('hex');
  if (!sidecarHex || actual !== sidecarHex.trim()) {
    throw new AppError(400, 'VALIDATION_FAILED', msg('Artifact hash does not match its sidecar file.', 'মডেল ফাইলের হ্যাশ মিলছে না।'));
  }
  return actual;
}

function checkShape(a) {
  const n = MODEL_FEATURES.length;
  const ok =
    typeof a.version === 'string' &&
    JSON.stringify(a.features) === JSON.stringify(MODEL_FEATURES) &&
    [a.mean, a.scale, a.coefficients].every((v) => Array.isArray(v) && v.length === n && v.every(Number.isFinite)) &&
    Number.isFinite(a.intercept) &&
    a.metrics && a.consentVersion;
  if (!ok) throw new AppError(400, 'VALIDATION_FAILED', msg('Artifact does not match the feature contract.', 'মডেল ফাইল ফিচারের নিয়মের সাথে মেলে না।'));
}

// Import is safe to repeat: the same version cannot be imported twice.
export async function importArtifact(bytes, sidecarHex) {
  const sha = verifyArtifactHash(bytes, sidecarHex);
  const a = JSON.parse(bytes.toString('utf8'));
  checkShape(a);
  if (await MlModel.exists({ version: a.version })) {
    throw new AppError(409, 'CONFLICT', msg('This model version is already imported.', 'এই মডেল সংস্করণটি আগেই আমদানি করা হয়েছে।'));
  }
  const doc = await MlModel.create({
    version: a.version,
    status: a.status,
    features: a.features,
    mean: a.mean,
    scale: a.scale,
    coefficients: a.coefficients,
    intercept: a.intercept,
    metrics: a.metrics,
    decisionReasons: a.decision?.reasons ?? [],
    trainingWindow: a.trainingWindow,
    rows: a.rows,
    artifactSha256: sha,
    consentVersion: a.consentVersion,
  });
  return doc;
}

export async function activate(version) {
  const target = await MlModel.findOne({ version });
  if (!target) throw new AppError(404, 'NOT_FOUND', msg('No model with that version.', 'এই সংস্করণের মডেল নেই।'));
  if (target.status === 'synthetic') throw new AppError(403, 'FORBIDDEN', msg('Synthetic models cannot be activated.', 'কৃত্রিম ডেটার মডেল চালু করা যায় না।'));
  if (target.status !== 'candidate' && target.status !== 'retired') {
    throw new AppError(409, 'CONFLICT', msg('Only a passing candidate can be activated.', 'শুধু পাস করা প্রার্থী মডেল চালু করা যায়।'));
  }

  // Retire the current model first, so the unique index allows the new one to become active.
  await MlModel.updateMany({ status: 'active' }, { $set: { status: 'retired' } });
  target.status = 'active';
  target.activatedAt = new Date();
  await target.save();
  return target;
}

// Rollback = activate the most recently retired model that passed.
export async function rollback() {
  const previous = await MlModel.findOne({ status: 'retired', activatedAt: { $ne: null } })
    .sort({ activatedAt: -1 })
    .lean();
  if (!previous) throw new AppError(404, 'NOT_FOUND', msg('No earlier model to roll back to.', 'ফিরে যাওয়ার মতো আগের মডেল নেই।'));
  return activate(previous.version);
}

export async function activeModel() {
  return MlModel.findOne({ status: 'active' }).lean();
}

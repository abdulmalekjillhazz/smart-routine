import { AuditLog } from '../models/AuditLog.js';

export async function writeAudit({ actor, action, targetType, targetId = '', summary = '', requestId = '' }) {
  await AuditLog.create({
    actorId: actor?._id ?? null,
    actorRole: actor?.role ?? 'cli',
    action,
    targetType,
    targetId: String(targetId),
    summary: summary.slice(0, 200),
    requestId,
  });
}

export async function listAudit({ before, limit }) {
  const filter = before ? { createdAt: { $lt: new Date(before) } } : {};
  const entries = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  return {
    entries: entries.map((e) => ({
      id: String(e._id),
      actorRole: e.actorRole,
      action: e.action,
      targetType: e.targetType,
      targetId: e.targetId,
      summary: e.summary,
      createdAt: e.createdAt,
    })),
    nextCursor: entries.length === limit ? entries[entries.length - 1].createdAt.toISOString() : null,
  };
}

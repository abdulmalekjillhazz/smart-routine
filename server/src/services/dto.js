// Only these fields ever leave the server. Never return passwordHash, internal flags, or other users' data.
export function toPublicUser(user) {
  return {
    id: String(user._id),
    email: user.email,
    displayName: user.displayName,
    locale: user.locale,
    timezone: user.timezone,
    consents: {
      modelTraining: {
        granted: Boolean(user.consents?.modelTraining?.granted),
        version: user.consents?.modelTraining?.version ?? '',
        updatedAt: user.consents?.modelTraining?.updatedAt ?? null,
      },
    },
  };
}

export function toRoutineDto(r) {
  return {
    id: String(r._id),
    title: r.title,
    startTime: r.startTime,
    endTime: r.endTime,
    crossesMidnight: Boolean(r.crossesMidnight),
    category: r.category,
    priority: r.priority,
    note: r.note,
    isFrog: Boolean(r.isFrog),
    version: r.version,
  };
}

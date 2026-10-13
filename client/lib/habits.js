// Client-side habit-recovery helpers (mirror shared/src/habits.js, dependency-free).
export const MAX_FREEZES_PER_MONTH = 2;

export function applyStreakFreeze({ freezesUsed = 0, limit = MAX_FREEZES_PER_MONTH } = {}) {
  if (freezesUsed >= limit) return { ok: false, remaining: 0 };
  return { ok: true, remaining: limit - freezesUsed - 1 };
}

export function buildWeeklyReview(completions = []) {
  const highlights = [];
  const suggestions = [];
  for (const c of completions) {
    const total = Number(c.total) || 0;
    const done = Number(c.done) || 0;
    if (total === 0) continue;
    if (done >= Math.ceil(total * 0.8)) highlights.push(`${c.title}: ${done}/${total} ✓`);
    else if (total - done >= 3) {
      suggestions.push({
        routineId: c.routineId, title: c.title,
        messageEn: `You missed ${c.title} ${total - done} times. Move it 30 minutes earlier?`,
        messageBn: `${c.title} ${total - done} বার মিস হয়েছে। ৩০ মিনিট এগিয়ে নেবেন?`,
      });
    }
  }
  return { highlights, suggestions };
}

export function toMicroCompletion({ routineId, date }) {
  if (!routineId || !date) throw new Error('routineId and date are required');
  return { routineId, date, status: 'done', micro: true, durationMinutes: 5, label: '⚡ ৫ মিনিট' };
}

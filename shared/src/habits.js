// Anti-abandonment helpers: streak freeze, compassionate weekly review, micro-habits.
// All pure functions so client + server share the same rules.

export const MAX_FREEZES_PER_MONTH = 2;

// freezesUsed: number already consumed this calendar month.
// Returns { ok, remaining } — never throws, so UI can 1-tap safely.
export function applyStreakFreeze({ freezesUsed = 0, limit = MAX_FREEZES_PER_MONTH } = {}) {
  if (freezesUsed >= limit) return { ok: false, remaining: 0 };
  return { ok: true, remaining: limit - freezesUsed - 1 };
}

// Weekly review ("শুক্রবার পর্যালোচনা" / Sunday Reset).
// completions: [{ routineId, title, done, total }] per week.
// Returns { highlights: string[], suggestions: [{ routineId, title, messageBn, messageEn }] }
export function buildWeeklyReview(completions = []) {
  const highlights = [];
  const suggestions = [];
  for (const c of completions) {
    const total = Number(c.total) || 0;
    const done = Number(c.done) || 0;
    if (total === 0) continue;
    const missed = total - done;
    if (done >= Math.ceil(total * 0.8)) {
      highlights.push(`${c.title}: ${done}/${total} ✓`);
    } else if (missed >= 3) {
      suggestions.push({
        routineId: c.routineId,
        title: c.title,
        messageEn: `You missed ${c.title} ${missed} times. Move it 30 minutes earlier?`,
        messageBn: `${c.title} ${missed} বার মিস হয়েছে। ৩০ মিনিট এগিয়ে নেবেন?`,
      });
    }
  }
  return { highlights, suggestions };
}

// Micro-habit toggle (Atomic Habits "5-minute version").
// Records a low-energy completion as success without falsifying a full completion.
export function toMicroCompletion({ routineId, date }) {
  if (!routineId || !date) throw new Error('routineId and date are required');
  return { routineId, date, status: 'done', micro: true, durationMinutes: 5, label: '⚡ ৫ মিনিট' };
}

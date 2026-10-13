// Client wrapper for dynamic prayer-anchored schedules.
// Re-resolve "+Xm after <prayer>" against FRESH prayer times every day —
// prayer times in Bangladesh drift 1–2 min/week, so never cache a resolved
// clock time across days. Pure + dependency-free (mirrors @smart-routine/shared prayer.js).

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

function toMinutes(hhmm) {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}

function toClock(total) {
  const m = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function resolveAnchorTime(prayerTimes, anchor) {
  if (!PRAYERS.includes(anchor?.prayer)) throw new Error('Invalid prayer anchor');
  return toClock(toMinutes(prayerTimes[anchor.prayer]) + (Number(anchor.offsetMinutes) || 0));
}

// Schedule today's alerts for all anchored routines. Pass this week's
// calculation (e.g. from an aladhan API fetch or local table) — not last week's.
export function scheduleAnchoredRoutines(routines, prayerTimesToday) {
  return routines
    .filter((r) => r.anchor?.prayer)
    .map((r) => ({ ...r, startTime: resolveAnchorTime(prayerTimesToday, r.anchor) }));
}

export function getWaqtEndAlert(prayerTimes, nowMinutes, { enabled = true, windowMinutes = 15 } = {}) {
  if (!enabled || !prayerTimes) return null;
  const ordered = PRAYERS.map((p) => ({ name: p, min: toMinutes(prayerTimes[p]) })).sort((a, b) => a.min - b.min);
  const BN = { fajr: 'ফজর', dhuhr: 'যোহর', asr: 'আসর', maghrib: 'মাগরিব', isha: 'এশা' };
  for (let i = 0; i < ordered.length; i += 1) {
    const cur = ordered[i];
    const next = ordered[(i + 1) % ordered.length];
    const inWaqt = next.min > cur.min
      ? nowMinutes >= cur.min && nowMinutes < next.min
      : nowMinutes >= cur.min || nowMinutes < next.min;
    if (!inWaqt) continue;
    const remaining = (next.min - nowMinutes + 1440) % 1440;
    if (remaining <= windowMinutes && remaining > 0) {
      return { prayer: cur.name, remainingMinutes: remaining, messageBn: `${BN[cur.name]}ের ওয়াক্ত শেষ হতে ${remaining} মিনিট বাকি` };
    }
    return null;
  }
  return null;
}

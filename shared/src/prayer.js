// Dynamic prayer-anchored scheduling for South Asia (default Asia/Dhaka).
// A routine anchored like "+15m after Fajr" must be re-resolved every day
// from the current week's prayer calculation, never from a frozen static time.
//
// prayerTimes: { fajr, dhuhr, asr, maghrib, isha } as "HH:mm" strings.
// anchor: { prayer: 'fajr'|'dhuhr'|'asr'|'maghrib'|'isha', offsetMinutes: number }
// Returns "HH:mm" (wraps past midnight).

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const PRAYER_BN = { fajr: 'ফজর', dhuhr: 'যোহর', asr: 'আসর', maghrib: 'মাগরিব', isha: 'এশা' };

function toMinutes(hhmm) {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}

function toClock(total) {
  const m = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function isPrayerName(name) {
  return PRAYERS.includes(name);
}

// Resolve an anchor against *today's* prayer times. Callers must pass fresh
// times each day (prayer times drift 1-2 min/week in Bangladesh).
export function resolveAnchorTime(prayerTimes, anchor) {
  if (!prayerTimes || !anchor || !isPrayerName(anchor.prayer)) {
    throw new Error('Invalid prayer anchor');
  }
  const base = prayerTimes[anchor.prayer];
  if (typeof base !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(base)) {
    throw new Error('Invalid prayer time');
  }
  const offset = Number(anchor.offsetMinutes) || 0;
  return toClock(toMinutes(base) + offset);
}

// Gentle reminder 15 minutes before the current waqt ends (i.e. next prayer starts).
// Returns null when not inside the 15-min window or notifications are off.
// nowMinutes: minutes since midnight in user timezone.
export function getWaqtEndAlert(prayerTimes, nowMinutes, { enabled = true, windowMinutes = 15 } = {}) {
  if (!enabled) return null;
  if (!prayerTimes) return null;
  const ordered = PRAYERS.map((p) => ({ name: p, min: toMinutes(prayerTimes[p]) }))
    .filter((x) => Number.isFinite(x.min))
    .sort((a, b) => a.min - b.min);
  if (ordered.length === 0) return null;
  for (let i = 0; i < ordered.length; i += 1) {
    const next = ordered[(i + 1) % ordered.length];
    const current = ordered[i];
    // inside current waqt if now in [current.min, next.min)
    const inWaqt = next.min > current.min
      ? nowMinutes >= current.min && nowMinutes < next.min
      : nowMinutes >= current.min || nowMinutes < next.min;
    if (!inWaqt) continue;
    const endMin = next.min;
    // minutes until waqt end, wrapping midnight
    const remaining = (endMin - nowMinutes + 1440) % 1440;
    if (remaining <= windowMinutes && remaining > 0) {
      const bn = PRAYER_BN[current.name] || current.name;
      return {
        prayer: current.name,
        remainingMinutes: remaining,
        messageBn: `${bn}ের ওয়াক্ত শেষ হতে ${remaining} মিনিট বাকি`,
        messageEn: `${current.name} waqt ends in ${remaining} min`,
      };
    }
    return null;
  }
  return null;
}

// Low-data & budget-phone mode: defer avatars, kill heavy animations on
// saveData / 2G / high RTT. Self-contained, never throws.
'use client';

export function getLowDataMode(connection) {
  try {
    const conn = connection ?? globalThis?.navigator?.connection;
    const saveData = conn?.saveData === true;
    const slow = conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g'
      || (typeof conn?.rtt === 'number' && conn.rtt > 800);
    return { lowBandwidth: saveData || slow, saveData, slow };
  } catch {
    return { lowBandwidth: false, saveData: false, slow: false };
  }
}

export function lowDataClassName(mode) {
  const m = mode ?? getLowDataMode();
  return m.lowBandwidth ? 'low-data no-animations' : '';
}

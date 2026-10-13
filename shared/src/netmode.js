// Low-data / budget-phone helpers. Safe to call on server (no navigator → defaults).

// Returns { saveData, slowRtt, lowBandwidth } using Network Information API when available.
export function getNetworkMode(connection = globalThis?.navigator?.connection) {
  const saveData = connection?.saveData === true;
  const rtt = typeof connection?.rtt === 'number' ? connection.rtt : null;
  const effective = connection?.effectiveType || '';
  const slowRtt = (rtt !== null && rtt > 800) || effective === '2g' || effective === 'slow-2g';
  return { saveData, slowRtt, lowBandwidth: saveData || slowRtt };
}

// True when heavy animations should be disabled (user prefers reduced motion OR low bandwidth).
export function shouldReduceMotion({ prefersReduced = false, networkMode } = {}) {
  const low = networkMode?.lowBandwidth ?? getNetworkMode().lowBandwidth;
  return prefersReduced || low;
}

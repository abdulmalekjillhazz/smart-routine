// Audio/Adhan autoplay guard. Browsers block audio without a prior gesture —
// never throw uncaught; instead expose { blocked, unlock } for a "Tap to Unmute" banner.
// Dependency-free except react (already a client dep). No JSX so eslint stays clean.
import { useCallback, useEffect, useState, createElement } from 'react';

export function tryPlay(audio) {
  if (!audio || typeof audio.play !== 'function') return Promise.resolve({ ok: false, reason: 'no-audio' });
  try {
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      return p.then(() => ({ ok: true })).catch((err) => ({ ok: false, reason: err?.name || 'blocked' }));
    }
    return Promise.resolve({ ok: true });
  } catch (err) {
    return Promise.resolve({ ok: false, reason: err?.name || 'blocked' });
  }
}

export function useAudioUnlock(audioRef) {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    let cancelled = false;
    tryPlay(audioRef?.current).then((r) => {
      if (!cancelled && !r.ok) setBlocked(true);
    });
    return () => { cancelled = true; };
  }, [audioRef]);
  const unlock = useCallback(async () => {
    const r = await tryPlay(audioRef?.current);
    if (r.ok) setBlocked(false);
    return r;
  }, [audioRef]);
  return { blocked, unlock };
}

export function UnmuteBanner({ onUnlock }) {
  return createElement(
    'div',
    { role: 'alert', className: 'unmute-banner' },
    createElement('span', null, 'Audio is muted by the browser. '),
    createElement('button', { type: 'button', onClick: onUnlock }, 'Tap to Unmute')
  );
}

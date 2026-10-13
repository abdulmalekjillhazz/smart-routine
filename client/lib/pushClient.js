// Push subscription manager: checks on app launch whether the browser
// expired/rotated the subscription, re-subscribes and syncs to the server.
// Never throws — returns a status object so callers can ignore failures.

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function ensurePushSubscription({ getPublicKey, saveSubscription, vapidPublicKey } = {}) {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { ok: false, reason: 'unsupported' };
    }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    // If browser rotated/expired it, getSubscription() returns null → resubscribe.
    if (!sub) {
      const key = vapidPublicKey ?? (typeof getPublicKey === 'function' ? await getPublicKey() : null);
      if (!key) return { ok: false, reason: 'no-key' };
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return { ok: false, reason: 'denied' };
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }
    if (typeof saveSubscription === 'function') {
      await saveSubscription(sub.toJSON()); // POST /api/push/subscriptions
    }
    return { ok: true, endpoint: sub.endpoint };
  } catch (err) {
    return { ok: false, reason: 'error', message: err?.message };
  }
}

export function registerServiceWorker(swUrl = '/sw.js') {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker.register(swUrl).catch(() => null);
}

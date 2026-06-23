const STORAGE_KEYS = {
  ROUTINES: 'smart_routines',
  SETTINGS: 'smart_settings',
  ANALYTICS: 'smart_analytics',
}

export function getStorage(key) {
  if (typeof window === 'undefined') return null
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch { return null }
}

export function setStorage(key, value) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) { console.error('Storage error:', e) }
}

export function removeStorage(key) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(key)
}

export { STORAGE_KEYS }

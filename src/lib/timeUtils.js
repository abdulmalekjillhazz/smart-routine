export function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function getCurrentMinutes() {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export function getProgressPercent(startTime, endTime) {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  const current = getCurrentMinutes()
  if (current < start) return 0
  if (current > end) return 100
  return Math.round(((current - start) / (end - start)) * 100)
}

export function isTimeInRange(startTime, endTime) {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  const current = getCurrentMinutes()
  return current >= start && current < end
}

export function getTimeUntil(timeStr) {
  const target = timeToMinutes(timeStr)
  const current = getCurrentMinutes()
  const diff = target - current
  if (diff < 0) return null
  return diff
}

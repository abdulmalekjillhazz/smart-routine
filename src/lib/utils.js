export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key]
    result[group] = result[group] || []
    result[group].push(item)
    return result
  }, {})
}

export function sortByTime(routines) {
  return [...routines].sort((a, b) => {
    const aMin = a.startTime ? parseInt(a.startTime.replace(':', '')) : 0
    const bMin = b.startTime ? parseInt(b.startTime.replace(':', '')) : 0
    return aMin - bMin
  })
}

export function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

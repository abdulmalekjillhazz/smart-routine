'use client'
import { useState, useEffect } from 'react'
import { timeToMinutes, getCurrentMinutes } from '@/lib/timeUtils'

export function useCountdown(targetTime) {
  const [remaining, setRemaining] = useState(null)

  useEffect(() => {
    if (!targetTime) return

    const update = () => {
      const target = timeToMinutes(targetTime)
      const current = getCurrentMinutes()
      const diff = target - current
      setRemaining(diff > 0 ? diff : null)
    }

    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [targetTime])

  return remaining
}

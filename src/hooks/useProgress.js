'use client'
import { useState, useEffect, useMemo } from 'react'
import { getCurrentMinutes, timeToMinutes } from '@/lib/timeUtils'

export function useProgress(routines) {
  const [currentTime, setCurrentTime] = useState(getCurrentMinutes())

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(getCurrentMinutes()), 60000)
    return () => clearInterval(interval)
  }, [])

  return useMemo(() => {
    const now = new Date()
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const today = days[now.getDay()]
    const todayRoutines = routines.filter(r => r.days?.includes(today))
    const completed = todayRoutines.filter(r => r.endTime && timeToMinutes(r.endTime) < currentTime).length
    const total = todayRoutines.length
    return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }, [routines, currentTime])
}

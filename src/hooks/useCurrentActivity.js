'use client'
import { useMemo } from 'react'
import { isTimeInRange } from '@/lib/timeUtils'

export function useCurrentActivity(routines) {
  return useMemo(() => {
    const now = new Date()
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const today = days[now.getDay()]
    
    return routines.find(r => 
      r.days?.includes(today) && 
      r.startTime && r.endTime &&
      isTimeInRange(r.startTime, r.endTime)
    ) || null
  }, [routines])
}

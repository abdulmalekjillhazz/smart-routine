'use client'
import { defaultCategories } from '@/data/defaultCategories'
import { timeToMinutes } from '@/lib/timeUtils'
import { cn } from '@/lib/cn'

export function DayOverviewStrip({ routines }) {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const today = days[new Date().getDay()]
  const todayRoutines = routines
    .filter(r => r.days?.includes(today) && r.startTime && r.endTime)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

  const START_HOUR = 6
  const END_HOUR = 24
  const TOTAL_MINS = (END_HOUR - START_HOUR) * 60

  return (
    <div>
      <h3 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">Today's Schedule</h3>
      <div className="relative h-8 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        {todayRoutines.map(r => {
          const cat = defaultCategories.find(c => c.id === r.category)
          const start = Math.max(0, timeToMinutes(r.startTime) - START_HOUR * 60)
          const end = Math.min(TOTAL_MINS, timeToMinutes(r.endTime) - START_HOUR * 60)
          const left = (start / TOTAL_MINS) * 100
          const width = ((end - start) / TOTAL_MINS) * 100
          return (
            <div key={r.id}
              title={r.title}
              className="absolute top-0 h-full opacity-80 hover:opacity-100 transition-opacity"
              style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%`, backgroundColor: cat?.color || '#3b82f6' }}
            />
          )
        })}
        {/* Now indicator */}
        <NowIndicator startHour={START_HOUR} totalMins={TOTAL_MINS} />
      </div>
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>6 AM</span>
        <span>12 PM</span>
        <span>6 PM</span>
        <span>12 AM</span>
      </div>
    </div>
  )
}

function NowIndicator({ startHour, totalMins }) {
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes() - startHour * 60
  if (mins < 0 || mins > totalMins) return null
  const left = (mins / totalMins) * 100
  return (
    <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg" style={{ left: `${left}%` }} />
  )
}

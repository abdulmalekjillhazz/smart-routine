'use client'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useRoutineStore } from '@/store/routineStore'
import { defaultCategories } from '@/data/defaultCategories'
import { timeToMinutes, getCurrentMinutes } from '@/lib/timeUtils'
import { sortByTime } from '@/lib/utils'
import { cn } from '@/lib/cn'

function TimelineItem({ routine, isCurrent, isPast }) {
  const category = defaultCategories.find(c => c.id === routine.category)
  return (
    <div className={cn('flex gap-4 pb-6 last:pb-0', isPast && 'opacity-50')}>
      <div className="flex flex-col items-center">
        <div className={cn('w-4 h-4 rounded-full border-2 flex-shrink-0 mt-1',
          isCurrent ? 'bg-blue-500 border-blue-500 ring-4 ring-blue-100 dark:ring-blue-900' :
          isPast ? 'bg-slate-300 border-slate-300' : 'bg-white border-slate-300 dark:border-slate-600'
        )} />
        <div className="w-0.5 bg-slate-200 dark:bg-slate-700 flex-1 mt-2" />
      </div>
      <div className={cn('flex-1 pb-2 rounded-xl p-3 -mt-0.5',
        isCurrent ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' :
        'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700'
      )}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span>{category?.emoji}</span>
              <h4 className="font-medium text-slate-900 dark:text-white text-sm">{routine.title}</h4>
              {isCurrent && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Now</span>}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {routine.startTime} – {routine.endTime}
            </p>
          </div>
        </div>
        {routine.description && <p className="text-xs text-slate-500 mt-2">{routine.description}</p>}
      </div>
    </div>
  )
}

export default function TimelinePage() {
  const { routines } = useRoutineStore()
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const today = days[new Date().getDay()]
  const sorted = sortByTime(routines.filter(r => r.days?.includes(today)))
  const current = getCurrentMinutes()

  return (
    <PageWrapper title="Timeline">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-6">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h2>
          {sorted.length === 0 ? (
            <p className="text-center text-slate-400 py-12">No routines scheduled for today</p>
          ) : (
            <div>
              {sorted.map(r => (
                <TimelineItem
                  key={r.id}
                  routine={r}
                  isCurrent={r.startTime && r.endTime && timeToMinutes(r.startTime) <= current && timeToMinutes(r.endTime) > current}
                  isPast={r.endTime && timeToMinutes(r.endTime) < current}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}

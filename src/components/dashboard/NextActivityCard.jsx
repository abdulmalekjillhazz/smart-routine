'use client'
import { Card } from '@/components/ui/Card'
import { defaultCategories } from '@/data/defaultCategories'
import { Clock, ArrowRight } from 'lucide-react'
import { timeToMinutes, getCurrentMinutes } from '@/lib/timeUtils'

export function NextActivityCard({ routines }) {
  const current = getCurrentMinutes()
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const today = days[new Date().getDay()]
  
  const next = routines
    .filter(r => r.days?.includes(today) && r.startTime && timeToMinutes(r.startTime) > current)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))[0]

  const category = defaultCategories.find(c => c.id === next?.category)

  if (!next) {
    return (
      <Card>
        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Clock size={14} />
          No more activities today
        </p>
      </Card>
    )
  }

  const minutesUntil = timeToMinutes(next.startTime) - current

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
            <Clock size={12} />
            Up Next
          </p>
          <h3 className="font-semibold text-slate-900 dark:text-white">{next.title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {next.startTime} · in {minutesUntil}m
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl">{category?.emoji || '📋'}</span>
          <ArrowRight size={16} className="text-slate-400" />
        </div>
      </div>
    </Card>
  )
}

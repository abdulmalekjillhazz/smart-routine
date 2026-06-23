'use client'
import { RoutineCard } from './RoutineCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { sortByTime } from '@/lib/utils'
import { Plus } from 'lucide-react'

export function RoutineList({ routines, onUpdate, onDelete }) {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const today = days[new Date().getDay()]
  const todayRoutines = sortByTime(routines.filter(r => r.days?.includes(today)))

  if (todayRoutines.length === 0) {
    return (
      <EmptyState
        icon="📅"
        title="No routines today"
        description="Add your first routine to get started with your smart schedule."
      />
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Today's Routines</h3>
      {todayRoutines.map(r => (
        <RoutineCard key={r.id} routine={r} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
    </div>
  )
}

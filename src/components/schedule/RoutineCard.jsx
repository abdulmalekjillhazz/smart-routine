'use client'
import { useState } from 'react'
import { defaultCategories } from '@/data/defaultCategories'
import { Edit2, Trash2, MoreVertical } from 'lucide-react'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { RoutineForm } from './RoutineForm'
import { isTimeInRange, timeToMinutes, getCurrentMinutes } from '@/lib/timeUtils'
import { cn } from '@/lib/cn'

function getStatus(routine) {
  if (!routine.startTime || !routine.endTime) return 'upcoming'
  const current = getCurrentMinutes()
  const start = timeToMinutes(routine.startTime)
  const end = timeToMinutes(routine.endTime)
  if (current > end) return 'completed'
  if (isTimeInRange(routine.startTime, routine.endTime)) return 'current'
  return 'upcoming'
}

export function RoutineCard({ routine, onUpdate, onDelete }) {
  const [showEdit, setShowEdit] = useState(false)
  const category = defaultCategories.find(c => c.id === routine.category)
  const status = getStatus(routine)

  return (
    <>
      <div className={cn(
        'flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border transition-all hover:shadow-sm',
        status === 'current' ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10' : 'border-slate-200 dark:border-slate-700',
        status === 'completed' ? 'opacity-60' : ''
      )}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: `${category?.color}20` }}>
          {category?.emoji || '📋'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="font-medium text-slate-900 dark:text-white truncate">{routine.title}</h4>
            <StatusBadge status={status} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {routine.startTime} – {routine.endTime}
            {routine.days?.length < 7 && ` · ${routine.days?.join(', ')}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowEdit(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-500 transition-colors">
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(routine.id)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <RoutineForm isOpen={showEdit} onClose={() => setShowEdit(false)}
        initial={routine} onSave={(data) => { onUpdate(routine.id, data); setShowEdit(false) }} />
    </>
  )
}

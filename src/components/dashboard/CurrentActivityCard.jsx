'use client'
import { Card } from '@/components/ui/Card'
import { defaultCategories } from '@/data/defaultCategories'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { getProgressPercent } from '@/lib/timeUtils'
import { Activity } from 'lucide-react'

export function CurrentActivityCard({ activity }) {
  const category = defaultCategories.find(c => c.id === activity?.category)
  const progress = activity ? getProgressPercent(activity.startTime, activity.endTime) : 0

  if (!activity) {
    return (
      <Card className="border-dashed">
        <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500">
          <Activity size={20} />
          <div>
            <p className="font-medium text-sm">No active routine</p>
            <p className="text-xs">Enjoy your free time!</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="border-l-4" style={{ borderLeftColor: category?.color || '#3b82f6' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Currently Active</p>
          <h3 className="font-semibold text-slate-900 dark:text-white">{activity.title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {activity.startTime} - {activity.endTime}
          </p>
        </div>
        <span className="text-2xl">{category?.emoji || '📋'}</span>
      </div>
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <ProgressBar value={progress} color={category?.color || '#3b82f6'} />
      </div>
    </Card>
  )
}

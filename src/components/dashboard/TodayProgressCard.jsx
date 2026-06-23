'use client'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useProgress } from '@/hooks/useProgress'
import { CheckCircle2, Circle } from 'lucide-react'

export function TodayProgressCard({ routines }) {
  const { completed, total, percent } = useProgress(routines)
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900 dark:text-white">Today‘s Progress</h3>
        <span className="text-2xl font-bold text-blue-500">{percent}%</span>
      </div>
      <ProgressBar value={percent} max={100} className="mb-3" />
      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-green-500" />
          <span>{completed} done</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle size={14} />
          <span>{total - completed} remaining</span>
        </div>
      </div>
    </Card>
  )
}

'use client'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { TodayProgressCard } from './TodayProgressCard'
import { CurrentActivityCard } from './CurrentActivityCard'
import { NextActivityCard } from './NextActivityCard'
import { LiveCountdownCard } from './LiveCountdownCard'
import { DayOverviewStrip } from './DayOverviewStrip'
import { QuickActionsBar } from './QuickActionsBar'
import { FocusWidget } from './FocusWidget'
import { RoutineList } from '@/components/schedule/RoutineList'
import { useCurrentActivity } from '@/hooks/useCurrentActivity'
import { useRoutineStore } from '@/store/routineStore'
import { getRandomMessage } from '@/data/motivationalMessages'
import { useMemo } from 'react'

export default function DashboardPage() {
  const { routines, addRoutine, updateRoutine, deleteRoutine } = useRoutineStore()
  const current = useCurrentActivity(routines)
  const quote = useMemo(() => getRandomMessage(), [])

  return (
    <PageWrapper title="Dashboard">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Quote */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white">
          <p className="text-sm font-medium opacity-80 mb-1">Daily Motivation</p>
          <p className="text-lg font-medium">{quote}</p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Today</h2>
          <QuickActionsBar onAdd={addRoutine} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <TodayProgressCard routines={routines} />
          <CurrentActivityCard activity={current} />
          {current ? <LiveCountdownCard activity={current} /> : <NextActivityCard routines={routines} />}
        </div>

        {/* Day overview */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <DayOverviewStrip routines={routines} />
        </div>

        {/* Two column: routines + focus */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RoutineList routines={routines} onUpdate={updateRoutine} onDelete={deleteRoutine} />
          </div>
          <div>
            <FocusWidget />
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}

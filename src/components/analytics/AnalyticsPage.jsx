'use client'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useRoutineStore } from '@/store/routineStore'
import { defaultCategories } from '@/data/defaultCategories'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'

export default function AnalyticsPage() {
  const { routines } = useRoutineStore()

  const categoryStats = defaultCategories.map(cat => {
    const catRoutines = routines.filter(r => r.category === cat.id)
    const totalMins = catRoutines.reduce((sum, r) => {
      if (!r.startTime || !r.endTime) return sum
      const [sh, sm] = r.startTime.split(':').map(Number)
      const [eh, em] = r.endTime.split(':').map(Number)
      return sum + Math.max(0, (eh * 60 + em) - (sh * 60 + sm))
    }, 0)
    return { ...cat, count: catRoutines.length, totalMins }
  }).filter(c => c.count > 0)

  const totalMins = categoryStats.reduce((s, c) => s + c.totalMins, 0)
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const today = days[new Date().getDay()]
  const todayCount = routines.filter(r => r.days?.includes(today)).length

  return (
    <PageWrapper title="Analytics">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Routines', value: routines.length, emoji: '📋' },
            { label: 'Today', value: todayCount, emoji: '📅' },
            { label: 'Daily Hours', value: `${(totalMins/60).toFixed(1)}h`, emoji: '⏱️' },
            { label: 'Categories', value: categoryStats.length, emoji: '🏷️' },
          ].map(stat => (
            <Card key={stat.label} className="text-center">
              <p className="text-2xl mb-1">{stat.emoji}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
            </Card>
          ))}
        </div>

        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Time by Category</h3>
          <div className="space-y-4">
            {categoryStats.sort((a, b) => b.totalMins - a.totalMins).map(cat => (
              <div key={cat.id}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                    {cat.emoji} {cat.name}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {cat.count} routines · {(cat.totalMins/60).toFixed(1)}h/day
                  </span>
                </div>
                <ProgressBar value={cat.totalMins} max={totalMins || 1} color={cat.color} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Weekly Coverage</h3>
          <div className="grid grid-cols-7 gap-2">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => {
              const count = routines.filter(r => r.days?.includes(day)).length
              return (
                <div key={day} className="text-center">
                  <p className="text-xs text-slate-500 mb-2">{day}</p>
                  <div className="mx-auto w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: count > 0 ? '#3b82f620' : '#f1f5f9', color: count > 0 ? '#3b82f6' : '#94a3b8' }}>
                    {count}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </PageWrapper>
  )
}

'use client'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useRoutineStore } from '@/store/routineStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { generateId } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'

const templates = [
  {
    id: 'morning-warrior',
    name: 'Morning Warrior',
    description: 'Productive morning routine to kickstart your day',
    emoji: '🌅',
    routines: [
      { title: 'Wake Up & Hydrate', startTime: '05:30', endTime: '05:45', category: 'health', days: ['Mon','Tue','Wed','Thu','Fri'] },
      { title: 'Exercise', startTime: '05:45', endTime: '06:30', category: 'health', days: ['Mon','Tue','Wed','Thu','Fri'] },
      { title: 'Shower & Prep', startTime: '06:30', endTime: '07:00', category: 'personal', days: ['Mon','Tue','Wed','Thu','Fri'] },
      { title: 'Breakfast', startTime: '07:00', endTime: '07:30', category: 'meals', days: ['Mon','Tue','Wed','Thu','Fri'] },
    ]
  },
  {
    id: 'work-life',
    name: 'Work-Life Balance',
    description: 'Balanced routine for productive professionals',
    emoji: '⚖️',
    routines: [
      { title: 'Deep Work Block', startTime: '09:00', endTime: '12:00', category: 'work', days: ['Mon','Tue','Wed','Thu','Fri'] },
      { title: 'Lunch & Walk', startTime: '12:00', endTime: '13:00', category: 'health', days: ['Mon','Tue','Wed','Thu','Fri'] },
      { title: 'Meetings / Tasks', startTime: '13:00', endTime: '17:00', category: 'work', days: ['Mon','Tue','Wed','Thu','Fri'] },
      { title: 'Family Time', startTime: '18:00', endTime: '20:00', category: 'social', days: ['Mon','Tue','Wed','Thu','Fri'] },
      { title: 'Reading', startTime: '21:00', endTime: '22:00', category: 'learning', days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
    ]
  },
  {
    id: 'student',
    name: 'Student Focus',
    description: 'Optimized for learning and academic performance',
    emoji: '📚',
    routines: [
      { title: 'Morning Study', startTime: '07:00', endTime: '09:00', category: 'learning', days: ['Mon','Tue','Wed','Thu','Fri'] },
      { title: 'Classes', startTime: '09:00', endTime: '13:00', category: 'learning', days: ['Mon','Tue','Wed','Thu','Fri'] },
      { title: 'Revision', startTime: '15:00', endTime: '17:00', category: 'learning', days: ['Mon','Tue','Wed','Thu','Fri'] },
      { title: 'Exercise', startTime: '17:00', endTime: '18:00', category: 'health', days: ['Mon','Wed','Fri'] },
    ]
  },
  {
    id: 'wellness',
    name: 'Wellness First',
    description: 'Prioritize health and mental well-being',
    emoji: '🧘',
    routines: [
      { title: 'Meditation', startTime: '06:30', endTime: '07:00', category: 'personal', days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
      { title: 'Yoga / Exercise', startTime: '07:00', endTime: '08:00', category: 'health', days: ['Mon','Wed','Fri','Sun'] },
      { title: 'Healthy Meals Prep', startTime: '08:00', endTime: '08:30', category: 'meals', days: ['Mon','Wed','Fri'] },
      { title: 'Evening Walk', startTime: '19:00', endTime: '19:45', category: 'health', days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
      { title: 'Sleep Routine', startTime: '22:00', endTime: '22:30', category: 'sleep', days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
    ]
  },
]

export default function TemplatesPage() {
  const { routines, addRoutine } = useRoutineStore()

  const applyTemplate = (template) => {
    template.routines.forEach(r => addRoutine({ ...r, priority: 'medium', description: '', id: undefined }))
    alert(`Applied "${template.name}" — ${template.routines.length} routines added!`)
  }

  return (
    <PageWrapper title="Templates">
      <div className="max-w-3xl mx-auto">
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          Jumpstart your routine with a pre-built template. You can customize it after applying.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.map(template => (
            <Card key={template.id} className="flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl">{template.emoji}</span>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{template.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{template.description}</p>
                </div>
              </div>
              <div className="space-y-1 mb-4 flex-1">
                {template.routines.slice(0, 3).map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
                    <span>{r.title} · {r.startTime}–{r.endTime}</span>
                  </div>
                ))}
                {template.routines.length > 3 && (
                  <p className="text-xs text-slate-400 pl-5">+{template.routines.length - 3} more</p>
                )}
              </div>
              <Button onClick={() => applyTemplate(template)} size="sm" className="w-full justify-center">
                Apply Template
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  )
}

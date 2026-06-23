'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { defaultCategories } from '@/data/defaultCategories'

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const PRIORITIES = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export function RoutineForm({ isOpen, onClose, onSave, initial = {} }) {
  const [form, setForm] = useState({
    title: '', startTime: '09:00', endTime: '10:00',
    category: 'work', priority: 'medium', description: '',
    days: ['Mon','Tue','Wed','Thu','Fri'],
    ...initial
  })

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))
  const toggleDay = (day) => setForm(f => ({
    ...f, days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day]
  }))

  const handleSave = () => {
    if (!form.title.trim()) return
    onSave(form)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial.id ? 'Edit Routine' : 'Add Routine'}>
      <div className="space-y-4">
        <Input label="Title" placeholder="e.g. Morning Workout" value={form.title} onChange={set('title')} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Start Time" type="time" value={form.startTime} onChange={set('startTime')} />
          <Input label="End Time" type="time" value={form.endTime} onChange={set('endTime')} />
        </div>
        <Select label="Category" value={form.category} onChange={set('category')}
          options={defaultCategories.map(c => ({ value: c.id, label: `${c.emoji} ${c.name}` }))} />
        <Select label="Priority" value={form.priority} onChange={set('priority')} options={PRIORITIES} />
        <Input label="Description (optional)" placeholder="Details..." value={form.description} onChange={set('description')} />
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Repeat on</p>
          <div className="flex gap-2 flex-wrap">
            {DAYS.map(day => (
              <button key={day} onClick={() => toggleDay(day)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  form.days.includes(day)
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                {day}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} className="flex-1">Save</Button>
        </div>
      </div>
    </Modal>
  )
}

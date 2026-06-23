'use client'
import { useState } from 'react'
import { Plus, Calendar, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { RoutineForm } from '@/components/schedule/RoutineForm'

export function QuickActionsBar({ onAdd }) {
  const [showForm, setShowForm] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <Button onClick={() => setShowForm(true)} size="sm">
        <Plus size={16} />
        Add Routine
      </Button>
      <RoutineForm isOpen={showForm} onClose={() => setShowForm(false)} onSave={(data) => { onAdd(data); setShowForm(false) }} />
    </div>
  )
}

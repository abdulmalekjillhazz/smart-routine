'use client'
import { useLocalStorage } from './useLocalStorage'
import { defaultRoutines } from '@/data/defaultRoutines'
import { generateId } from '@/lib/utils'

export function useRoutineStorage() {
  const [routines, setRoutines] = useLocalStorage('smart_routines', defaultRoutines)

  const addRoutine = (routine) => {
    setRoutines(prev => [...prev, { ...routine, id: generateId() }])
  }

  const updateRoutine = (id, updates) => {
    setRoutines(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
  }

  const deleteRoutine = (id) => {
    setRoutines(prev => prev.filter(r => r.id !== id))
  }

  const reorderRoutines = (newOrder) => {
    setRoutines(newOrder)
  }

  return { routines, addRoutine, updateRoutine, deleteRoutine, reorderRoutines }
}

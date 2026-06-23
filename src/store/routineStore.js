import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultRoutines } from '@/data/defaultRoutines'
import { generateId } from '@/lib/utils'

export const useRoutineStore = create(
  persist(
    (set) => ({
      routines: defaultRoutines,
      
      addRoutine: (routine) => set((state) => ({
        routines: [...state.routines, { ...routine, id: generateId() }]
      })),
      
      updateRoutine: (id, updates) => set((state) => ({
        routines: state.routines.map(r => r.id === id ? { ...r, ...updates } : r)
      })),
      
      deleteRoutine: (id) => set((state) => ({
        routines: state.routines.filter(r => r.id !== id)
      })),
      
      setRoutines: (routines) => set({ routines }),
    }),
    { name: 'smart-routines' }
  )
)

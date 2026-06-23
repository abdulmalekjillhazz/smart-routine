import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set) => ({
      theme: 'light',
      notifications: true,
      startOfDay: '06:00',
      endOfDay: '23:00',
      userName: 'User',
      
      setTheme: (theme) => set({ theme }),
      setNotifications: (notifications) => set({ notifications }),
      setUserName: (userName) => set({ userName }),
      updateSettings: (updates) => set(updates),
    }),
    { name: 'smart-settings' }
  )
)

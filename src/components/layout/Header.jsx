'use client'
import { Moon, Sun, Bell } from 'lucide-react'
import { useDarkMode } from '@/hooks/useDarkMode'

export function Header({ title = 'Dashboard' }) {
  const { isDark, toggle } = useDarkMode()
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h1>
      <div className="flex items-center gap-2">
        <button onClick={toggle} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-colors">
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-colors">
          <Bell size={18} />
        </button>
      </div>
    </header>
  )
}

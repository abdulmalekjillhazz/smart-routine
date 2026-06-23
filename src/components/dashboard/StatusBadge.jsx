import { cn } from '@/lib/cn'

const statusConfig = {
  current: { label: 'In Progress', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  completed: { label: 'Completed', className: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' },
  missed: { label: 'Missed', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

export function StatusBadge({ status = 'upcoming' }) {
  const config = statusConfig[status] || statusConfig.upcoming
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', config.className)}>
      {config.label}
    </span>
  )
}

import { cn } from '@/lib/cn'
export function Card({ children, className, ...props }) {
  return (
    <div className={cn('bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4', className)} {...props}>
      {children}
    </div>
  )
}

import { cn } from '@/lib/cn'
export function ProgressBar({ value=0, max=100, color='#3b82f6', className }) {
  const percent = Math.min(100, Math.max(0, (value/max)*100))
  return (
    <div className={cn('w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden', className)}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: color }} />
    </div>
  )
}

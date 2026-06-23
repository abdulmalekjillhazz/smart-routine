import { cn } from '@/lib/cn'
export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className={cn('relative w-11 h-6 rounded-full transition-colors cursor-pointer', checked ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-600')} onClick={() => onChange(!checked)}>
        <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
      </div>
      {label && <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>}
    </label>
  )
}

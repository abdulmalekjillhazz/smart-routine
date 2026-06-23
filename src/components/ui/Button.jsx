import { cn } from '@/lib/cn'
const variants = {
  primary: 'bg-blue-500 hover:bg-blue-600 text-white',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
  ghost: 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300',
}
const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }
export function Button({ children, variant='primary', size='md', className, ...props }) {
  return (
    <button className={cn('rounded-lg font-medium transition-colors inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer', variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  )
}

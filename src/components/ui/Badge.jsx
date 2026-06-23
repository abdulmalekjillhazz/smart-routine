import { cn } from '@/lib/cn'
export function Badge({ children, color='#3b82f6', className }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium text-white inline-flex items-center', className)} style={{ backgroundColor: color }}>
      {children}
    </span>
  )
}

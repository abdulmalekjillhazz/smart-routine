'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Clock, BarChart2, BookTemplate, Settings } from 'lucide-react'
import { cn } from '@/lib/cn'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Home' },
  { href: '/timeline', icon: Clock, label: 'Timeline' },
  { href: '/analytics', icon: BarChart2, label: 'Analytics' },
  { href: '/templates', icon: BookTemplate, label: 'Templates' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex z-40">
      {navItems.map(({ href, icon: Icon, label }) => (
        <Link key={href} href={href}
          className={cn(
            'flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors',
            pathname === href
              ? 'text-blue-500'
              : 'text-slate-500 dark:text-slate-400'
          )}>
          <Icon size={20} />
          <span className="mt-1">{label}</span>
        </Link>
      ))}
    </nav>
  )
}

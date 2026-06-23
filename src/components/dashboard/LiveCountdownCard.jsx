'use client'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Timer } from 'lucide-react'

export function LiveCountdownCard({ activity }) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!activity?.endTime) return
    const update = () => {
      const now = new Date()
      const [h, m] = activity.endTime.split(':').map(Number)
      const end = new Date()
      end.setHours(h, m, 0, 0)
      const diff = Math.max(0, Math.floor((end - now) / 1000))
      setSeconds(diff)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [activity])

  if (!activity) return null

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const fmt = (n) => String(n).padStart(2, '0')

  return (
    <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-0 text-white">
      <div className="flex items-center gap-2 mb-2 opacity-80 text-sm">
        <Timer size={14} />
        <span>Time Remaining</span>
      </div>
      <div className="text-3xl font-mono font-bold">
        {h > 0 && <span>{fmt(h)}:</span>}
        <span>{fmt(m)}:</span>
        <span>{fmt(s)}</span>
      </div>
      <p className="text-sm mt-1 opacity-80">{activity.title}</p>
    </Card>
  )
}

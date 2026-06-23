'use client'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Play, Pause, RotateCcw } from 'lucide-react'

const FOCUS_MINS = 25
const BREAK_MINS = 5

export function FocusWidget() {
  const [seconds, setSeconds] = useState(FOCUS_MINS * 60)
  const [running, setRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [session, setSession] = useState(0)

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          setRunning(false)
          if (!isBreak) {
            setSession(prev => prev + 1)
            setIsBreak(true)
            return BREAK_MINS * 60
          } else {
            setIsBreak(false)
            return FOCUS_MINS * 60
          }
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [running, isBreak])

  const reset = () => { setRunning(false); setSeconds(FOCUS_MINS * 60); setIsBreak(false) }
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  const fmt = (n) => String(n).padStart(2, '0')

  return (
    <Card>
      <div className="text-center">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
          {isBreak ? '☕ Break Time' : '🎯 Focus Session'} · #{session + 1}
        </p>
        <div className="text-4xl font-mono font-bold text-slate-900 dark:text-white mb-4">
          {fmt(m)}:{fmt(s)}
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={reset}><RotateCcw size={16} /></Button>
          <Button onClick={() => setRunning(r => !r)} size="md">
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? 'Pause' : 'Start'}
          </Button>
        </div>
      </div>
    </Card>
  )
}

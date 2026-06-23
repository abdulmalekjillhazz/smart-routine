'use client'
import { useState, useEffect } from 'react'

export function useDarkMode() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('dark-mode')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const enabled = saved ? saved === 'true' : prefersDark
    setIsDark(enabled)
    document.documentElement.classList.toggle('dark', enabled)
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('dark-mode', String(next))
    document.documentElement.classList.toggle('dark', next)
  }

  return { isDark, toggle }
}

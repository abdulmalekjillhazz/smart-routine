'use client'
import { useState, useEffect } from 'react'

export function useNotifications() {
  const [permission, setPermission] = useState('default')

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result
    }
    return 'denied'
  }

  const notify = (title, options = {}) => {
    if (permission === 'granted') {
      new Notification(title, { icon: '/icon.png', ...options })
    }
  }

  return { permission, requestPermission, notify }
}

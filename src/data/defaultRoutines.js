import { generateId } from '@/lib/utils'

export const defaultRoutines = [
  { id: generateId(), title: 'Morning Exercise', startTime: '06:00', endTime: '06:45', category: 'health', priority: 'high', description: 'Workout or yoga', days: ['Mon','Tue','Wed','Thu','Fri'] },
  { id: generateId(), title: 'Breakfast', startTime: '07:00', endTime: '07:30', category: 'meals', priority: 'high', description: 'Healthy breakfast', days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
  { id: generateId(), title: 'Deep Work', startTime: '09:00', endTime: '12:00', category: 'work', priority: 'high', description: 'Focused work session', days: ['Mon','Tue','Wed','Thu','Fri'] },
  { id: generateId(), title: 'Lunch Break', startTime: '12:00', endTime: '13:00', category: 'meals', priority: 'medium', description: 'Lunch and rest', days: ['Mon','Tue','Wed','Thu','Fri'] },
  { id: generateId(), title: 'Reading', startTime: '21:00', endTime: '22:00', category: 'learning', priority: 'medium', description: 'Read books or articles', days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
  { id: generateId(), title: 'Sleep', startTime: '22:30', endTime: '06:00', category: 'sleep', priority: 'high', description: 'Quality sleep', days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
]

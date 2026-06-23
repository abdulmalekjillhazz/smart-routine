# Smart Routine 🗓️

A smart daily routine tracker built with **Next.js 14**, **Zustand**, and **Tailwind CSS**.

## Features

- 📊 **Dashboard** — Live countdown, today's progress, current activity
- ⏱️ **Timeline** — Visual timeline of your daily schedule
- 📈 **Analytics** — Time breakdown by category, weekly coverage
- 📋 **Templates** — Pre-built routine templates (Morning Warrior, Work-Life Balance, etc.)
- ⚙️ **Settings** — Dark mode, notifications, day start/end times
- 🎯 **Focus Timer** — Built-in Pomodoro timer
- 💾 **Persistent Storage** — All data saved to localStorage via Zustand

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── analytics/page.jsx
│   ├── settings/page.jsx
│   ├── templates/page.jsx
│   ├── timeline/page.jsx
│   └── api/schedules/      # REST API route
├── components/
│   ├── dashboard/          # Dashboard widgets
│   ├── layout/             # Sidebar, Header, BottomNav
│   ├── schedule/           # Routine cards & form
│   ├── timeline/           # Timeline view
│   ├── analytics/          # Analytics charts
│   ├── settings/           # Settings page
│   ├── templates/          # Template browser
│   └── ui/                 # Reusable UI primitives
├── hooks/                  # Custom React hooks
├── store/                  # Zustand stores
├── lib/                    # Utilities (timeUtils, storage, cn)
└── data/                   # Default data & categories
```

## Tech Stack

- **Next.js 14** (App Router)
- **React 18**
- **Zustand** (state management with localStorage persistence)
- **Tailwind CSS** (styling + dark mode)
- **Lucide React** (icons)
# smart-routine

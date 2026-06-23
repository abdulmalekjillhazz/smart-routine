'use client'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useSettingsStore } from '@/store/settingsStore'
import { useDarkMode } from '@/hooks/useDarkMode'
import { Toggle } from '@/components/ui/Toggle'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

export default function SettingsPage() {
  const settings = useSettingsStore()
  const { isDark, toggle: toggleDark } = useDarkMode()

  return (
    <PageWrapper title="Settings">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Profile</h3>
          <Input label="Your Name" value={settings.userName} onChange={e => settings.updateSettings({ userName: e.target.value })} />
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Appearance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-slate-900 dark:text-white">Dark Mode</p>
                <p className="text-xs text-slate-500">Use dark theme</p>
              </div>
              <Toggle checked={isDark} onChange={toggleDark} />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Day Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start of Day" type="time" value={settings.startOfDay}
              onChange={e => settings.updateSettings({ startOfDay: e.target.value })} />
            <Input label="End of Day" type="time" value={settings.endOfDay}
              onChange={e => settings.updateSettings({ endOfDay: e.target.value })} />
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Notifications</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-slate-900 dark:text-white">Enable Notifications</p>
              <p className="text-xs text-slate-500">Get reminders for upcoming routines</p>
            </div>
            <Toggle checked={settings.notifications} onChange={(v) => settings.updateSettings({ notifications: v })} />
          </div>
        </Card>

        <p className="text-center text-xs text-slate-400">Smart Routine v0.1.0</p>
      </div>
    </PageWrapper>
  )
}

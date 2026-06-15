import { useState } from 'react'
import { Settings as SettingsIcon, Sun, Moon, Monitor, Bell, Volume2, RefreshCw, Grid3x3, Layers, RotateCcw, Trash2, Download, Sparkles } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useSettings, useTheme, useHistory, useScanResults, useMonitors } from '@/lib/store'
import { useToast } from '@/components/Toast'
import { cn } from '@/lib/utils'
import { TOOL_CATALOG } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
  const { settings, updateSettings, resetSettings } = useSettings()
  const { theme, setTheme } = useTheme()
  const { clearAllHistory } = useHistory()
  const { clearAlerts } = useScanResults()
  const { monitors } = useMonitors()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const exportAll = () => {
    const data = {
      settings,
      history: localStorage.getItem('mailtools_history'),
      scan_results: localStorage.getItem('mailtools_scan_results'),
      scan_alerts: localStorage.getItem('mailtools_scan_alerts'),
      exported_at: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mailforge-backup-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Backup downloaded', 'success')
  }

  const clearAll = () => {
    localStorage.clear()
    clearAllHistory()
    clearAlerts()
    resetSettings()
    toast('All local data cleared. Reloading…', 'warning')
    setTimeout(() => window.location.reload(), 1500)
  }

  return (
    <div>
      <PageHeader icon={SettingsIcon} title="Settings" subtitle="Customize the MailTools experience" gradient="from-slate-500/20 to-zinc-500/10">
        <button onClick={resetSettings} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-2 border border-border text-text-secondary hover:text-text-primary">
          <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> Reset
        </button>
      </PageHeader>

      <div className="space-y-4">
        {/* Appearance */}
        <Section title="Appearance" description="Theme, visual effects, density">
          <Row label="Theme" hint="Dark is recommended for long sessions">
            <div className="flex gap-1.5">
              {[
                { id: 'dark', icon: Moon, label: 'Dark' },
                { id: 'light', icon: Sun, label: 'Light' },
                { id: 'system', icon: Monitor, label: 'System' },
              ].map(opt => {
                const Icon = opt.icon
                return (
                  <button
                    key={opt.id}
                    onClick={() => setTheme(opt.id as any)}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      theme === opt.id
                        ? 'bg-accent/15 text-accent border border-accent/30'
                        : 'bg-surface-2 border border-border text-text-secondary hover:border-border-hover'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </Row>

          <Toggle
            label="Animated Aurora Background"
            description="Floating gradient orbs in the background"
            checked={settings.showAurora}
            onChange={(v) => updateSettings({ showAurora: v })}
            icon={Sparkles}
          />
          <Toggle
            label="Grid Background"
            description="Subtle grid pattern overlay"
            checked={settings.showGridBackground}
            onChange={(v) => updateSettings({ showGridBackground: v })}
            icon={Grid3x3}
          />
          <Toggle
            label="Compact View"
            description="Reduce padding for higher information density"
            checked={settings.compactView}
            onChange={(v) => updateSettings({ compactView: v })}
            icon={Layers}
          />
        </Section>

        {/* Behavior */}
        <Section title="Behavior" description="How the app responds and refreshes">
          <Toggle
            label="Auto-Refresh Dashboard"
            description="Periodically reload scan results from storage"
            checked={settings.autoRefreshDashboard}
            onChange={(v) => updateSettings({ autoRefreshDashboard: v })}
            icon={RefreshCw}
          />
          <Row label="Refresh Interval" hint="How often to refresh when auto-refresh is on">
            <select
              value={settings.refreshIntervalSec}
              onChange={(e) => updateSettings({ refreshIntervalSec: Number(e.target.value) })}
              className="px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-xs focus:outline-none focus:border-accent/50"
            >
              <option value={15}>15s</option>
              <option value={30}>30s</option>
              <option value={60}>1 min</option>
              <option value={300}>5 min</option>
            </select>
          </Row>
          <Row label="Default Tool" hint="Where the search bar takes you">
            <select
              value={settings.defaultTool}
              onChange={(e) => updateSettings({ defaultTool: e.target.value })}
              className="px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-xs focus:outline-none focus:border-accent/50"
            >
              {TOOL_CATALOG.filter(t => t.path !== '/').map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </Row>
          <Row label="History Limit" hint="Maximum entries kept per tool">
            <input
              type="number"
              value={settings.historyLimit}
              onChange={(e) => updateSettings({ historyLimit: Math.max(10, Number(e.target.value) || 100) })}
              className="w-24 px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-xs focus:outline-none focus:border-accent/50"
            />
          </Row>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" description="Browser-level alerts and sounds">
          <Toggle
            label="Desktop Notifications"
            description="Show browser notifications for new alerts"
            checked={settings.enableNotifications}
            onChange={async (v) => {
              if (v && 'Notification' in window) {
                const perm = await Notification.requestPermission()
                if (perm !== 'granted') {
                  toast('Notification permission denied', 'warning')
                  return
                }
              }
              updateSettings({ enableNotifications: v })
            }}
            icon={Bell}
          />
          <Toggle
            label="Sound Effects"
            description="Play a short sound on alerts"
            checked={settings.enableSounds}
            onChange={(v) => updateSettings({ enableSounds: v })}
            icon={Volume2}
          />
        </Section>

        {/* Data */}
        <Section title="Data" description="Backup, restore, and reset local storage">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={exportAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-2 border border-border text-text-secondary hover:text-text-primary">
              <Download className="w-3.5 h-3.5" /> Export Backup
            </button>
            <button onClick={() => navigate('/monitor')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-2 border border-border text-text-secondary hover:text-text-primary">
              <Bell className="w-3.5 h-3.5" /> {monitors.length} Active Monitor{monitors.length !== 1 ? 's' : ''}
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-danger-muted border border-danger/30 text-danger hover:bg-danger/20"
            >
              <Trash2 className="w-3.5 h-3.5" /> Erase All Data
            </button>
          </div>
        </Section>

        {/* About */}
        <Section title="About" description="MailForge 2.0 Elite">
          <div className="text-xs text-text-secondary space-y-1">
            <p>Built with <span className="text-accent font-semibold">Go 1.23</span> on the backend and <span className="text-accent font-semibold">React 19 + Vite + Tailwind 4</span> on the frontend.</p>
            <p>Open <kbd className="kbd">⌘</kbd> + <kbd className="kbd">K</kbd> for the command palette. Press <kbd className="kbd">?</kbd> for shortcuts.</p>
          </div>
        </Section>
      </div>

      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title="Erase All Data?"
        description="This will permanently delete all local data including history, alerts, and settings. This action cannot be undone."
        confirmLabel="Erase Everything"
        cancelLabel="Keep My Data"
        onConfirm={clearAll}
        variant="danger"
      />
    </div>
  )
}

function Section({ title, description, children }: any) {
  return (
    <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-[11px] text-text-muted">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-xs font-medium">{label}</div>
        {hint && <div className="text-[10px] text-text-muted mt-0.5">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function Toggle({ label, description, checked, onChange, icon: Icon }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void; icon: any }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition-colors text-left"
    >
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
        checked ? 'bg-accent/15 text-accent' : 'bg-surface-2 text-text-muted'
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium">{label}</div>
        <div className="text-[10px] text-text-muted truncate">{description}</div>
      </div>
      <div className={cn('relative w-9 h-5 rounded-full transition-colors flex-shrink-0',
        checked ? 'bg-accent' : 'bg-surface-hover border border-border'
      )}>
        <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        )} />
      </div>
    </button>
  )
}

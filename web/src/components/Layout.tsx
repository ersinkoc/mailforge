import { useState, useEffect, useMemo, useCallback } from 'react'
import { Outlet, NavLink, useLocation, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, Globe, ShieldAlert, FileText, KeyRound,
  ShieldCheck, Server, Scan, ArrowLeftRight, Mail,
  ChevronRight, Zap, Clock, Trash2, X, Sun, Moon,
  Globe2, HardDrive, Search, Menu, Sparkles,
  Command, Settings, BookOpen, Activity, Bell, History, ChevronDown, Monitor
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme, useHistory, useDomain, useScanResults, useMonitors, type HistoryEntry, type ScanAlert } from '@/lib/store'
import { TOOL_CATALOG } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'
import CommandPalette from './CommandPalette'

const iconMap: Record<string, any> = {
  dashboard: LayoutDashboard, 'quick-scan': Zap, dns: Globe, mx: Mail,
  blacklist: ShieldAlert, spf: FileText, dkim: KeyRound, dmarc: ShieldCheck,
  smtp: Server, ports: Scan, rdns: ArrowLeftRight, headers: Mail, whois: Search,
  mtasts: ShieldCheck, tlsrpt: ShieldCheck, bimi: ShieldCheck, dnssec: ShieldCheck,
  relay: ShieldAlert, catchall: Mail, deliverability: ShieldCheck,
  propagation: Globe, subdomains: Scan, geo: Globe, email: Mail,
  tls: ShieldCheck, http: Globe, sanitize: ShieldAlert, tld: Globe,
  batch: Zap, monitor: Activity, docs: BookOpen, settings: Settings,
}

function HistoryList({ entries, onRemove, onNavigate }: {
  entries: HistoryEntry[]
  onRemove: (id: string) => void
  onNavigate: (route: string, value: string) => void
}) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-text-muted">
        <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mb-3">
          <Clock className="w-5 h-5 opacity-50" />
        </div>
        <p className="text-sm font-medium">No history yet</p>
        <p className="text-xs mt-1 text-text-muted">Scan results will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {entries.map((entry: HistoryEntry) => {
        const tool = TOOL_CATALOG.find(t => t.label === entry.tool)
        const route = tool?.path || `/${entry.tool.toLowerCase().replace(/\s+/g, '-')}`
        const Icon = tool ? iconMap[tool.id] || Search : Search
        return (
          <div
            key={entry.id}
            className="group flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover cursor-pointer transition-colors"
            onClick={() => onNavigate(route, entry.value)}
          >
            <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0">
              <Icon className="w-3.5 h-3.5 text-text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-mono text-text-primary truncate">{entry.value}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-accent">{entry.tool}</span>
                <span className="text-[10px] text-text-muted">· {timeAgo(entry.timestamp)}</span>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(entry.id) }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-danger-muted transition-all"
            >
              <Trash2 className="w-3.5 h-3.5 text-text-muted hover:text-danger" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

function HistoryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { domainHistory, ipHistory, clearDomainHistory, clearIpHistory, clearAllHistory, removeHistory } = useHistory()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'domain' | 'ip'>('domain')

  const entries = tab === 'domain' ? domainHistory : ipHistory

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md glass-strong border-l border-border z-50 flex flex-col animate-slide-in-right shadow-2xl">
        <div className="h-16 flex items-center justify-between px-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <History className="w-4 h-4 text-accent" />
            </div>
            <h2 className="text-sm font-semibold">Scan History</h2>
          </div>
          <div className="flex items-center gap-2">
            {(domainHistory.length > 0 || ipHistory.length > 0) && (
              <button onClick={clearAllHistory} className="text-xs text-text-muted hover:text-danger transition-colors px-2 py-1 rounded-lg hover:bg-danger-muted">
                Clear all
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors">
              <X className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-border flex-shrink-0">
          <button
            onClick={() => setTab('domain')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all border-b-2',
              tab === 'domain' ? 'border-accent text-accent bg-accent/5' : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            <Globe2 className="w-4 h-4" />
            Domains
            {domainHistory.length > 0 && (
              <span className="text-[10px] bg-accent/15 text-accent px-1.5 py-0.5 rounded-full tabular-nums">{domainHistory.length}</span>
            )}
          </button>
          <button
            onClick={() => setTab('ip')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all border-b-2',
              tab === 'ip' ? 'border-accent text-accent bg-accent/5' : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            <HardDrive className="w-4 h-4" />
            IPs
            {ipHistory.length > 0 && (
              <span className="text-[10px] bg-accent/15 text-accent px-1.5 py-0.5 rounded-full tabular-nums">{ipHistory.length}</span>
            )}
          </button>
        </div>

        {entries.length > 0 && (
          <div className="px-4 py-2 flex justify-end border-b border-border flex-shrink-0">
            <button
              onClick={() => tab === 'domain' ? clearDomainHistory() : clearIpHistory()}
              className="text-xs text-text-muted hover:text-danger transition-colors px-2 py-1 rounded-lg hover:bg-danger-muted"
            >
              Clear {tab}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          <HistoryList
            entries={entries}
            onRemove={removeHistory}
            onNavigate={(route, value) => {
              navigate(`${route}?q=${encodeURIComponent(value)}`)
              onClose()
            }}
          />
        </div>
      </div>
    </>
  )
}

function AlertsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { alerts, dismissAlert, clearAlerts } = useScanResults()
  const navigate = useNavigate()

  if (!open) return null

  const toolPaths: Record<string, string> = {
    dns: '/dns', mx: '/mx', blacklist: '/blacklist', spf: '/spf',
    dkim: '/dkim', dmarc: '/dmarc', smtp: '/smtp', ports: '/ports',
    rdns: '/rdns', headers: '/headers', whois: '/whois',
    deliverability: '/deliverability', tls: '/tls',
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md glass-strong border-l border-border z-50 flex flex-col animate-slide-in-right shadow-2xl">
        <div className="h-16 flex items-center justify-between px-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <Bell className="w-4 h-4 text-warning" />
            </div>
            <h2 className="text-sm font-semibold">Change Alerts</h2>
            {alerts.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning font-semibold">{alerts.length}</span>}
          </div>
          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <button onClick={clearAlerts} className="text-xs text-text-muted hover:text-danger transition-colors px-2 py-1 rounded-lg hover:bg-danger-muted">
                Clear all
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors">
              <X className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {alerts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-text-muted py-12">
              <div className="w-14 h-14 rounded-full bg-surface-2 flex items-center justify-center mb-3">
                <Bell className="w-5 h-5 opacity-50" />
              </div>
              <p className="text-sm font-medium">No alerts</p>
              <p className="text-xs mt-1 text-text-muted">Re-scan targets to detect changes</p>
            </div>
          )}
          {alerts.map(alert => {
            const styles = {
              critical: 'border-danger/30 bg-danger/5 hover:bg-danger/10',
              warning: 'border-warning/30 bg-warning/5 hover:bg-warning/10',
              info: 'border-accent/30 bg-accent/5 hover:bg-accent/10',
            }[alert.severity]
            return (
              <div key={alert.id} className={cn('p-3 rounded-xl border group', styles)}>
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => {
                      const path = toolPaths[alert.tool]
                      if (path) navigate(`${path}?q=${encodeURIComponent(alert.value)}`)
                      onClose()
                    }}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="text-sm font-semibold">{alert.title}</div>
                    <div className="text-xs text-text-secondary mt-0.5">{alert.message}</div>
                    <div className="text-[10px] text-text-muted mt-1.5 font-mono">{alert.value} · {timeAgo(alert.timestamp)}</div>
                  </button>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface transition-all"
                  >
                    <X className="w-3.5 h-3.5 text-text-muted" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

const CATEGORY_META: Record<string, { label: string; color: string; icon: any }> = {
  core: { label: 'Core', color: 'text-amber-400', icon: Sparkles },
  security: { label: 'Security', color: 'text-rose-400', icon: ShieldCheck },
  network: { label: 'Network', color: 'text-sky-400', icon: Globe },
  analysis: { label: 'Analysis', color: 'text-violet-400', icon: Activity },
  utility: { label: 'Utility', color: 'text-emerald-400', icon: Zap },
  monitor: { label: 'Monitor', color: 'text-fuchsia-400', icon: Monitor },
}

function SidebarContent({ onNavClick, onClose }: { onNavClick?: () => void; onClose?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { domain, ip } = useDomain()
  const { monitors, wsConnected } = useMonitors()

  // Group tools by category
  const groupedTools = useMemo(() => {
    const groups: Record<string, typeof TOOL_CATALOG> = {}
    for (const tool of TOOL_CATALOG) {
      if (tool.id === 'dashboard') continue
      if (!groups[tool.category]) groups[tool.category] = []
      groups[tool.category].push(tool)
    }
    return groups
  }, [])

  return (
    <>
      <div className="h-16 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
        <Link to="/" className="flex items-center gap-2.5 group" onClick={onNavClick}>
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center shadow-lg shadow-accent/20 group-hover:scale-105 transition-transform">
            <Zap className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-surface animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight gradient-text">MailForge</h1>
            <p className="text-[9px] text-text-muted uppercase tracking-widest">v2.0 · Elite</p>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors">
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {Object.entries(groupedTools).map(([category, tools]) => {
          const meta = CATEGORY_META[category]
          if (!meta || tools.length === 0) return null
          const Icon = meta.icon
          return (
            <div key={category} className="mb-3">
              <div className={cn('flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest', meta.color)}>
                <Icon className="w-3 h-3" />
                {meta.label}
              </div>
              <div className="space-y-0.5 mt-0.5">
                {tools.map(tool => {
                  const ToolIcon = iconMap[tool.id] || Search
                  const isActive = location.pathname === tool.path
                  const isNew = tool.badge === 'new'
                  return (
                    <NavLink
                      key={tool.id}
                      to={tool.path}
                      onClick={onNavClick}
                      className={cn(
                        'group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium smooth-all relative',
                        isActive
                          ? 'bg-accent/15 text-accent shadow-sm shadow-accent/5'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                      )}
                    >
                      {isActive && <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" />}
                      <ToolIcon className={cn('w-3.5 h-3.5 flex-shrink-0', isActive && 'text-accent')} />
                      <span className="flex-1 truncate">{tool.label}</span>
                      {isNew && <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-accent/15 text-accent">New</span>}
                      {isActive && <ChevronRight className="w-3 h-3 text-accent opacity-60" />}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-2 flex-shrink-0">
        {(domain || ip) && (
          <div className="px-2.5 py-1.5 rounded-lg bg-surface-2 border border-border space-y-1">
            {domain && (
              <button
                onClick={() => { navigate(`/dns?q=${encodeURIComponent(domain)}`); onNavClick?.() }}
                className="w-full flex items-center gap-1.5 group cursor-pointer"
              >
                <Globe2 className="w-3 h-3 text-accent flex-shrink-0" />
                <span className="text-[10px] font-mono text-text-secondary truncate group-hover:text-accent transition-colors">{domain}</span>
              </button>
            )}
            {ip && (
              <button
                onClick={() => { navigate(`/blacklist?q=${encodeURIComponent(ip)}`); onNavClick?.() }}
                className="w-full flex items-center gap-1.5 group cursor-pointer"
              >
                <HardDrive className="w-3 h-3 text-info flex-shrink-0" />
                <span className="text-[10px] font-mono text-info truncate group-hover:text-info/80 transition-colors">{ip}</span>
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
          </button>
          <button
            onClick={() => { navigate('/settings'); onNavClick?.() }}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
            title="Settings"
          >
            <Settings className="w-3 h-3" />
          </button>
        </div>

        {monitors.length > 0 && (
          <button
            onClick={() => { navigate('/monitor'); onNavClick?.() }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-2 border border-border text-[10px] hover:bg-surface-hover transition-colors"
          >
            <div className="relative flex-shrink-0">
              <Monitor className="w-3 h-3 text-info" />
              <div className={cn('absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full', wsConnected ? 'bg-success animate-pulse' : 'bg-text-muted')} />
            </div>
            <span className="text-text-secondary truncate">{monitors.length} active monitor{monitors.length !== 1 ? 's' : ''}</span>
          </button>
        )}

        <p className="text-[9px] text-text-muted text-center pt-1">MailTools 2.0 · Go + React</p>
      </div>
    </>
  )
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { alerts } = useScanResults()

  // Stabilize close handlers to prevent re-renders
  const handlePaletteClose = useCallback(() => setPaletteOpen(false), [])
  const handleHistoryClose = useCallback(() => setHistoryOpen(false), [])
  const handleAlertsClose = useCallback(() => setAlertsOpen(false), [])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K = Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(prev => !prev)
      }
      // Cmd/Ctrl + H = History
      else if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault()
        setHistoryOpen(prev => !prev)
      }
      // Cmd/Ctrl + / = Show keyboard shortcuts
      else if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setPaletteOpen(true)
      }
      // Escape closes everything
      else if (e.key === 'Escape' && (paletteOpen || historyOpen || alertsOpen)) {
        e.preventDefault()
        setPaletteOpen(false)
        setHistoryOpen(false)
        setAlertsOpen(false)
      }
      // G then D = Dashboard
      else if (e.key === 'g' && !paletteOpen && !historyOpen && !alertsOpen) {
        const next = (nextKey: string) => {
          document.removeEventListener('keydown', nextHandler)
          if (nextKey === 'd') navigate('/')
          else if (nextKey === 'q') navigate('/quick-scan')
          else if (nextKey === 'm') navigate('/monitor')
          else if (nextKey === 'b') navigate('/batch')
        }
        const nextHandler = (ev: KeyboardEvent) => {
          if (ev.key === 'd' || ev.key === 'q' || ev.key === 'm' || ev.key === 'b') {
            ev.preventDefault()
            next(ev.key)
          } else {
            document.removeEventListener('keydown', nextHandler)
          }
        }
        document.addEventListener('keydown', nextHandler)
        setTimeout(() => document.removeEventListener('keydown', nextHandler), 1000)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [navigate, paletteOpen, historyOpen, alertsOpen])

  useEffect(() => { setSidebarOpen(false) }, [location.pathname, setSidebarOpen])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Background effects */}
      <div className="bg-aurora" />
      <div className="bg-grid fixed inset-0 pointer-events-none z-0" />

      {/* Sidebar - desktop */}
      <aside className="hidden md:flex w-60 flex-shrink-0 border-r border-border glass flex-col z-30">
        <SidebarContent />
      </aside>

      {/* Sidebar - mobile overlay */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 z-50 md:hidden glass-strong border-r border-border flex flex-col animate-slide-in-left">
            <SidebarContent onNavClick={() => setSidebarOpen(false)} onClose={() => setSidebarOpen(false)} />
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="h-14 flex items-center justify-between gap-2 px-3 md:px-5 border-b border-border glass flex-shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <Menu className="w-4 h-4 text-text-secondary" />
            </button>
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all border border-border max-w-md flex-1"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search tools or paste a target…</span>
              <span className="sm:hidden">Search…</span>
              <kbd className="kbd ml-auto"><Command className="w-2.5 h-2.5" />K</kbd>
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setAlertsOpen(true)}
              className="relative p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
              title="Alerts"
            >
              <Bell className="w-4 h-4" />
              {alerts.length > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[1rem] h-4 px-1 rounded-full bg-warning text-[9px] font-bold text-black flex items-center justify-center tabular-nums">
                  {alerts.length > 9 ? '9+' : alerts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
              title="History (⌘H)"
            >
              <History className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
            <Outlet />
          </div>
        </div>
      </main>

      <CommandPalette open={paletteOpen} onClose={handlePaletteClose} />
      <HistoryPanel open={historyOpen} onClose={handleHistoryClose} />
      <AlertsPanel open={alertsOpen} onClose={handleAlertsClose} />
    </div>
  )
}

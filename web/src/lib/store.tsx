import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

// ── Domain Store ──────────────────────────────────────────────
interface DomainContextType {
  domain: string
  ip: string
  setDomain: (d: string) => void
  setIp: (ip: string) => void
}

const DomainContext = createContext<DomainContextType>({ domain: '', ip: '', setDomain: () => {}, setIp: () => {} })

export function DomainProvider({ children }: { children: ReactNode }) {
  const [domain, setDomainState] = useState(() => localStorage.getItem('mailforge_domain') || '')
  const [ip, setIpState] = useState(() => localStorage.getItem('mailforge_ip') || '')

  const setDomain = useCallback((d: string) => {
    setDomainState(d)
    if (d) localStorage.setItem('mailforge_domain', d)
  }, [])

  const setIp = useCallback((newIp: string) => {
    setIpState(newIp)
    if (newIp) localStorage.setItem('mailforge_ip', newIp)
  }, [])

  return <DomainContext.Provider value={{ domain, ip, setDomain, setIp }}>{children}</DomainContext.Provider>
}

export const useDomain = () => useContext(DomainContext)

// ── History Store ─────────────────────────────────────────────
export type HistoryType = 'domain' | 'ip'

export interface HistoryEntry {
  id: string
  value: string
  tool: string
  type: HistoryType
  timestamp: number
}

function isIP(value: string): boolean {
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) return true
  if (value.includes(':')) return true
  return false
}

interface HistoryContextType {
  domainHistory: HistoryEntry[]
  ipHistory: HistoryEntry[]
  addHistory: (value: string, tool: string) => void
  clearDomainHistory: () => void
  clearIpHistory: () => void
  clearAllHistory: () => void
  removeHistory: (id: string) => void
}

const HistoryContext = createContext<HistoryContextType>({
  domainHistory: [],
  ipHistory: [],
  addHistory: () => {},
  clearDomainHistory: () => {},
  clearIpHistory: () => {},
  clearAllHistory: () => {},
  removeHistory: () => {},
})

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('mailforge_history') || '[]')
    } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem('mailforge_history', JSON.stringify(history))
  }, [history])

  const domainHistory = history.filter(h => h.type === 'domain')
  const ipHistory = history.filter(h => h.type === 'ip')

  const addHistory = useCallback((value: string, tool: string) => {
    setHistory(prev => {
      const type: HistoryType = isIP(value) ? 'ip' : 'domain'
      const filtered = prev.filter(h => !(h.value === value && h.tool === tool && h.type === type))
      const entry: HistoryEntry = {
        id: `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        value, tool, type,
        timestamp: Date.now(),
      }
      return [entry, ...filtered].slice(0, 200)
    })
  }, [])

  const clearDomainHistory = useCallback(() => {
    setHistory(prev => prev.filter(h => h.type !== 'domain'))
  }, [])

  const clearIpHistory = useCallback(() => {
    setHistory(prev => prev.filter(h => h.type !== 'ip'))
  }, [])

  const clearAllHistory = useCallback(() => setHistory([]), [])

  const removeHistory = useCallback((id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id))
  }, [])

  return (
    <HistoryContext.Provider value={{ domainHistory, ipHistory, addHistory, clearDomainHistory, clearIpHistory, clearAllHistory, removeHistory }}>
      {children}
    </HistoryContext.Provider>
  )
}

export const useHistory = () => useContext(HistoryContext)

// ── Scan Results Cache ──────────────────────────────────────
export type ScanToolType =
  | 'dns' | 'mx' | 'smtp' | 'blacklist' | 'spf' | 'dkim' | 'dmarc' | 'rdns' | 'ports' | 'whois' | 'headers'
  | 'email' | 'geo' | 'tls' | 'http' | 'mtasts' | 'tlsrpt' | 'bimi' | 'dnssec' | 'deliverability'
  | 'relay' | 'catchall' | 'subdomains' | 'propagation' | 'tld'

export interface ScanResultCache {
  tool: ScanToolType
  value: string
  result: any
  timestamp: number
}

const MAX_HISTORY_PER_TOOL = 3

// ── Scan Alerts ─────────────────────────────────────────────
export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface ScanAlert {
  id: string
  tool: ScanToolType
  value: string
  severity: AlertSeverity
  title: string
  message: string
  timestamp: number
}

function detectChanges(tool: ScanToolType, value: string, prev: any, next: any): Omit<ScanAlert, 'id' | 'timestamp'>[] {
  if (!prev || !next) return []
  const alerts: Omit<ScanAlert, 'id' | 'timestamp'>[] = []

  if (tool === 'blacklist') {
    const p = prev.listed_count ?? 0
    const n = next.listed_count ?? 0
    if (p === 0 && n > 0) {
      alerts.push({ tool, value, severity: 'critical', title: 'Blacklisted!', message: `${value} is now listed on ${n} blacklist${n !== 1 ? 's' : ''}` })
    } else if (n > p) {
      alerts.push({ tool, value, severity: 'critical', title: 'Blacklist Increased', message: `${value} listed on ${n} blacklists (was ${p})` })
    } else if (p > 0 && n === 0) {
      alerts.push({ tool, value, severity: 'info', title: 'Blacklist Cleared', message: `${value} is no longer listed on any blacklists` })
    }
  }
  if (tool === 'spf') {
    if (prev.valid && !next.valid) alerts.push({ tool, value, severity: 'critical', title: 'SPF Invalid', message: `${value} SPF record is now invalid` })
    else if (!prev.valid && next.valid) alerts.push({ tool, value, severity: 'info', title: 'SPF Fixed', message: `${value} SPF record is now valid` })
  }
  if (tool === 'dkim') {
    if (prev.valid && !next.valid) alerts.push({ tool, value, severity: 'critical', title: 'DKIM Invalid', message: `${value} DKIM signature is now invalid` })
    else if (!prev.valid && next.valid) alerts.push({ tool, value, severity: 'info', title: 'DKIM Fixed', message: `${value} DKIM signature is now valid` })
  }
  if (tool === 'dmarc') {
    if (prev.valid && !next.valid) alerts.push({ tool, value, severity: 'critical', title: 'DMARC Missing', message: `${value} DMARC record is now missing` })
    else if (!prev.valid && next.valid) alerts.push({ tool, value, severity: 'info', title: 'DMARC Added', message: `${value} DMARC record is now configured` })
    else if (prev.valid && next.valid && prev.policy !== next.policy) {
      alerts.push({ tool, value, severity: 'warning', title: 'DMARC Policy Changed', message: `${value} DMARC policy changed from "${prev.policy}" to "${next.policy}"` })
    }
  }
  if (tool === 'smtp') {
    if (prev.connected && !next.connected) alerts.push({ tool, value, severity: 'critical', title: 'SMTP Down', message: `${value} SMTP server is no longer reachable` })
    else if (!prev.connected && next.connected) alerts.push({ tool, value, severity: 'info', title: 'SMTP Restored', message: `${value} SMTP server is reachable again` })
    if (prev.starttls && !next.starttls) alerts.push({ tool, value, severity: 'warning', title: 'STARTTLS Lost', message: `${value} no longer supports STARTTLS` })
    else if (!prev.starttls && next.starttls) alerts.push({ tool, value, severity: 'info', title: 'STARTTLS Restored', message: `${value} now supports STARTTLS` })
  }
  if (tool === 'deliverability') {
    if (prev.score >= 70 && next.score < 50) alerts.push({ tool, value, severity: 'critical', title: 'Deliverability Dropped', message: `${value} score dropped from ${prev.score} to ${next.score}` })
    else if (prev.score < 50 && next.score >= 80) alerts.push({ tool, value, severity: 'info', title: 'Deliverability Recovered', message: `${value} score improved to ${next.score}` })
  }
  if (tool === 'tls') {
    if (prev.grade && next.grade && prev.grade !== next.grade) {
      alerts.push({ tool, value, severity: 'info', title: 'TLS Grade Changed', message: `${value} TLS grade changed from ${prev.grade} to ${next.grade}` })
    }
  }
  if (tool === 'dns') {
    const p = (prev.a || []).map((r: any) => r.ip).sort().join(',')
    const n = (next.a || []).map((r: any) => r.ip).sort().join(',')
    if (p && n && p !== n) alerts.push({ tool, value, severity: 'warning', title: 'DNS IP Changed', message: `${value} A records changed: ${n}` })
  }
  if (tool === 'mx') {
    const p = (prev.mx || []).map((m: any) => m.host).sort().join(',')
    const n = (next.mx || []).map((m: any) => m.host).sort().join(',')
    if (p && n && p !== n) alerts.push({ tool, value, severity: 'warning', title: 'MX Records Changed', message: `${value} MX servers changed` })
  }
  if (tool === 'ports') {
    const p = (prev.ports || []).filter((p: any) => p.status === 'open').map((p: any) => p.port).sort()
    const n = (next.ports || []).filter((p: any) => p.status === 'open').map((p: any) => p.port).sort()
    if (p.join(',') !== n.join(',')) {
      const closed = p.filter((x: number) => !n.includes(x))
      const opened = n.filter((x: number) => !p.includes(x))
      if (closed.length > 0) alerts.push({ tool, value, severity: 'warning', title: 'Ports Closed', message: `Port ${closed.join(', ')} closed on ${value}` })
      if (opened.length > 0) alerts.push({ tool, value, severity: 'warning', title: 'Ports Opened', message: `Port ${opened.join(', ')} opened on ${value}` })
    }
  }
  if (tool === 'rdns') {
    const p = (prev.hosts || []).sort().join(',')
    const n = (next.hosts || []).sort().join(',')
    if (p && n && p !== n) alerts.push({ tool, value, severity: 'info', title: 'PTR Changed', message: `Reverse DNS for ${value} changed to ${n}` })
  }

  return alerts
}

interface ScanResultsContextType {
  getLastResult: (tool: ScanToolType) => ScanResultCache | null
  getHistory: (tool: ScanToolType) => ScanResultCache[]
  setLastResult: (tool: ScanToolType, value: string, result: any) => void
  reloadFromStorage: () => void
  lastResults: Record<string, ScanResultCache[]>
  alerts: ScanAlert[]
  dismissAlert: (id: string) => void
  clearAlerts: () => void
}

const ScanResultsContext = createContext<ScanResultsContextType>({
  getLastResult: () => null,
  getHistory: () => [],
  setLastResult: () => {},
  reloadFromStorage: () => {},
  lastResults: {},
  alerts: [],
  dismissAlert: () => {},
  clearAlerts: () => {},
})

export function ScanResultsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<ScanAlert[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('mailforge_scan_alerts') || '[]')
    } catch { return [] }
  })

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => {
      const next = prev.filter(a => a.id !== id)
      localStorage.setItem('mailforge_scan_alerts', JSON.stringify(next))
      return next
    })
  }, [])

  const clearAlerts = useCallback(() => {
    setAlerts([])
    localStorage.setItem('mailforge_scan_alerts', '[]')
  }, [])

  const [lastResults, setLastResultsState] = useState<Record<string, ScanResultCache[]>>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('mailforge_scan_results') || '{}')
      const migrated: Record<string, ScanResultCache[]> = {}
      for (const [key, val] of Object.entries(raw)) {
        if (Array.isArray(val)) {
          migrated[key] = val
        } else if (val && typeof val === 'object' && 'timestamp' in val) {
          migrated[key] = [val as unknown as ScanResultCache]
        }
      }
      return migrated
    } catch { return {} }
  })

  const getLastResult = useCallback((tool: ScanToolType) => {
    const arr = lastResults[tool]
    return arr?.[0] || null
  }, [lastResults])

  const getHistory = useCallback((tool: ScanToolType) => {
    return lastResults[tool] || []
  }, [lastResults])

  const setLastResult = useCallback((tool: ScanToolType, value: string, result: any) => {
    setLastResultsState(prev => {
      const existing = prev[tool] || []
      const previousEntry = existing.find(e => e.value === value)
      const detectedAlerts = detectChanges(tool, value, previousEntry?.result, result)

      if (detectedAlerts.length > 0) {
        const newAlerts: ScanAlert[] = detectedAlerts.map(a => ({
          ...a,
          id: `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
          timestamp: Date.now(),
        }))
        setAlerts(prevAlerts => {
          const nextAlerts = [...newAlerts, ...prevAlerts].slice(0, 50)
          localStorage.setItem('mailforge_scan_alerts', JSON.stringify(nextAlerts))
          return nextAlerts
        })
      }

      const entry: ScanResultCache = { tool, value, result, timestamp: Date.now() }
      const filtered = existing.filter(e => e.value !== value)
      const nextArr = [entry, ...filtered].slice(0, MAX_HISTORY_PER_TOOL)
      const next = { ...prev, [tool]: nextArr }
      localStorage.setItem('mailforge_scan_results', JSON.stringify(next))
      return next
    })
  }, [])

  const reloadFromStorage = useCallback(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('mailforge_scan_results') || '{}')
      const migrated: Record<string, ScanResultCache[]> = {}
      for (const [key, val] of Object.entries(raw)) {
        if (Array.isArray(val)) {
          migrated[key] = val
        } else if (val && typeof val === 'object' && 'timestamp' in val) {
          migrated[key] = [val as unknown as ScanResultCache]
        }
      }
      setLastResultsState(prev => {
        if (JSON.stringify(prev) === JSON.stringify(migrated)) return prev
        return migrated
      })
    } catch {}
  }, [])

  return (
    <ScanResultsContext.Provider value={{ getLastResult, getHistory, setLastResult, reloadFromStorage, lastResults, alerts, dismissAlert, clearAlerts }}>
      {children}
    </ScanResultsContext.Provider>
  )
}

export const useScanResults = () => useContext(ScanResultsContext)

// ── Theme Store ───────────────────────────────────────────────
type Theme = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme: Theme
  resolved: 'dark' | 'light'
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'dark', resolved: 'dark', setTheme: () => {}, toggleTheme: () => {} })

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark'
    return (localStorage.getItem('mailforge_theme') as Theme) || 'dark'
  })

  const [resolved, setResolved] = useState<'dark' | 'light'>(() => {
    if (theme === 'system') return getSystemTheme()
    return theme
  })

  useEffect(() => {
    const root = document.documentElement
    const r = theme === 'system' ? getSystemTheme() : theme
    root.classList.remove('dark', 'light')
    root.classList.add(r)
    setResolved(r)
    localStorage.setItem('mailforge_theme', theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = () => {
      const r = getSystemTheme()
      const root = document.documentElement
      root.classList.remove('dark', 'light')
      root.classList.add(r)
      setResolved(r)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const r = prev === 'system' ? getSystemTheme() : prev
      return r === 'dark' ? 'light' : 'dark'
    })
  }, [])

  const setTheme = useCallback((t: Theme) => setThemeState(t), [])

  return <ThemeContext.Provider value={{ theme, resolved, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)

// ── Monitors (live WebSocket) ───────────────────────────────
export interface MonitorState {
  id: string
  name: string
  type: string
  tool: string
  value: string
  interval: number
  last_status: string
  last_check: number
  last_message: string
  history: { timestamp: number; status: string; message: string; duration_ms: number }[]
}

interface MonitorContextType {
  monitors: MonitorState[]
  setMonitors: (m: MonitorState[]) => void
  addMonitor: (m: MonitorState) => void
  removeMonitor: (id: string) => void
  wsConnected: boolean
}

const MonitorContext = createContext<MonitorContextType>({
  monitors: [],
  setMonitors: () => {},
  addMonitor: () => {},
  removeMonitor: () => {},
  wsConnected: false,
})

export function MonitorProvider({ children }: { children: ReactNode }) {
  const [monitors, setMonitors] = useState<MonitorState[]>([])
  const [wsConnected, setWsConnected] = useState(false)

  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnectTimer: number | null = null
    let reconnectAttempts = 0
    const MAX_RECONNECT = 5

    const connect = () => {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      ws = new WebSocket(`${proto}://${window.location.host}/ws/monitor`)
      ws.onopen = () => {
        setWsConnected(true)
        reconnectAttempts = 0
      }
      ws.onclose = () => {
        setWsConnected(false)
        if (reconnectAttempts < MAX_RECONNECT) {
          reconnectAttempts++
          // Exponential backoff: 3s, 6s, 12s, 24s, 30s cap
          const delay = Math.min(3000 * Math.pow(2, reconnectAttempts - 1), 30000)
          reconnectTimer = window.setTimeout(connect, delay)
        }
      }
      ws.onerror = () => ws?.close()
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg.type === 'monitor_snapshot' && Array.isArray(msg.monitors)) {
            setMonitors(msg.monitors)
          } else if (msg.type === 'monitor_update' && msg.id) {
            setMonitors(prev => prev.map(m => m.id === msg.id ? { ...m, last_status: msg.status, last_check: msg.last_check, last_message: msg.message, history: msg.history || m.history } : m))
          }
        } catch {}
      }
    }
    connect()
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      ws?.close()
    }
  }, [])

  const addMonitor = useCallback((m: MonitorState) => {
    setMonitors(prev => [m, ...prev])
  }, [])

  const removeMonitor = useCallback((id: string) => {
    setMonitors(prev => prev.filter(m => m.id !== id))
  }, [])

  return (
    <MonitorContext.Provider value={{ monitors, setMonitors, addMonitor, removeMonitor, wsConnected }}>
      {children}
    </MonitorContext.Provider>
  )
}

export const useMonitors = () => useContext(MonitorContext)

// ── Settings (preferences) ───────────────────────────────────
export interface AppSettings {
  autoRefreshDashboard: boolean
  refreshIntervalSec: number
  showGridBackground: boolean
  showAurora: boolean
  enableSounds: boolean
  enableNotifications: boolean
  compactView: boolean
  defaultTool: string
  historyLimit: number
}

const defaultSettings: AppSettings = {
  autoRefreshDashboard: false,
  refreshIntervalSec: 30,
  showGridBackground: true,
  showAurora: true,
  enableSounds: false,
  enableNotifications: false,
  compactView: false,
  defaultTool: 'dns',
  historyLimit: 100,
}

interface SettingsContextType {
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void
  resetSettings: () => void
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
  resetSettings: () => {},
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      return { ...defaultSettings, ...JSON.parse(localStorage.getItem('mailforge_settings') || '{}') }
    } catch { return defaultSettings }
  })

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      localStorage.setItem('mailforge_settings', JSON.stringify(next))
      return next
    })
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings)
    localStorage.setItem('mailforge_settings', JSON.stringify(defaultSettings))
  }, [])

  return <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>{children}</SettingsContext.Provider>
}

export const useSettings = () => useContext(SettingsContext)

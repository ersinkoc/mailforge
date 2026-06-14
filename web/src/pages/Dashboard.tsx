import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Globe, ShieldAlert, FileText, KeyRound, ShieldCheck,
  Server, Scan, ArrowLeftRight, Mail, Zap, ArrowRight, Sparkles, Search, Clock, ChevronRight,
  BarChart3, Activity, TrendingUp, Send, CheckCircle2, XCircle, AlertTriangle, Bell,
  Trash2, GitCompareArrows, Eye, EyeOff, RefreshCw, Download, Sun, Moon, ChevronDown,
  Monitor, Database, Lock, Shield, Star, Layers, Command
} from 'lucide-react'
import { useDomain, useHistory, useScanResults, useTheme, useMonitors } from '@/lib/store'
import { cn, timeAgo, formatDuration, compactNumber, TOOL_CATALOG, getGradeColor, getScoreColor } from '@/lib/utils'
import { api } from '@/lib/api'
import { useToast } from '@/components/Toast'
import ScanDiffView from '@/components/ScanDiffView'
import ExportButton from '@/components/ExportButton'
import SearchInput from '@/components/SearchInput'

export default function Dashboard() {
  const { domain, setDomain, ip } = useDomain()
  const { domainHistory, ipHistory } = useHistory()
  const { lastResults, getHistory, alerts, dismissAlert, clearAlerts } = useScanResults()
  const { theme, toggleTheme } = useTheme()
  const { monitors, wsConnected } = useMonitors()
  const { toast } = useToast()
  const [query, setQuery] = useState(domain)
  const [scanning, setScanning] = useState(false)
  const [compareTool, setCompareTool] = useState<string | null>(null)
  const [compareOldIdx, setCompareOldIdx] = useState(0)
  const [compareNewIdx, setCompareNewIdx] = useState(1)
  const [showUnchanged, setShowUnchanged] = useState(false)

  const navigate = useNavigate()
  const prevAlertCountRef = useRef(alerts.length)

  useEffect(() => setQuery(domain), [domain])

  useEffect(() => {
    if (alerts.length > prevAlertCountRef.current) {
      const newest = alerts[0]
      if (newest) {
        const typeMap: Record<string, 'error' | 'warning' | 'info'> = {
          critical: 'error', warning: 'warning', info: 'info',
        }
        toast(`${newest.title}: ${newest.message}`, typeMap[newest.severity])
      }
    }
    prevAlertCountRef.current = alerts.length
  }, [alerts, toast])

  const allHistory = useMemo(() => [...domainHistory, ...ipHistory], [domainHistory, ipHistory])
  const recentScans = useMemo(() => [...allHistory].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5), [allHistory])
  const totalScans = allHistory.length
  const toolStats = useMemo(() => allHistory.reduce((acc, h) => { acc[h.tool] = (acc[h.tool] || 0) + 1; return acc }, {} as Record<string, number>), [allHistory])
  const maxToolCount = Math.max(1, ...Object.values(toolStats))

  const { days, dailyCounts, maxDaily } = useMemo(() => {
    const d = Array.from({ length: 7 }, (_, i) => {
      const dt = new Date()
      dt.setDate(dt.getDate() - (6 - i))
      dt.setHours(0, 0, 0, 0)
      return dt
    })
    const counts = d.map(day => {
      const next = new Date(day)
      next.setDate(next.getDate() + 1)
      return allHistory.filter(h => h.timestamp >= day.getTime() && h.timestamp < next.getTime()).length
    })
    return { days: d, dailyCounts: counts, maxDaily: Math.max(1, ...counts) }
  }, [allHistory])

  const handleSuperTool = useCallback(async () => {
    if (!query.trim()) return
    setDomain(query.trim())
    setScanning(true)
    try {
      const res = await api.super(query.trim())
      if (res.success) {
        toast('Analyzed successfully', 'success')
        navigate('/')
      }
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setScanning(false)
    }
  }, [query, setDomain, navigate, toast])

  const openCompare = useCallback((tool: string) => {
    const hist = getHistory(tool as any)
    if (hist.length < 2) return
    setCompareTool(tool)
    setCompareOldIdx(1)
    setCompareNewIdx(0)
    setShowUnchanged(false)
  }, [getHistory])

  return (
    <div className="space-y-8">
      {/* Alerts banner */}
      {alerts.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell className="w-4 h-4 text-warning" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
              </div>
              <h2 className="text-sm font-semibold">Recent Changes</h2>
              <span className="px-2 py-0.5 rounded-full bg-warning/15 text-warning text-[10px] font-semibold tabular-nums">
                {alerts.length}
              </span>
            </div>
            <button onClick={clearAlerts} className="text-[10px] text-text-muted hover:text-danger transition-colors flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Clear all
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {alerts.slice(0, 4).map(alert => {
              const styles = {
                critical: 'border-danger/30 bg-danger/5',
                warning: 'border-warning/30 bg-warning/5',
                info: 'border-accent/30 bg-accent/5',
              }[alert.severity]
              return (
                <button
                  key={alert.id}
                  onClick={() => {
                    const path = `/${alert.tool}?q=${encodeURIComponent(alert.value)}`
                    navigate(path)
                  }}
                  className={cn('group p-3 rounded-xl border text-left flex items-center gap-3 smooth-all hover:scale-[1.01]', styles)}
                >
                  <AlertTriangle className={cn('w-4 h-4 flex-shrink-0',
                    alert.severity === 'critical' ? 'text-danger' :
                    alert.severity === 'warning' ? 'text-warning' : 'text-accent'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{alert.title}</div>
                    <div className="text-xs text-text-secondary truncate">{alert.message}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="text-center space-y-4 py-6 md:py-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[11px] font-medium">
          <Sparkles className="w-3 h-3" />
          The professional's email diagnostic toolkit
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter">
          <span className="gradient-text">Mail</span>
          <span className="text-text-primary">Tools</span>
        </h1>
        <p className="text-sm md:text-base text-text-secondary max-w-xl mx-auto leading-relaxed">
          25+ enterprise-grade tools for diagnosing, monitoring and securing email infrastructure.
          Built for sysadmins, deliverability engineers and security teams.
        </p>

        <div className="max-w-2xl mx-auto pt-4">
          <SearchInput
            value={query}
            onChange={setQuery}
            onSubmit={handleSuperTool}
            loading={scanning}
            placeholder="Enter a domain, IP, or email to run a full analysis…"
            buttonLabel="Super Scan"
            buttonIcon={Zap}
          />
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-[11px] text-text-muted">
            <span className="flex items-center gap-1.5"><kbd className="kbd">⌘</kbd><kbd className="kbd">K</kbd> Command palette</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>Press <kbd className="kbd">G</kbd> then <kbd className="kbd">D</kbd> for Dashboard</span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Scans" value={compactNumber(totalScans)} icon={Activity} color="text-accent" gradient="from-accent/20 to-accent/5" />
        <StatCard label="Active Monitors" value={monitors.length.toString()} icon={Monitor} color="text-info" gradient="from-info/20 to-info/5" sub={wsConnected ? 'Live' : 'Offline'} />
        <StatCard label="Tools Available" value={TOOL_CATALOG.filter(t => t.id !== 'dashboard').length.toString()} icon={Layers} color="text-success" gradient="from-success/20 to-success/5" sub="2.0 Elite" />
        <StatCard label="Active Alerts" value={alerts.length.toString()} icon={Bell} color="text-warning" gradient="from-warning/20 to-warning/5" sub={alerts.length > 0 ? 'Need review' : 'All clear'} />
      </div>

      {/* Quick-access tool grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-text-muted" />
            <h2 className="text-sm font-semibold">Quick Access</h2>
          </div>
          <button onClick={() => navigate('/quick-scan')} className="text-xs text-text-muted hover:text-accent transition-colors flex items-center gap-1">
            <Zap className="w-3 h-3" /> Quick Scan <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {TOOL_CATALOG.filter(t => t.id !== 'dashboard' && t.id !== 'settings' && t.id !== 'docs').slice(0, 12).map((tool, i) => {
            const toolMap: Record<string, any> = {
              'quick-scan': Zap, 'dns': Globe, 'mx': Send, 'blacklist': ShieldAlert,
              'spf': FileText, 'dkim': KeyRound, 'dmarc': ShieldCheck, 'smtp': Server,
              'ports': Scan, 'rdns': ArrowLeftRight, 'headers': Mail, 'whois': Search,
              'mtasts': Shield, 'tlsrpt': Lock, 'bimi': Sparkles, 'dnssec': Shield,
              'relay': AlertTriangle, 'catchall': Mail, 'deliverability': BarChart3,
              'propagation': Globe, 'subdomains': Layers, 'geo': Database,
              'email': Mail, 'tls': Lock, 'http': Globe, 'sanitize': ShieldAlert,
              'tld': Globe, 'batch': Layers, 'monitor': Monitor,
            }
            const Icon = toolMap[tool.id] || Globe
            return (
              <button
                key={tool.id}
                onClick={() => navigate(tool.path)}
                className="group relative p-4 rounded-2xl bg-surface border border-border hover:border-accent/30 hover:bg-surface-hover transition-all duration-200 card-interactive text-left"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {tool.badge === 'new' && (
                  <span className="absolute top-2 right-2 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-accent/15 text-accent">New</span>
                )}
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-surface-2 to-surface flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Icon className="w-4 h-4 text-text-secondary group-hover:text-accent transition-colors" />
                </div>
                <div className="text-[13px] font-semibold text-text-primary truncate">{tool.label}</div>
                <div className="text-[10px] text-text-muted truncate mt-0.5">{tool.description}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Usage chart */}
      {totalScans > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Last 7 Days</span>
              <span className="ml-auto text-xs text-text-muted">{compactNumber(dailyCounts.reduce((a, b) => a + b, 0))} scans</span>
            </div>
            <div className="flex items-end gap-2 h-32">
              {days.map((day, i) => {
                const pct = (dailyCounts[i] / maxDaily) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group/bar">
                    <span className="text-[10px] font-mono text-text-muted h-4 tabular-nums">{dailyCounts[i] || ''}</span>
                    <div className="w-full rounded-t-lg bg-gradient-to-t from-accent to-accent-2 transition-all duration-700 relative overflow-hidden animate-bar-rise"
                      style={{ height: `${Math.max(dailyCounts[i] > 0 ? 10 : 3, pct)}%`, animationDelay: `${i * 80}ms` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 opacity-0 group-hover/bar:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-[9px] text-text-muted uppercase font-medium">
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Tool Usage</span>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {Object.entries(toolStats)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([tool, count]) => (
                  <div key={tool} className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary min-w-24 truncate">{tool}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all duration-700"
                        style={{ width: `${(count / maxToolCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-text-muted min-w-6 text-right tabular-nums">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent scans */}
      {recentScans.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-text-muted" />
            <h2 className="text-sm font-semibold">Recent Scans</h2>
          </div>
          <div className="space-y-1">
            {recentScans.map(entry => {
              const tool = TOOL_CATALOG.find(t => t.label === entry.tool)
              const path = tool?.path || `/${entry.tool.toLowerCase().replace(/\s+/g, '-')}`
              return (
                <button
                  key={entry.id}
                  onClick={() => navigate(`${path}?q=${encodeURIComponent(entry.value)}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface border border-border hover:border-border-hover hover:bg-surface-hover transition-all text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-text-primary truncate">{entry.value}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent/10 text-accent font-medium flex-shrink-0">{entry.tool}</span>
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">{timeAgo(entry.timestamp)}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Compare modal */}
      {compareTool && (() => {
        const history = getHistory(compareTool as any)
        if (history.length < 2) return null
        const oldEntry = history[compareOldIdx]
        const newEntry = history[compareNewIdx]
        const toolLabel = TOOL_CATALOG.find(t => t.id === compareTool)?.label || compareTool
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in" onClick={() => setCompareTool(null)}>
            <div className="glass-strong rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-2">
                  <GitCompareArrows className="w-4 h-4 text-accent" />
                  <h3 className="text-base font-semibold">Compare: {toolLabel}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowUnchanged(!showUnchanged)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-2 border border-border text-text-secondary hover:text-text-primary transition-colors">
                    {showUnchanged ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showUnchanged ? 'Hide unchanged' : 'Show unchanged'}
                  </button>
                  <button onClick={() => setCompareTool(null)} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors">
                    <XCircle className="w-4 h-4 text-text-muted" />
                  </button>
                </div>
              </div>
              <div className="p-5 overflow-y-auto max-h-[70vh]">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <select value={compareOldIdx} onChange={(e) => setCompareOldIdx(Number(e.target.value))} className="px-2 py-1 rounded-lg bg-surface-2 border border-border text-[11px] font-mono text-text-secondary focus:outline-none focus:border-accent/50">
                    {history.map((entry, i) => <option key={i} value={i} disabled={i === compareNewIdx}>{entry.value} — {timeAgo(entry.timestamp)}</option>)}
                  </select>
                  <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
                  <select value={compareNewIdx} onChange={(e) => setCompareNewIdx(Number(e.target.value))} className="px-2 py-1 rounded-lg bg-surface-2 border border-border text-[11px] font-mono text-text-secondary focus:outline-none focus:border-accent/50">
                    {history.map((entry, i) => <option key={i} value={i} disabled={i === compareOldIdx}>{entry.value} — {timeAgo(entry.timestamp)}</option>)}
                  </select>
                </div>
                <ScanDiffView oldEntry={oldEntry} newEntry={newEntry} showUnchanged={showUnchanged} />
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, gradient, sub }: any) {
  return (
    <div className="relative p-4 rounded-2xl bg-surface border border-border overflow-hidden group hover:border-border-hover transition-all">
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-20 group-hover:opacity-30 transition-opacity', gradient)} />
      <div className="relative flex items-center justify-between mb-2">
        <div className={cn('w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center', color)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="relative text-2xl font-bold tabular-nums">{value}</div>
      <div className="relative text-[11px] text-text-muted mt-0.5">{label}</div>
      {sub && <div className="relative text-[10px] text-text-secondary mt-1">{sub}</div>}
    </div>
  )
}

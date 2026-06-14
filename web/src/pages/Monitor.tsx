import { useState } from 'react'
import { Monitor as MonitorIcon, Plus, Trash2, Loader2, Activity, CheckCircle2, AlertTriangle, XCircle, Wifi, WifiOff, Globe, Server, Shield, Search } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { api } from '@/lib/api'
import { useMonitors } from '@/lib/store'
import { useToast } from '@/components/Toast'
import { cn, timeAgo } from '@/lib/utils'

const TOOL_OPTIONS = [
  { id: 'dns', label: 'DNS Lookup' },
  { id: 'mx', label: 'MX Lookup' },
  { id: 'spf', label: 'SPF Check' },
  { id: 'dmarc', label: 'DMARC Check' },
  { id: 'blacklist', label: 'Blacklist' },
  { id: 'smtp', label: 'SMTP Test' },
  { id: 'deliverability', label: 'Deliverability' },
]

export default function Monitor() {
  const { monitors, wsConnected, removeMonitor } = useMonitors()
  const { toast } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [tool, setTool] = useState('dns')
  const [interval, setInterval] = useState(60)
  const [type, setType] = useState<'domain' | 'ip' | 'host'>('domain')
  const [adding, setAdding] = useState(false)

  const add = async () => {
    if (!value.trim() || !name.trim()) return
    setAdding(true)
    try {
      const entry = { name: name.trim(), type, tool, value: value.trim(), interval }
      await api.monitorAdd(entry)
      toast('Monitor added', 'success')
      setName(''); setValue('')
      setShowAdd(false)
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setAdding(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await api.monitorRemove(id)
      removeMonitor(id)
      toast('Monitor removed', 'success')
    } catch (e: any) {
      toast(e.message, 'error')
    }
  }

  return (
    <div>
      <PageHeader
        icon={MonitorIcon}
        title="Live Monitor"
        subtitle="Continuous health checks via WebSocket"
        gradient="from-fuchsia-500/20 to-pink-500/10"
        badge="new"
        actions={
          <div className="flex items-center gap-2">
            <div className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium',
              wsConnected ? 'bg-success-muted text-success' : 'bg-danger-muted text-danger'
            )}>
              {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {wsConnected ? 'Connected' : 'Offline'}
            </div>
            <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-2 text-white text-xs font-medium shadow-lg shadow-accent/20">
              <Plus className="w-3.5 h-3.5" />
              Add Monitor
            </button>
          </div>
        }
      >
        {showAdd && (
          <div className="p-4 rounded-2xl bg-surface border border-border space-y-3 animate-fade-in-scale">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Display name (e.g. 'Production MX')"
                className="h-10 px-3 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:border-accent/50"
              />
              <input
                value={value} onChange={(e) => setValue(e.target.value)}
                placeholder="Target (domain / IP / host)"
                className="h-10 px-3 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:border-accent/50"
              />
              <select value={tool} onChange={(e) => setTool(e.target.value)} className="h-10 px-3 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:border-accent/50">
                {TOOL_OPTIONS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <select value={type} onChange={(e) => setType(e.target.value as any)} className="h-10 px-3 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:border-accent/50">
                <option value="domain">Domain</option>
                <option value="ip">IP Address</option>
                <option value="host">Host</option>
              </select>
              <input
                type="number" value={interval} onChange={(e) => setInterval(Number(e.target.value) || 60)}
                placeholder="Interval (seconds, min 10)"
                className="h-10 px-3 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:border-accent/50"
              />
              <button onClick={add} disabled={adding || !name.trim() || !value.trim()} className="h-10 px-4 rounded-xl bg-accent text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Add
              </button>
            </div>
          </div>
        )}
      </PageHeader>

      {monitors.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface border border-border">
          <Activity className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <h3 className="text-sm font-semibold mb-1">No monitors yet</h3>
          <p className="text-xs text-text-muted">Add a monitor to start receiving real-time health updates via WebSocket</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 animate-fade-in-up">
          {monitors.map(m => {
            const status = m.last_status || 'pending'
            const isError = status === 'error'
            const isWarn = status === 'warning'
            const isOk = status === 'ok'
            return (
              <div key={m.id} className={cn('p-4 rounded-2xl border',
                isError ? 'bg-danger-muted border-danger/30' :
                isWarn ? 'bg-warning-muted border-warning/30' :
                isOk ? 'bg-success-muted border-success/30' :
                'bg-surface border-border'
              )}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isError ? <XCircle className="w-4 h-4 text-danger" /> :
                       isWarn ? <AlertTriangle className="w-4 h-4 text-warning" /> :
                       isOk ? <CheckCircle2 className="w-4 h-4 text-success" /> :
                       <Activity className="w-4 h-4 text-text-muted animate-pulse" />}
                      <span className="text-sm font-semibold truncate">{m.name}</span>
                    </div>
                    <div className="text-[10px] text-text-muted font-mono truncate mt-0.5">{m.value}</div>
                  </div>
                  <button onClick={() => remove(m.id)} className="p-1 rounded hover:bg-danger-muted transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-text-muted hover:text-danger" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-text-muted">
                  <span className="px-1.5 py-0.5 rounded bg-surface-2 font-mono uppercase">{m.tool}</span>
                  <span>Every {m.interval}s</span>
                  {m.last_check ? <span>· Last check {timeAgo(m.last_check)}</span> : <span>· Waiting…</span>}
                </div>
                {m.history && m.history.length > 0 && (
                  <div className="mt-3 flex items-end gap-0.5 h-6">
                    {m.history.slice(-30).map((h: any, i: number) => (
                      <div
                        key={i}
                        className={cn('flex-1 rounded-sm',
                          h.status === 'error' ? 'bg-danger' :
                          h.status === 'warning' ? 'bg-warning' :
                          h.status === 'ok' ? 'bg-success' : 'bg-text-muted'
                        )}
                        style={{ height: '100%', minWidth: 2 }}
                        title={new Date(h.timestamp * 1000).toLocaleString()}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

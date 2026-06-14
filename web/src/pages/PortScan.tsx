import { useState } from 'react'
import { Scan, Loader2, Search, AlertTriangle, Circle } from 'lucide-react'
import { api } from '@/lib/api'
import { useDomain, useHistory, useScanResults } from '@/lib/store'
import { PortScanSkeleton } from '@/components/Skeleton'
import ExportButton from '@/components/ExportButton'

export default function PortScan() {
  const { domain: sharedDomain, ip: sharedIp, setDomain, setIp: setStoreIp } = useDomain()
  const { addHistory } = useHistory()
  const { setLastResult } = useScanResults()
  const [host, setHost] = useState(sharedIp || sharedDomain || '')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runScan = async () => {
    const val = host.trim()
    if (!val) return
    setDomain(val)
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(val)) setStoreIp(val)
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await api.scan(val)
      setResult(res.data)
      setLastResult('ports', val, res.data)
      addHistory(val, 'Port Scanner')
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  const openPorts = result?.ports?.filter((p: any) => p.state === 'open') || []
  const closedPorts = result?.ports?.filter((p: any) => p.state === 'closed') || []

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/10 flex items-center justify-center">
          <Scan className="w-5 h-5 text-pink-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Port Scanner</h1>
          <p className="text-sm text-text-secondary">Scan common mail and service ports on a host</p>
        </div>
      </div>

      <div className="flex gap-3">
        <input type="text" value={host} onChange={(e) => setHost(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runScan()}
          placeholder="Enter hostname or IP (e.g. smtp.gmail.com)"
          className="flex-1 h-11 px-4 rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
        <button onClick={runScan} disabled={loading || !host.trim()}
          className="h-11 px-6 rounded-xl bg-gradient-to-r from-accent to-purple-500 hover:from-accent-hover hover:to-purple-400 disabled:opacity-50 text-white text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-accent/25">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Scan
        </button>
      </div>

      {error && <div className="flex items-center gap-2 p-4 rounded-xl bg-danger-muted border border-danger/20 text-danger text-sm"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}</div>}

      {loading && <PortScanSkeleton />}

      {!loading && result && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <span>Host: <span className="font-mono text-text-primary">{result.host}</span></span>
              {result.ip && <span>IP: <span className="font-mono text-text-primary">{result.ip}</span></span>}
              <span className="text-text-muted">· {result.duration_ms}ms</span>
            </div>
            <ExportButton data={result} filename={`portscan-${result.host}`} />
          </div>

          {openPorts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-success">Open Ports ({openPorts.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {openPorts.map((p: any) => (
                  <div key={p.port} className="flex items-center justify-between py-2 px-4 rounded-xl bg-success-muted border border-success/20">
                    <div className="flex items-center gap-3">
                      <Circle className="w-2 h-2 fill-success text-success" />
                      <span className="text-sm font-mono font-semibold text-text-primary">{p.port}</span>
                      <span className="text-xs text-text-secondary">{p.name}</span>
                    </div>
                    {p.banner && <span className="text-xs font-mono text-text-muted max-w-48 truncate">{p.banner}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {closedPorts.length > 0 && (
            <details className="group">
              <summary className="text-xs font-semibold uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-secondary transition-colors">
                Closed/Filtered Ports ({closedPorts.length})
              </summary>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-1">
                {closedPorts.map((p: any) => (
                  <div key={p.port} className="py-1.5 px-3 rounded-lg bg-surface border border-border text-xs font-mono text-text-muted text-center">
                    {p.port}/{p.state}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

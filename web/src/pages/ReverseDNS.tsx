import { useState } from 'react'
import { ArrowLeftRight, Loader2, Search, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useDomain, useHistory, useScanResults } from '@/lib/store'
import { RDNSSkeleton } from '@/components/Skeleton'
import ExportButton from '@/components/ExportButton'

export default function ReverseDNS() {
  const { domain: sharedDomain, ip: sharedIp, setDomain, setIp: setStoreIp } = useDomain()
  const { addHistory } = useHistory()
  const { setLastResult } = useScanResults()
  const [ip, setIp] = useState(sharedIp || sharedDomain || '')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runLookup = async () => {
    const val = ip.trim()
    if (!val) return
    setDomain(val)
    setStoreIp(val)
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await api.rdns(ip.trim())
      setResult(res.data)
      setLastResult('rdns', ip.trim(), res.data)
      addHistory(ip.trim(), 'Reverse DNS')
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center">
          <ArrowLeftRight className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Reverse DNS Lookup</h1>
          <p className="text-sm text-text-secondary">PTR record lookup for IP addresses</p>
        </div>
      </div>

      <div className="flex gap-3">
        <input type="text" value={ip} onChange={(e) => setIp(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runLookup()}
          placeholder="Enter IP address (e.g. 8.8.8.8)"
          className="flex-1 h-11 px-4 rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
        <button onClick={runLookup} disabled={loading || !ip.trim()}
          className="h-11 px-6 rounded-xl bg-gradient-to-r from-accent to-purple-500 hover:from-accent-hover hover:to-purple-400 disabled:opacity-50 text-white text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-accent/25">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Lookup
        </button>
      </div>

      {error && <div className="flex items-center gap-2 p-4 rounded-xl bg-danger-muted border border-danger/20 text-danger text-sm"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}</div>}

      {loading && <RDNSSkeleton />}

      {!loading && result && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Reverse DNS for <span className="font-mono text-text-primary">{result.ip}</span>
              <span className="text-text-muted">· {result.duration_ms}ms</span>
            </div>
            <ExportButton data={result} filename={`rdns-${result.ip}`} />
          </div>

          {result.hosts && result.hosts.length > 0 ? (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">PTR Records</h3>
              {result.hosts.map((h: string, i: number) => (
                <div key={i} className="py-3 px-4 rounded-xl bg-surface border border-border hover:border-border-hover transition-colors">
                  <span className="text-sm font-mono text-accent">{h}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-warning-muted border border-warning/20 text-warning text-sm">
              No PTR records found for this IP address.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

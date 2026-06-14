import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Globe, Loader2, Search, AlertTriangle, CheckCircle2, Copy } from 'lucide-react'
import { api } from '@/lib/api'
import { useDomain, useHistory, useScanResults } from '@/lib/store'
import ExportButton from '@/components/ExportButton'
import { DNSSkeleton } from '@/components/Skeleton'

export default function DNSLookup() {
  const [searchParams] = useSearchParams()
  const { domain: sharedDomain, setDomain, setIp } = useDomain()
  const { addHistory } = useHistory()
  const { setLastResult } = useScanResults()
  const [domain, setDomainLocal] = useState(searchParams.get('q') || sharedDomain || '')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const q = searchParams.get('q')
  useEffect(() => {
    if (q) {
      setDomainLocal(q)
      runLookup(q)
    }
  }, [q])

  const runLookup = async (d?: string) => {
    const target = (d || domain).trim()
    if (!target) return
    setDomain(target)
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await api.dns(target)
      setResult(res.data)
      setLastResult('dns', target, res.data)
      // Extract primary A record IP for IP-consuming pages
      const firstA = res.data?.a?.[0]
      if (firstA?.ip) setIp(firstA.ip)
      addHistory(target, 'DNS Lookup')
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)

  const RecordSection = ({ title, records }: { title: string; records: any[] }) => (
    records && records.length > 0 ? (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">{title}</h3>
        <div className="space-y-1.5">
          {records.map((r: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-surface border border-border group hover:border-border-hover transition-colors">
              <span className="text-sm font-mono text-text-primary break-all">
                {r.host || r.ip || r.text || r.target || JSON.stringify(r)}
              </span>
              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                {r.priority !== undefined && <span className="text-xs text-text-muted">prio: {r.priority}</span>}
                <button onClick={() => copyToClipboard(r.host || r.ip || r.text || '')}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-surface-hover">
                  <Copy className="w-3.5 h-3.5 text-text-muted hover:text-text-primary" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
          <Globe className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">DNS Lookup</h1>
          <p className="text-sm text-text-secondary">Query MX, A, AAAA, TXT, NS, SOA, CNAME records</p>
        </div>
      </div>

      <div className="flex gap-3">
        <input type="text" value={domain} onChange={(e) => setDomainLocal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runLookup()}
          placeholder="Enter domain (e.g. google.com)"
          className="flex-1 h-11 px-4 rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
        <button onClick={() => runLookup()} disabled={loading || !domain.trim()}
          className="h-11 px-6 rounded-xl bg-gradient-to-r from-accent to-purple-500 hover:from-accent-hover hover:to-purple-400 disabled:opacity-50 text-white text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-accent/25">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Lookup
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-danger-muted border border-danger/20 text-danger text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {loading && <DNSSkeleton />}

      {!loading && result && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Results for <span className="font-mono text-text-primary">{result.domain}</span>
              <span className="text-text-muted">· {result.duration_ms}ms</span>
            </div>
            <ExportButton data={result} filename={`dns-${result.domain}`} />
          </div>
          {result.warn && (
            <div className="p-3 rounded-xl bg-warning-muted border border-warning/20 text-warning text-sm">{result.warn}</div>
          )}
          <RecordSection title="MX Records" records={result.mx} />
          <RecordSection title="A Records" records={result.a} />
          <RecordSection title="AAAA Records" records={result.aaaa} />
          <RecordSection title="TXT Records" records={result.txt} />
          <RecordSection title="NS Records" records={result.ns} />
          <RecordSection title="CNAME" records={result.cname ? [result.cname] : []} />
        </div>
      )}
    </div>
  )
}

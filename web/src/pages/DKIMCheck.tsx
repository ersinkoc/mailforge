import { useState } from 'react'
import { KeyRound, Loader2, Search, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react'
import { api } from '@/lib/api'
import { useDomain, useHistory, useScanResults } from '@/lib/store'
import { DKIMSkeleton } from '@/components/Skeleton'
import ExportButton from '@/components/ExportButton'

export default function DKIMCheck() {
  const { domain: sharedDomain, setDomain } = useDomain()
  const { addHistory } = useHistory()
  const { setLastResult } = useScanResults()
  const [domain, setDomainLocal] = useState(sharedDomain || '')
  const [selector, setSelector] = useState('default')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runCheck = async () => {
    if (!domain.trim()) return
    setDomain(domain.trim())
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await api.dkim(domain.trim(), selector.trim())
      setResult(res.data)
      setLastResult('dkim', domain.trim(), res.data)
      addHistory(domain.trim(), 'DKIM Check')
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
          <KeyRound className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">DKIM Check</h1>
          <p className="text-sm text-text-secondary">Verify DomainKeys Identified Mail public keys</p>
        </div>
      </div>

      <div className="flex gap-3">
        <input type="text" value={domain} onChange={(e) => setDomainLocal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runCheck()}
          placeholder="Domain"
          className="flex-1 h-11 px-4 rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
        <input type="text" value={selector} onChange={(e) => setSelector(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runCheck()}
          placeholder="Selector (default)"
          className="w-40 h-11 px-4 rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
        <button onClick={runCheck} disabled={loading || !domain.trim()}
          className="h-11 px-6 rounded-xl bg-gradient-to-r from-accent to-purple-500 hover:from-accent-hover hover:to-purple-400 disabled:opacity-50 text-white text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-accent/25">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Check
        </button>
      </div>

      <div className="text-xs text-text-muted">Common selectors: default, google, selector1, selector2, k1, s1, mail, dkim</div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-danger-muted border border-danger/20 text-danger text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {loading && <DKIMSkeleton />}

      {!loading && result && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <CheckCircle2 className="w-4 h-4 text-success" />
              DKIM results for <span className="font-mono text-text-primary">{result.domain}</span>
              <span className="text-text-muted">· {result.duration_ms}ms</span>
            </div>
            <ExportButton data={result} filename={`dkim-${result.domain}`} />
          </div>
          <div className={`flex items-center gap-3 p-4 rounded-2xl border ${result.valid ? 'bg-success-muted border-success/20' : 'bg-danger-muted border-danger/20'}`}>
            {result.valid ? <CheckCircle2 className="w-5 h-5 text-success" /> : <XCircle className="w-5 h-5 text-danger" />}
            <div>
              <span className={`font-semibold ${result.valid ? 'text-success' : 'text-danger'}`}>
                {result.valid ? 'Valid DKIM Record' : 'Invalid DKIM'}
              </span>
              <span className="text-xs text-text-muted ml-2">· {result.selector}._domainkey.{result.domain}</span>
            </div>
          </div>

          {result.record && (
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Raw Record</h3>
              <code className="text-sm font-mono text-accent break-all">{result.record}</code>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Key Type', value: result.key_type || 'N/A' },
              { label: 'Key Size', value: result.key_size ? `${result.key_size} bits` : 'N/A' },
              { label: 'Flags', value: result.flags || 'N/A' },
              { label: 'Service', value: result.service_type || 'N/A' },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-xl bg-surface border border-border text-center">
                <div className="text-xs text-text-muted">{item.label}</div>
                <div className="text-sm font-mono font-semibold text-text-primary mt-1">{item.value}</div>
              </div>
            ))}
          </div>

          {result.notes && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-surface border border-border text-sm text-text-secondary">
              <Info className="w-4 h-4 flex-shrink-0" />{result.notes}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

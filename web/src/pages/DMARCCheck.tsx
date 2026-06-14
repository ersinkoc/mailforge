import { useState } from 'react'
import { ShieldCheck, Loader2, Search, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react'
import { api } from '@/lib/api'
import { useDomain, useHistory, useScanResults } from '@/lib/store'
import { DMARCSkeleton } from '@/components/Skeleton'
import ExportButton from '@/components/ExportButton'

export default function DMARCCheck() {
  const { domain: sharedDomain, setDomain } = useDomain()
  const { addHistory } = useHistory()
  const { setLastResult } = useScanResults()
  const [domain, setDomainLocal] = useState(sharedDomain || '')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runCheck = async () => {
    if (!domain.trim()) return
    setDomain(domain.trim())
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await api.dmarc(domain.trim())
      setResult(res.data)
      setLastResult('dmarc', domain.trim(), res.data)
      addHistory(domain.trim(), 'DMARC Check')
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  const policyColor = (p: string) => p === 'reject' ? 'text-success' : p === 'quarantine' ? 'text-warning' : 'text-danger'

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">DMARC Check</h1>
          <p className="text-sm text-text-secondary">Validate Domain-based Message Authentication policy</p>
        </div>
      </div>

      <div className="flex gap-3">
        <input type="text" value={domain} onChange={(e) => setDomainLocal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runCheck()}
          placeholder="Enter domain (e.g. google.com)"
          className="flex-1 h-11 px-4 rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
        <button onClick={runCheck} disabled={loading || !domain.trim()}
          className="h-11 px-6 rounded-xl bg-gradient-to-r from-accent to-purple-500 hover:from-accent-hover hover:to-purple-400 disabled:opacity-50 text-white text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-accent/25">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Check DMARC
        </button>
      </div>

      {error && <div className="flex items-center gap-2 p-4 rounded-xl bg-danger-muted border border-danger/20 text-danger text-sm"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}</div>}

      {loading && <DMARCSkeleton />}

      {!loading && result && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <CheckCircle2 className="w-4 h-4 text-success" />
              DMARC results for <span className="font-mono text-text-primary">{result.domain}</span>
              <span className="text-text-muted">· {result.duration_ms}ms</span>
            </div>
            <ExportButton data={result} filename={`dmarc-${result.domain}`} />
          </div>
          <div className={`flex items-center gap-3 p-4 rounded-2xl border ${result.valid ? 'bg-success-muted border-success/20' : 'bg-danger-muted border-danger/20'}`}>
            {result.valid ? <CheckCircle2 className="w-5 h-5 text-success" /> : <XCircle className="w-5 h-5 text-danger" />}
            <div>
              <span className={`font-semibold ${result.valid ? 'text-success' : 'text-danger'}`}>
                {result.valid ? 'Valid DMARC Record' : 'No DMARC Record Found'}
              </span>
              {result.policy && <span className="text-xs text-text-muted ml-2">· _dmarc.{result.domain}</span>}
            </div>
          </div>

          {result.record && (
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Raw Record</h3>
              <code className="text-sm font-mono text-accent break-all">{result.record}</code>
            </div>
          )}

          {result.policy && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Policy', value: result.policy },
                { label: 'Sub-Domain Policy', value: result.sub_policy || 'inherit' },
                { label: 'Percent', value: `${result.percent || 100}%` },
                { label: 'DKIM Align', value: result.adkim || 'r' },
                { label: 'SPF Align', value: result.aspf || 'r' },
                { label: 'Aggregate (rua)', value: result.rua || 'Not set' },
                { label: 'Forensic (ruf)', value: result.ruf || 'Not set' },
                { label: 'Version', value: 'DMARC1' },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-xl bg-surface border border-border">
                  <div className="text-xs text-text-muted">{item.label}</div>
                  <div className={`text-sm font-mono font-semibold mt-1 ${item.label === 'Policy' ? policyColor(item.value) : 'text-text-primary'}`}>{item.value}</div>
                </div>
              ))}
            </div>
          )}

          {result.warnings?.length > 0 && (
            <div className="space-y-1.5">
              {result.warnings.map((w: string, i: number) => (
                <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-warning-muted border border-warning/20 text-warning text-sm">
                  <Info className="w-4 h-4 flex-shrink-0" />{w}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Lock, Loader2, CheckCircle2, XCircle, AlertTriangle, Server, Shield } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import SearchInput from '@/components/SearchInput'
import ExportButton from '@/components/ExportButton'
import { api } from '@/lib/api'
import { useDomain, useHistory, useScanResults } from '@/lib/store'
import { cn, timeAgo } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import { ResultSkeleton } from '@/components/Skeleton'

export default function MTASTSCheck() {
  const [params] = useSearchParams()
  const { domain, setDomain } = useDomain()
  const { addHistory } = useHistory()
  const { setLastResult, getLastResult } = useScanResults()
  const { toast } = useToast()
  const [input, setInput] = useState(domain || params.get('q') || '')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cached = getLastResult('mtasts')
  useEffect(() => { if (cached && !data) { setData(cached.result); setInput(cached.value) } }, [cached])
  useEffect(() => { setInput(domain || params.get('q') || '') }, [domain, params])

  const run = async () => {
    if (!input.trim()) return
    setDomain(input.trim())
    setLoading(true)
    setError(null)
    try {
      const res = await api.mtasts(input.trim())
      setData(res.data)
      setLastResult('mtasts', input.trim(), res.data)
      addHistory(input.trim(), 'MTA-STS Check')
      toast('MTA-STS check complete', 'success')
    } catch (e: any) {
      setError(e.message)
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader icon={Lock} title="MTA-STS Check" subtitle="Verify MTA Strict Transport Security policy" gradient="from-blue-500/20 to-cyan-500/10" badge="new">
        <SearchInput value={input} onChange={setInput} onSubmit={run} loading={loading} placeholder="Enter domain (e.g. google.com)" buttonLabel="Check" buttonIcon={Lock} size="md" />
      </PageHeader>

      {loading && <ResultSkeleton />}

      {error && !loading && (
        <div className="p-4 rounded-2xl bg-danger-muted border border-danger/30 text-sm text-danger">{error}</div>
      )}

      {data && !loading && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between p-5 rounded-2xl bg-surface border border-border">
            <div className="flex items-center gap-3">
              {data.valid ? <CheckCircle2 className="w-8 h-8 text-success" /> : <XCircle className="w-8 h-8 text-danger" />}
              <div>
                <div className="text-base font-semibold">{data.valid ? 'MTA-STS Policy Valid' : 'MTA-STS Not Configured'}</div>
                <div className="text-xs text-text-secondary font-mono">{data.domain} · fetched in {data.duration_ms}ms</div>
              </div>
            </div>
            <ExportButton data={data} filename={`mtasts-${data.domain}`} label="Export" />
          </div>

          {data.mode && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-surface border border-border">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Mode</div>
                <div className={cn('text-xl font-bold', data.mode === 'enforce' ? 'text-success' : data.mode === 'testing' ? 'text-warning' : 'text-text-secondary')}>{data.mode}</div>
              </div>
              <div className="p-4 rounded-2xl bg-surface border border-border">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Max Age</div>
                <div className="text-xl font-bold">{data.max_age ? `${data.max_age}s` : '—'}</div>
              </div>
              <div className="p-4 rounded-2xl bg-surface border border-border">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">MX Rules</div>
                <div className="text-xl font-bold">{data.mx?.length || 0}</div>
              </div>
            </div>
          )}

          {data.mx && data.mx.length > 0 && (
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Server className="w-4 h-4 text-text-secondary" />
                <h3 className="text-sm font-semibold">Authorized MX Hosts</h3>
              </div>
              <div className="space-y-1">
                {data.mx.map((m: string, i: number) => (
                  <div key={i} className="px-3 py-2 rounded-lg bg-surface-2 font-mono text-xs">{m}</div>
                ))}
              </div>
            </div>
          )}

          {data.warnings && data.warnings.length > 0 && (
            <div className="p-4 rounded-2xl bg-warning-muted border border-warning/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <h3 className="text-sm font-semibold text-warning">Warnings</h3>
              </div>
              <ul className="text-xs space-y-1 text-text-secondary">
                {data.warnings.map((w: string, i: number) => <li key={i}>• {w}</li>)}
              </ul>
            </div>
          )}

          {data.errors && data.errors.length > 0 && (
            <div className="p-4 rounded-2xl bg-danger-muted border border-danger/30">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-danger" />
                <h3 className="text-sm font-semibold text-danger">Errors</h3>
              </div>
              <ul className="text-xs space-y-1 text-text-secondary">
                {data.errors.map((e: string, i: number) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}

          {data.fetched_from && (
            <div className="p-3 rounded-xl bg-surface-2 border border-border text-[10px] text-text-muted font-mono">
              Source: <a href={data.fetched_from} target="_blank" rel="noreferrer" className="text-accent link-underline">{data.fetched_from}</a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

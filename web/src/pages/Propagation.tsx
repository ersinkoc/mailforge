import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Globe, CheckCircle2, XCircle, Server, Loader2, Zap } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import SearchInput from '@/components/SearchInput'
import ExportButton from '@/components/ExportButton'
import { api } from '@/lib/api'
import { useDomain, useHistory, useScanResults } from '@/lib/store'
import { useToast } from '@/components/Toast'
import { cn, formatDuration } from '@/lib/utils'
import { ResultSkeleton } from '@/components/Skeleton'

export default function Propagation() {
  const [params] = useSearchParams()
  const { domain, setDomain } = useDomain()
  const { addHistory } = useHistory()
  const { setLastResult, getLastResult } = useScanResults()
  const { toast } = useToast()
  const [input, setInput] = useState(domain || params.get('q') || '')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (!input.trim()) return
    setDomain(input.trim())
    setLoading(true); setError(null)
    try {
      const res = await api.propagation(input.trim())
      setData(res.data)
      setLastResult('propagation', input.trim(), res.data)
      addHistory(input.trim(), 'DNS Propagation')
      toast('Propagation check complete', 'success')
    } catch (e: any) { setError(e.message); toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <div>
      <PageHeader icon={Globe} title="DNS Propagation" subtitle="Check DNS records from 8 global resolvers" gradient="from-sky-500/20 to-blue-500/10" badge="new">
        <SearchInput value={input} onChange={setInput} onSubmit={run} loading={loading} placeholder="Enter domain (e.g. google.com)" buttonLabel="Propagate" buttonIcon={Globe} size="md" />
      </PageHeader>

      {loading && <ResultSkeleton />}
      {error && !loading && <div className="p-4 rounded-2xl bg-danger-muted border border-danger/30 text-sm text-danger">{error}</div>}

      {data && !loading && (
        <div className="space-y-4 animate-fade-in-up">
          <div className={cn('flex items-center justify-between p-5 rounded-2xl border',
            data.consistent ? 'bg-success-muted border-success/30' : 'bg-warning-muted border-warning/30'
          )}>
            <div className="flex items-center gap-3">
              {data.consistent ? <CheckCircle2 className="w-8 h-8 text-success" /> : <XCircle className="w-8 h-8 text-warning" />}
              <div>
                <div className="text-base font-bold">{data.consistent ? 'Globally Consistent' : 'Propagation In Progress'}</div>
                <div className="text-xs text-text-secondary font-mono">{data.domain} · A record: {data.record || '(none)'}</div>
              </div>
            </div>
            <ExportButton data={data} filename={`propagation-${data.domain}`} label="Export" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.servers?.map((s: any, i: number) => (
              <div key={i} className={cn('p-4 rounded-2xl border smooth-all',
                s.reached ? 'bg-surface border-border' : 'bg-danger-muted border-danger/30'
              )}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-text-secondary" />
                    <div>
                      <div className="text-sm font-mono font-semibold">{s.server}</div>
                      <div className="text-[10px] text-text-muted">{s.location}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                    {s.latency ? <><Zap className="w-3 h-3" /> {s.latency}ms</> : s.reached ? null : <XCircle className="w-3 h-3 text-danger" />}
                  </div>
                </div>
                {s.reached ? (
                  <div className="space-y-1">
                    {s.values?.map((v: string, j: number) => (
                      <div key={j} className="px-2 py-1.5 rounded-lg bg-surface-2 font-mono text-xs">{v}</div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-text-muted">Unreachable</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

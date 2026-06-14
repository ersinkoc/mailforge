import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart3, CheckCircle2, XCircle, AlertTriangle, Sparkles, Shield, Mail, Lock, Server } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import SearchInput from '@/components/SearchInput'
import ExportButton from '@/components/ExportButton'
import { api } from '@/lib/api'
import { useDomain, useHistory, useScanResults } from '@/lib/store'
import { useToast } from '@/components/Toast'
import { ResultSkeleton } from '@/components/Skeleton'
import { cn, getGradeColor } from '@/lib/utils'

export default function Deliverability() {
  const [params] = useSearchParams()
  const { domain, setDomain } = useDomain()
  const { addHistory } = useHistory()
  const { setLastResult, getLastResult } = useScanResults()
  const { toast } = useToast()
  const [input, setInput] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cached = getLastResult('deliverability')
  useEffect(() => {
    const initial = domain || params.get('q') || ''
    setInput(initial)
    if (cached && !data) { setData(cached.result); setInput(cached.value) }
  }, [cached, domain, params])

  const run = async () => {
    if (!input.trim()) return
    setDomain(input.trim())
    setLoading(true); setError(null)
    try {
      const res = await api.deliverability(input.trim())
      setData(res.data)
      setLastResult('deliverability', input.trim(), res.data)
      addHistory(input.trim(), 'Deliverability Score')
      toast('Deliverability score calculated', 'success')
    } catch (e: any) { setError(e.message); toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const score = data?.score ?? 0
  const grade = data?.grade ?? 'F'
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (score / 100) * circumference

  return (
    <div>
      <PageHeader icon={BarChart3} title="Deliverability Score" subtitle="Aggregate email-auth health score with letter grade" gradient="from-amber-500/20 to-orange-500/10" badge="new">
        <SearchInput value={input} onChange={setInput} onSubmit={run} loading={loading} placeholder="Enter domain (e.g. google.com)" buttonLabel="Score" buttonIcon={BarChart3} size="md" />
      </PageHeader>

      {loading && <ResultSkeleton />}
      {error && !loading && <div className="p-4 rounded-2xl bg-danger-muted border border-danger/30 text-sm text-danger">{error}</div>}

      {data && !loading && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col items-center justify-center text-center">
              <div className="relative w-40 h-40">
                <svg className="w-40 h-40 -rotate-90" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r={radius} stroke="var(--color-border)" strokeWidth="10" fill="none" />
                  <circle
                    cx="80" cy="80" r={radius}
                    stroke={score >= 80 ? 'var(--color-success)' : score >= 60 ? 'var(--color-warning)' : 'var(--color-danger)'}
                    strokeWidth="10" fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className={cn('text-5xl font-bold tabular-nums', getGradeColor(grade))}>{score}</div>
                  <div className={cn('text-2xl font-bold', getGradeColor(grade))}>Grade {grade}</div>
                </div>
              </div>
              <div className="text-sm text-text-secondary mt-4">{data.domain}</div>
            </div>

            <div className="p-5 rounded-2xl bg-surface border border-border">
              <h3 className="text-sm font-semibold mb-3">Component Breakdown</h3>
              <div className="space-y-2.5">
                <ComponentRow name="SPF" check={data.spf} />
                <ComponentRow name="DKIM" check={data.dkim} />
                <ComponentRow name="DMARC" check={data.dmarc} />
                <ComponentRow name="MTA-STS" check={data.mtasts} />
                <ComponentRow name="TLS-RPT" check={data.tlsrpt} />
                <ComponentRow name="BIMI" check={data.bimi} />
                <ComponentRow name="DNSSEC" check={data.dnssec} />
                <ComponentRow name="Blacklist" check={data.blacklist} />
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <ExportButton data={data} filename={`deliverability-${data.domain}`} />
              </div>
            </div>
          </div>

          {data.recommendations && data.recommendations.length > 0 && (
            <div className="p-5 rounded-2xl bg-surface border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold">Recommendations</h3>
              </div>
              <ul className="space-y-2">
                {data.recommendations.map((r: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-text-secondary">
                    <div className="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                    <span className="flex-1">{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ComponentRow({ name, check }: any) {
  const pct = check?.score ?? 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-secondary min-w-20 font-medium">{name}</span>
      <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700',
            pct === 100 ? 'bg-success' :
            pct >= 40 ? 'bg-warning' : 'bg-danger'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center gap-1 min-w-12 justify-end">
        {check?.valid ? <CheckCircle2 className="w-3 h-3 text-success" /> : pct > 0 ? <AlertTriangle className="w-3 h-3 text-warning" /> : <XCircle className="w-3 h-3 text-danger" />}
        <span className="text-[10px] font-mono tabular-nums text-text-muted">{pct}%</span>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Mail, CheckCircle2, XCircle, AlertTriangle, Sparkles, Shield, ShieldOff, AtSign } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import SearchInput from '@/components/SearchInput'
import ExportButton from '@/components/ExportButton'
import { api } from '@/lib/api'
import { useDomain, useHistory, useScanResults } from '@/lib/store'
import { useToast } from '@/components/Toast'
import { ResultSkeleton } from '@/components/Skeleton'
import { cn, getScoreColor } from '@/lib/utils'

export default function EmailValidator() {
  const [params] = useSearchParams()
  const { setDomain } = useDomain()
  const { addHistory } = useHistory()
  const { setLastResult, getLastResult } = useScanResults()
  const { toast } = useToast()
  const [input, setInput] = useState(params.get('q') || '')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (!input.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await api.email(input.trim())
      setData(res.data)
      setLastResult('email', input.trim(), res.data)
      addHistory(input.trim(), 'Email Validator')
      toast('Email validated', 'success')
    } catch (e: any) { setError(e.message); toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const score = data?.score ?? 0
  const riskColor = data?.risk === 'low' ? 'text-success' : data?.risk === 'medium' ? 'text-warning' : 'text-danger'

  return (
    <div>
      <PageHeader icon={Mail} title="Email Validator" subtitle="Multi-factor email validation with risk scoring" gradient="from-pink-500/20 to-rose-500/10" badge="new">
        <SearchInput value={input} onChange={setInput} onSubmit={run} loading={loading} placeholder="user@example.com" buttonLabel="Validate" buttonIcon={Mail} size="md" />
      </PageHeader>

      {loading && <ResultSkeleton />}
      {error && !loading && <div className="p-4 rounded-2xl bg-danger-muted border border-danger/30 text-sm text-danger">{error}</div>}

      {data && !loading && (
        <div className="space-y-4 animate-fade-in-up">
          {data.suggestion && (
            <div className="p-3 rounded-2xl bg-warning-muted border border-warning/30 flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-warning" />
              <div className="text-xs">
                <span className="text-text-muted">Did you mean: </span>
                <span className="font-mono font-semibold text-text-primary">{data.suggestion}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-5 rounded-2xl bg-surface border border-border">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {data.format_valid && data.mx_present ? <CheckCircle2 className="w-8 h-8 text-success" /> : <XCircle className="w-8 h-8 text-danger" />}
              <div className="min-w-0">
                <div className="text-base font-bold truncate font-mono">{data.email}</div>
                <div className={cn('text-xs uppercase tracking-wider font-semibold mt-0.5', riskColor)}>Risk: {data.risk}</div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className={cn('text-3xl font-bold tabular-nums', getScoreColor(score))}>{score}</div>
              <div className="text-[10px] text-text-muted uppercase">score</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Pill ok={data.format_valid} label="RFC 5322" />
            <Pill ok={data.mx_present} label="MX Records" />
            <Pill ok={!data.disposable} label="Not Disposable" />
            <Pill ok={!data.role_based} label="Not Role-Based" />
          </div>

          {data.checks && data.checks.length > 0 && (
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <h3 className="text-sm font-semibold mb-3">Checklist</h3>
              <div className="space-y-1.5">
                {data.checks.map((c: any, i: number) => (
                  <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-surface-2 transition-colors">
                    {c.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" /> : <XCircle className="w-3.5 h-3.5 text-danger flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold">{c.name}</span>
                        <span className="text-[10px] text-text-muted">+{c.weight}pt</span>
                      </div>
                      <div className="text-[11px] text-text-muted">{c.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.mx_records && data.mx_records.length > 0 && (
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <div className="flex items-center gap-2 mb-2">
                <AtSign className="w-4 h-4 text-text-secondary" />
                <h3 className="text-sm font-semibold">MX Mail Servers</h3>
              </div>
              <div className="space-y-1">
                {data.mx_records.map((m: string, i: number) => (
                  <div key={i} className="px-3 py-2 rounded-lg bg-surface-2 font-mono text-xs">{m}</div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <ExportButton data={data} filename={`email-${data.email}`} label="Export" />
          </div>
        </div>
      )}
    </div>
  )
}

function Pill({ ok, label }: { ok: boolean, label: string }) {
  return (
    <div className={cn('flex items-center gap-1.5 p-2.5 rounded-xl border text-xs',
      ok ? 'bg-success-muted border-success/20' : 'bg-danger-muted border-danger/20'
    )}>
      {ok ? <Shield className="w-3.5 h-3.5 text-success" /> : <ShieldOff className="w-3.5 h-3.5 text-danger" />}
      <span className={cn('font-medium', ok ? 'text-success' : 'text-danger')}>{label}</span>
    </div>
  )
}

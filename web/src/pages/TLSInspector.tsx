import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Lock, Shield, AlertTriangle, CheckCircle2, XCircle, Calendar, Hash, Server } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import ExportButton from '@/components/ExportButton'
import { api } from '@/lib/api'
import { useDomain, useHistory, useScanResults } from '@/lib/store'
import { useToast } from '@/components/Toast'
import { ResultSkeleton } from '@/components/Skeleton'
import { cn, getGradeColor } from '@/lib/utils'
import SearchInput from '@/components/SearchInput'

export default function TLSInspector() {
  const [params] = useSearchParams()
  const { domain, setDomain } = useDomain()
  const { addHistory } = useHistory()
  const { setLastResult, getLastResult } = useScanResults()
  const { toast } = useToast()
  const [host, setHost] = useState(domain || params.get('q') || '')
  const [port, setPort] = useState(443)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (!host.trim()) return
    setDomain(host.trim())
    setLoading(true); setError(null)
    try {
      const res = await api.tls(host.trim(), port)
      setData(res.data)
      setLastResult('tls', host.trim(), res.data)
      addHistory(host.trim(), 'TLS Inspector')
      toast('TLS inspection complete', 'success')
    } catch (e: any) { setError(e.message); toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <div>
      <PageHeader icon={Lock} title="TLS Inspector" subtitle="Certificate grade, chain, and HSTS" gradient="from-indigo-500/20 to-violet-500/10" badge="new">
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchInput value={host} onChange={setHost} onSubmit={run} loading={loading} placeholder="example.com" buttonLabel="Inspect" buttonIcon={Lock} size="md" />
          </div>
          <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value) || 443)} className="w-24 h-11 px-3 rounded-xl bg-surface border border-border text-text-primary text-sm focus:outline-none focus:border-accent/50" />
        </div>
      </PageHeader>

      {loading && <ResultSkeleton />}
      {error && !loading && <div className="p-4 rounded-2xl bg-danger-muted border border-danger/30 text-sm text-danger">{error}</div>}

      {data && !loading && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between p-5 rounded-2xl bg-surface border border-border">
            <div className="flex items-center gap-4">
              <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold',
                data.reachable ? 'bg-surface-2' : 'bg-danger-muted'
              )}>
                <span className={getGradeColor(data.grade || 'F')}>{data.grade || 'F'}</span>
              </div>
              <div>
                <div className="text-base font-bold">{data.reachable ? `TLS Grade: ${data.grade}` : 'TLS Failed'}</div>
                <div className="text-xs font-mono text-text-secondary">{data.host}:{data.port} · {data.duration_ms}ms</div>
                {data.version && <div className="text-[10px] text-text-muted mt-0.5">{data.version} · {data.cipher || ''}</div>}
              </div>
            </div>
            <ExportButton data={data} filename={`tls-${data.host}`} label="Export" />
          </div>

          {data.certificate && (
            <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-text-secondary" />
                <h3 className="text-sm font-semibold">Certificate</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <Field label="Subject" value={data.certificate.subject} />
                <Field label="Issuer" value={data.certificate.issuer} />
                <Field label="Valid From" value={data.certificate.not_before} />
                <Field label="Valid Until" value={data.certificate.not_after} />
                <Field label="Key Algorithm" value={`${data.certificate.key_alg} ${data.certificate.key_bits}-bit`} />
                <Field label="Signature" value={data.certificate.signature_alg} />
                <Field label="Days Left" value={`${data.certificate.days_left} days`} highlight={data.certificate.days_left < 30 ? 'danger' : 'success'} />
                <Field label="Self-Signed" value={data.certificate.self_signed ? 'Yes' : 'No'} highlight={data.certificate.self_signed ? 'warning' : 'success'} />
              </div>
              {data.certificate.sans && data.certificate.sans.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">Subject Alternative Names</div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.certificate.sans.map((san: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-surface-2 text-[10px] font-mono">{san}</span>
                    ))}
                  </div>
                </div>
              )}
              {data.certificate.fingerprint_sha256 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5 flex items-center gap-1"><Hash className="w-3 h-3" /> SHA-256 Fingerprint</div>
                  <div className="px-3 py-2 rounded-lg bg-surface-2 font-mono text-[10px] break-all">{data.certificate.fingerprint_sha256}</div>
                </div>
              )}
            </div>
          )}

          {data.chain && data.chain.length > 0 && (
            <div className="p-5 rounded-2xl bg-surface border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Server className="w-4 h-4 text-text-secondary" />
                <h3 className="text-sm font-semibold">Certificate Chain ({data.chain.length + 1})</h3>
              </div>
              <div className="space-y-2">
                {[data.certificate, ...data.chain].map((c: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-surface-2 border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-text-muted">#{i + 1}</span>
                      {c.expired ? <XCircle className="w-3 h-3 text-danger" /> : c.valid ? <CheckCircle2 className="w-3 h-3 text-success" /> : <AlertTriangle className="w-3 h-3 text-warning" />}
                      <span className="text-xs font-mono font-semibold truncate">{c.subject}</span>
                    </div>
                    <div className="text-[10px] text-text-muted font-mono truncate">Issued by: {c.issuer}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.issues && data.issues.length > 0 && (
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-1.5">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <h3 className="text-sm font-semibold">Issues</h3>
              </div>
              {data.issues.map((issue: any, i: number) => (
                <div key={i} className={cn('flex items-start gap-2 p-2 rounded-lg text-xs',
                  issue.severity === 'critical' ? 'bg-danger-muted text-danger' :
                  issue.severity === 'warning' ? 'bg-warning-muted text-warning' :
                  'bg-info-muted text-info'
                )}>
                  <span className="font-mono text-[10px] flex-shrink-0">[{issue.code}]</span>
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, highlight }: { label: string, value: any, highlight?: 'success' | 'warning' | 'danger' }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-0.5">{label}</div>
      <div className={cn('text-xs font-mono break-all',
        highlight === 'danger' ? 'text-danger' :
        highlight === 'warning' ? 'text-warning' :
        highlight === 'success' ? 'text-success' : ''
      )}>{value || '—'}</div>
    </div>
  )
}

import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Server } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import SearchInput from '@/components/SearchInput'
import ExportButton from '@/components/ExportButton'
import { api } from '@/lib/api'
import { useDomain, useHistory, useScanResults } from '@/lib/store'
import { useToast } from '@/components/Toast'
import { ResultSkeleton } from '@/components/Skeleton'
import { cn } from '@/lib/utils'

export default function RelayTest() {
  const [params] = useSearchParams()
  const { domain: storedHost, setDomain } = useDomain()
  const { addHistory } = useHistory()
  const { setLastResult, getLastResult } = useScanResults()
  const { toast } = useToast()
  const [host, setHost] = useState(storedHost || params.get('q') || '')
  const [port, setPort] = useState(25)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cached = getLastResult('relay')

  const run = async () => {
    if (!host.trim()) return
    setDomain(host.trim())
    setLoading(true); setError(null)
    try {
      const res = await api.relay(host.trim(), port)
      setData(res.data)
      setLastResult('relay', host.trim(), res.data)
      addHistory(host.trim(), 'Open Relay Test')
      toast('Open relay test complete', 'success')
    } catch (e: any) { setError(e.message); toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <div>
      <PageHeader icon={ShieldAlert} title="Open Relay Test" subtitle="Test if an SMTP server is an open relay" gradient="from-red-500/20 to-rose-500/10" badge="new">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <SearchInput value={host} onChange={setHost} onSubmit={run} loading={loading} placeholder="mail.example.com" buttonLabel="Test" buttonIcon={ShieldAlert} size="md" />
          </div>
          <div className="sm:w-24">
            <input
              type="number" value={port} onChange={(e) => setPort(Number(e.target.value) || 25)}
              placeholder="Port"
              className="w-full h-11 px-3 rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent/50"
            />
          </div>
        </div>
      </PageHeader>

      {loading && <ResultSkeleton />}
      {error && !loading && <div className="p-4 rounded-2xl bg-danger-muted border border-danger/30 text-sm text-danger">{error}</div>}

      {data && !loading && (
        <div className="space-y-4 animate-fade-in-up">
          <div className={cn('flex items-center justify-between p-5 rounded-2xl border',
            data.open_relay ? 'bg-danger-muted border-danger/30' : 'bg-success-muted border-success/30'
          )}>
            <div className="flex items-center gap-3">
              {data.open_relay ? <XCircle className="w-8 h-8 text-danger" /> : <CheckCircle2 className="w-8 h-8 text-success" />}
              <div>
                <div className="text-base font-bold">
                  {data.open_relay ? '⚠ Open Relay Detected' : 'Not an Open Relay'}
                </div>
                <div className="text-xs font-mono text-text-secondary">{data.host}:{data.port} · {data.duration_ms}ms</div>
              </div>
            </div>
            <ExportButton data={data} filename={`relay-${data.host}`} label="Export" />
          </div>

          <div className="space-y-2">
            {data.tests?.map((test: any, i: number) => (
              <div key={i} className={cn('p-4 rounded-2xl border',
                test.vulnerable ? 'bg-danger-muted border-danger/30' : 'bg-surface border-border'
              )}>
                <div className="flex items-start gap-3">
                  {test.vulnerable ? <XCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{test.name}</div>
                    <div className="text-xs text-text-secondary mt-0.5">{test.description}</div>
                    <div className={cn('text-[10px] font-mono mt-1.5', test.vulnerable ? 'text-danger' : 'text-success')}>{test.result}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data.warnings && data.warnings.length > 0 && (
            <div className="p-4 rounded-2xl bg-danger-muted border border-danger/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-danger" />
                <h3 className="text-sm font-semibold text-danger">Critical</h3>
              </div>
              <ul className="text-xs space-y-1 text-text-secondary">
                {data.warnings.map((w: string, i: number) => <li key={i}>• {w}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

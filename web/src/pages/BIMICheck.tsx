import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Sparkles, CheckCircle2, XCircle, AlertTriangle, Image as ImageIcon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import SearchInput from '@/components/SearchInput'
import ExportButton from '@/components/ExportButton'
import { api } from '@/lib/api'
import { useDomain, useHistory, useScanResults } from '@/lib/store'
import { useToast } from '@/components/Toast'
import { ResultSkeleton } from '@/components/Skeleton'

export default function BIMICheck() {
  const [params] = useSearchParams()
  const { domain, setDomain } = useDomain()
  const { addHistory } = useHistory()
  const { setLastResult, getLastResult } = useScanResults()
  const { toast } = useToast()
  const [input, setInput] = useState(domain || params.get('q') || '')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cached = getLastResult('bimi')
  useEffect(() => { if (cached && !data) { setData(cached.result); setInput(cached.value) } }, [cached])
  useEffect(() => { setInput(domain || params.get('q') || '') }, [domain, params])

  const run = async () => {
    if (!input.trim()) return
    setDomain(input.trim())
    setLoading(true); setError(null)
    try {
      const res = await api.bimi(input.trim())
      setData(res.data)
      setLastResult('bimi', input.trim(), res.data)
      addHistory(input.trim(), 'BIMI Check')
      toast('BIMI check complete', 'success')
    } catch (e: any) { setError(e.message); toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <div>
      <PageHeader icon={Sparkles} title="BIMI Check" subtitle="Brand Indicators for Message Identification" gradient="from-fuchsia-500/20 to-pink-500/10" badge="new">
        <SearchInput value={input} onChange={setInput} onSubmit={run} loading={loading} placeholder="Enter domain (e.g. cisco.com)" buttonLabel="Check" buttonIcon={Sparkles} size="md" />
      </PageHeader>

      {loading && <ResultSkeleton />}
      {error && !loading && <div className="p-4 rounded-2xl bg-danger-muted border border-danger/30 text-sm text-danger">{error}</div>}

      {data && !loading && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between p-5 rounded-2xl bg-surface border border-border">
            <div className="flex items-center gap-3">
              {data.valid ? <CheckCircle2 className="w-8 h-8 text-success" /> : <XCircle className="w-8 h-8 text-danger" />}
              <div>
                <div className="text-base font-semibold">{data.valid ? 'BIMI Record Found' : 'No BIMI Record'}</div>
                <div className="text-xs text-text-secondary font-mono">{data.domain} · fetched in {data.duration_ms}ms</div>
              </div>
            </div>
            <ExportButton data={data} filename={`bimi-${data.domain}`} label="Export" />
          </div>

          {data.location && (
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-text-secondary" />
                <h3 className="text-sm font-semibold">SVG Logo</h3>
              </div>
              <div className="p-3 rounded-lg bg-surface-2 font-mono text-xs break-all">{data.location}</div>
              {data.location.endsWith('.svg') && (
                <div className="flex justify-center p-4 rounded-lg bg-white">
                  <img src={data.location} alt="BIMI logo" className="max-h-32" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                </div>
              )}
            </div>
          )}

          {data.authority && (
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
              <h3 className="text-sm font-semibold">VMC Authority</h3>
              <div className="p-3 rounded-lg bg-surface-2 font-mono text-xs break-all">{data.authority}</div>
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
        </div>
      )}
    </div>
  )
}

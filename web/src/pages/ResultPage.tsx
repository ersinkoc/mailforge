import { useState, useEffect, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, AlertTriangle, Loader2, type LucideIcon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import SearchInput from '@/components/SearchInput'
import ExportButton from '@/components/ExportButton'
import { api } from '@/lib/api'
import { useDomain, useHistory, useScanResults, type ScanToolType } from '@/lib/store'
import { useToast } from '@/components/Toast'
import { ResultSkeleton } from '@/components/Skeleton'
import { cn, timeAgo } from '@/lib/utils'

export interface ResultPageConfig {
  tool: ScanToolType
  toolLabel: string
  icon: LucideIcon
  subtitle: string
  gradient: string
  badge?: string
  placeholder: string
  apiCall: (input: string) => Promise<any>
  isValid: (data: any) => boolean
  renderSummary: (data: any) => ReactNode
  renderDetails: (data: any) => ReactNode
}

interface ResultPageProps extends ResultPageConfig {
  validateInput?: (input: string) => string | null
}

export default function ResultPage({
  tool, toolLabel, icon, subtitle, gradient, badge,
  placeholder, apiCall, isValid, renderSummary, renderDetails,
  validateInput,
}: ResultPageProps) {
  const [params] = useSearchParams()
  const { domain, setDomain } = useDomain()
  const { addHistory } = useHistory()
  const { setLastResult, getLastResult } = useScanResults()
  const { toast } = useToast()
  const [input, setInput] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cached = getLastResult(tool)
  useEffect(() => {
    const initial = domain || params.get('q') || ''
    setInput(initial)
    if (cached && !data) { setData(cached.result); setInput(cached.value) }
  }, [cached, domain, params])

  const run = async () => {
    if (!input.trim()) return
    if (validateInput) {
      const err = validateInput(input.trim())
      if (err) { setError(err); toast(err, 'error'); return }
    }
    setDomain(input.trim())
    setLoading(true); setError(null)
    try {
      const res = await apiCall(input.trim())
      setData(res.data)
      setLastResult(tool, input.trim(), res.data)
      addHistory(input.trim(), toolLabel)
      toast(`${toolLabel} complete`, 'success')
    } catch (e: any) { setError(e.message); toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const valid = data ? isValid(data) : false

  return (
    <div>
      <PageHeader icon={icon} title={toolLabel} subtitle={subtitle} gradient={gradient} badge={badge}>
        <SearchInput value={input} onChange={setInput} onSubmit={run} loading={loading} placeholder={placeholder} buttonLabel="Check" buttonIcon={icon} size="md" />
      </PageHeader>

      {loading && <ResultSkeleton />}
      {error && !loading && <div className="p-4 rounded-2xl bg-danger-muted border border-danger/30 text-sm text-danger">{error}</div>}

      {data && !loading && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between p-5 rounded-2xl bg-surface border border-border">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {valid ? <CheckCircle2 className="w-8 h-8 text-success flex-shrink-0" /> : <XCircle className="w-8 h-8 text-danger flex-shrink-0" />}
              <div className="min-w-0">
                <div className="text-base font-semibold truncate">{renderSummary(data)}</div>
                {data.domain && <div className="text-xs text-text-secondary font-mono truncate">{data.domain}{data.duration_ms ? ` · ${data.duration_ms}ms` : ''}</div>}
                {data.host && <div className="text-xs text-text-secondary font-mono truncate">{data.host}{data.duration_ms ? ` · ${data.duration_ms}ms` : ''}</div>}
              </div>
            </div>
            <ExportButton data={data} filename={`${tool}-${data.domain || data.host || data.ip || 'result'}`} label="Export" />
          </div>

          {renderDetails(data)}
        </div>
      )}
    </div>
  )
}

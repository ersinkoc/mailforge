import { Globe, Shield, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import ResultPage from './ResultPage'
import { api } from '@/lib/api'
import { cn, getGradeColor } from '@/lib/utils'

export default function HTTPHeaders() {
  return (
    <ResultPage
      tool="http"
      toolLabel="HTTP Headers"
      icon={Globe}
      subtitle="Security headers & server fingerprint"
      gradient="from-cyan-500/20 to-sky-500/10"
      badge="new"
      placeholder="https://example.com"
      apiCall={(url) => api.http(url)}
      isValid={(d) => d.reachable}
      renderSummary={(d) => `${d.status_code} ${d.status_text || ''}`}
      renderDetails={(d) => <HTTPDetail data={d} />}
    />
  )
}

function HTTPDetail({ data }: { data: any }) {
  const [showAll, setShowAll] = useState(false)
  return (
    <>
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface border border-border">
        <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-extrabold',
          data.reachable ? 'bg-surface-2' : 'bg-danger-muted'
        )}>
          <span className={getGradeColor(data.grade || 'F')}>{data.grade || 'F'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">{data.score}/100 · {data.server || 'Unknown server'}</div>
          <div className="text-[10px] text-text-muted font-mono truncate">{data.url} · {data.duration_ms}ms</div>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-surface border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-text-secondary" />
          <h3 className="text-sm font-semibold">Security Headers</h3>
        </div>
        <div className="space-y-1.5">
          {data.security?.map((sh: any) => (
            <div key={sh.name} className={cn('flex items-center gap-3 p-2.5 rounded-xl border text-xs',
              sh.status === 'good' ? 'bg-success-muted border-success/20' : 'bg-danger-muted border-danger/20'
            )}>
              {sh.status === 'good' ? <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-danger flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{sh.name}</div>
                {sh.value && <div className="text-[10px] font-mono text-text-secondary truncate">{sh.value}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {data.all_headers && Object.keys(data.all_headers).length > 0 && (
        <div className="p-4 rounded-2xl bg-surface border border-border">
          <button onClick={() => setShowAll(!showAll)} className="w-full flex items-center justify-between text-sm font-semibold">
            <span>All Response Headers ({Object.keys(data.all_headers).length})</span>
            {showAll ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {showAll && (
            <div className="mt-3 space-y-1">
              {Object.entries(data.all_headers).map(([k, v]) => (
                <div key={k} className="flex items-start gap-2 p-2 rounded-lg bg-surface-2 text-[11px]">
                  <span className="font-mono font-semibold text-accent min-w-fit">{k}:</span>
                  <span className="font-mono text-text-secondary break-all flex-1">{v as string}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

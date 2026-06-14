import { Shield, AlertTriangle } from 'lucide-react'
import ResultPage from './ResultPage'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function DNSSECCheck() {
  return (
    <ResultPage
      tool="dnssec"
      toolLabel="DNSSEC Check"
      icon={Shield}
      subtitle="Validate DNSSEC chain of trust for a domain"
      gradient="from-indigo-500/20 to-violet-500/10"
      badge="new"
      placeholder="Enter domain (e.g. internetsociety.org)"
      apiCall={(d) => api.dnssec(d)}
      isValid={(d) => d.secure}
      renderSummary={(d) => d.secure ? 'DNSSEC Validated' : 'DNSSEC Status Indeterminate'}
      renderDetails={(d) => (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Chain Status</div>
              <div className={cn('text-xl font-bold', d.secure ? 'text-success' : 'text-warning')}>{d.secure ? 'Secure' : 'Indeterminate'}</div>
            </div>
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">DS Record</div>
              <div className="text-xl font-bold">{d.has_ds ? 'Present' : 'Not found'}</div>
            </div>
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Algorithm</div>
              <div className="text-sm font-mono">{d.algorithm || 'Unknown'}</div>
            </div>
          </div>
          {d.warnings && d.warnings.length > 0 && (
            <div className="p-4 rounded-2xl bg-warning-muted border border-warning/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <h3 className="text-sm font-semibold text-warning">Notes</h3>
              </div>
              <ul className="text-xs space-y-1 text-text-secondary">
                {d.warnings.map((w: string, i: number) => <li key={i}>• {w}</li>)}
              </ul>
            </div>
          )}
        </>
      )}
    />
  )
}

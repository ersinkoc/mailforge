import { Mail, CheckCircle2, XCircle, Server } from 'lucide-react'
import ResultPage from './ResultPage'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function CatchAll() {
  return (
    <ResultPage
      tool="catchall"
      toolLabel="Catch-All Test"
      icon={Mail}
      subtitle="Detect catch-all email domains"
      gradient="from-violet-500/20 to-purple-500/10"
      badge="new"
      placeholder="Enter domain (e.g. gmail.com)"
      apiCall={(d) => api.catchall(d)}
      isValid={(d) => !d.is_catch_all}
      renderSummary={(d) => d.is_catch_all ? '⚠ Catch-All Domain' : 'Not a Catch-All Domain'}
      renderDetails={(d) => (
        <>
          {d.mx && d.mx.length > 0 && (
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Server className="w-4 h-4 text-text-secondary" />
                <h3 className="text-sm font-semibold">MX Servers Tested</h3>
              </div>
              <div className="space-y-1">
                {d.mx.map((m: string, i: number) => (
                  <div key={i} className="px-3 py-2 rounded-lg bg-surface-2 font-mono text-xs">{m}</div>
                ))}
              </div>
            </div>
          )}

          {d.tests && d.tests.length > 0 && (
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <h3 className="text-sm font-semibold mb-3">Probe Results</h3>
              <div className="space-y-1.5">
                {d.tests.map((t: any, i: number) => (
                  <div key={i} className={cn('flex items-center gap-3 p-3 rounded-xl border text-xs',
                    t.result?.includes('Accepted') ? 'bg-danger-muted border-danger/20' :
                    t.result?.includes('Rejected') ? 'bg-success-muted border-success/20' : 'bg-surface-2 border-border'
                  )}>
                    {t.result?.includes('Accepted') ? <XCircle className="w-3.5 h-3.5 text-danger" /> :
                     t.result?.includes('Rejected') ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> :
                     <Mail className="w-3.5 h-3.5 text-text-muted" />}
                    <span className="font-mono flex-1 truncate">{t.email}</span>
                    <span className="text-text-secondary truncate">{t.result}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    />
  )
}

import { Layers, Globe, CheckCircle2 } from 'lucide-react'
import ResultPage from './ResultPage'
import { api } from '@/lib/api'

export default function Subdomains() {
  return (
    <ResultPage
      tool="subdomains"
      toolLabel="Subdomain Discovery"
      icon={Layers}
      subtitle="Enumerate subdomains from a curated wordlist"
      gradient="from-teal-500/20 to-cyan-500/10"
      badge="new"
      placeholder="Enter domain (e.g. github.com)"
      apiCall={(d) => api.subdomains(d)}
      isValid={(d) => d.count > 0}
      renderSummary={(d) => `${d.count} subdomain${d.count !== 1 ? 's' : ''} discovered`}
      renderDetails={(d) => (
        <div className="p-4 rounded-2xl bg-surface border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-text-secondary" />
            <h3 className="text-sm font-semibold">Discovered Subdomains</h3>
          </div>
          {d.count === 0 ? (
            <div className="text-xs text-text-muted">No subdomains found in the wordlist. Try a different domain.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-96 overflow-y-auto">
              {d.found.map((s: string, i: number) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 font-mono text-xs">
                  <CheckCircle2 className="w-3 h-3 text-success flex-shrink-0" />
                  <span className="truncate">{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    />
  )
}

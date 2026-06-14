import { Globe, ChevronRight } from 'lucide-react'
import ResultPage from './ResultPage'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function TLDParser() {
  return (
    <ResultPage
      tool="tld"
      toolLabel="TLD Parser"
      icon={Globe}
      subtitle="Break any domain into TLD, SLD, and subdomain parts"
      gradient="from-emerald-500/20 to-green-500/10"
      badge="new"
      placeholder="mail.team.example.co.uk"
      apiCall={(d) => api.tld(d)}
      isValid={(d) => !d.error && !!d.tld}
      renderSummary={(d) => `Registrable: ${d.registrable}`}
      renderDetails={(d) => (
        <div className="p-5 rounded-2xl bg-surface border border-border">
          <div className="text-sm font-mono text-text-primary mb-4 break-all">{d.input}</div>

          <div className="flex items-center flex-wrap gap-2 text-sm">
            {d.subdomain && (
              <>
                <Pill label="Subdomain" value={d.subdomain} color="text-accent" />
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </>
            )}
            <Pill label="SLD" value={d.sld} color="text-info" />
            <ChevronRight className="w-4 h-4 text-text-muted" />
            <Pill label="TLD" value={d.tld} color="text-success" />
          </div>

          <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3 text-xs">
            <Field label="Registrable Domain" value={d.registrable} />
            <Field label="Known TLD" value={d.is_known_tld ? 'Yes' : 'No'} />
            <Field label="Private/Local TLD" value={d.is_private_tld ? 'Yes' : 'No'} />
            <Field label="Parts" value={`${d.subdomain ? 3 : 2}`} />
          </div>
        </div>
      )}
    />
  )
}

function Pill({ label, value, color }: any) {
  return (
    <div className={cn('px-3 py-2 rounded-lg bg-surface-2 border border-border', color)}>
      <div className="text-[9px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="font-mono font-semibold">{value}</div>
    </div>
  )
}

function Field({ label, value }: any) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="font-mono text-text-primary">{value}</div>
    </div>
  )
}

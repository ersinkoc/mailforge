import { Database, MapPin, Building2, Network, Shield, AlertTriangle } from 'lucide-react'
import ResultPage from './ResultPage'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function Geo() {
  return (
    <ResultPage
      tool="geo"
      toolLabel="IP Geolocation"
      icon={Database}
      subtitle="Country, city, ISP, ASN for any IP"
      gradient="from-blue-500/20 to-cyan-500/10"
      badge="new"
      placeholder="8.8.8.8"
      apiCall={(ip) => api.geo(ip)}
      isValid={(d) => !d.error}
      renderSummary={(d) => `${d.city || 'Unknown'}, ${d.country || '—'}`}
      renderDetails={(d) => (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Country</div>
              <div className="text-lg font-bold truncate">{d.country || '—'}</div>
              <div className="text-[10px] text-text-muted font-mono">{d.country_code || ''}</div>
            </div>
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Region</div>
              <div className="text-lg font-bold truncate">{d.region || '—'}</div>
            </div>
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">City</div>
              <div className="text-lg font-bold truncate">{d.city || '—'}</div>
              <div className="text-[10px] text-text-muted font-mono">{d.postal || ''}</div>
            </div>
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Timezone</div>
              <div className="text-sm font-mono truncate">{d.timezone || '—'}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-text-secondary" />
                <h3 className="text-sm font-semibold">Network</h3>
              </div>
              <div className="space-y-1.5 text-xs">
                <div><span className="text-text-muted">ISP: </span><span className="font-mono">{d.isp || '—'}</span></div>
                <div><span className="text-text-muted">Org: </span><span className="font-mono">{d.org || '—'}</span></div>
                <div><span className="text-text-muted">Reverse: </span><span className="font-mono">{d.reverse || '—'}</span></div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Network className="w-4 h-4 text-text-secondary" />
                <h3 className="text-sm font-semibold">ASN</h3>
              </div>
              {d.asn ? (
                <div className="space-y-1.5 text-xs">
                  <div><span className="text-text-muted">Number: </span><span className="font-mono">AS{d.asn}</span></div>
                  <div><span className="text-text-muted">Name: </span><span className="font-mono">{d.asn_org || '—'}</span></div>
                </div>
              ) : (
                <div className="text-xs text-text-muted">No ASN data</div>
              )}
            </div>
          </div>

          {(d.is_vpn || d.is_proxy || d.is_tor || d.is_hosting) && (
            <div className="p-4 rounded-2xl bg-warning-muted border border-warning/30">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-warning" />
                <h3 className="text-sm font-semibold text-warning">Anonymization / Hosting</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {d.is_vpn && <span className="px-2 py-1 rounded-md bg-warning/20 text-warning text-[10px] font-semibold uppercase">VPN</span>}
                {d.is_proxy && <span className="px-2 py-1 rounded-md bg-warning/20 text-warning text-[10px] font-semibold uppercase">Proxy</span>}
                {d.is_tor && <span className="px-2 py-1 rounded-md bg-danger/20 text-danger text-[10px] font-semibold uppercase">Tor</span>}
                {d.is_hosting && <span className="px-2 py-1 rounded-md bg-info/20 text-info text-[10px] font-semibold uppercase">Hosting</span>}
              </div>
            </div>
          )}
        </>
      )}
    />
  )
}

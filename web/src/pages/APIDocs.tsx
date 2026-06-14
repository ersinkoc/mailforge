import { useEffect, useState } from 'react'
import { BookOpen, Server, Activity, ChevronRight, Code, Copy, Check, Zap } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { api } from '@/lib/api'
import { cn, copyToClipboard } from '@/lib/utils'

const CATEGORIES: Record<string, string> = {
  GET: 'text-success',
  POST: 'text-info',
  DELETE: 'text-danger',
  WS: 'text-fuchsia-400',
}

export default function APIDocs() {
  const [endpoints, setEndpoints] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    api.openapi().then((res) => setEndpoints(res.endpoints || [])).finally(() => setLoading(false))
  }, [])

  const filtered = endpoints.filter(e => e.toLowerCase().includes(filter.toLowerCase()))

  const copy = async (text: string, key: string) => {
    if (await copyToClipboard(text)) {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    }
  }

  // Group by path
  const grouped = filtered.reduce((acc, ep) => {
    const match = ep.match(/^\s*(\S+)\s+(\/\S+)/)
    if (!match) return acc
    const method = match[1]
    const path = match[2]
    const category = path.split('/')[2] || 'other' // /api/X/...
    if (!acc[category]) acc[category] = []
    acc[category].push({ method, path, raw: ep.trim() })
    return acc
  }, {} as Record<string, { method: string, path: string, raw: string }[]>)

  return (
    <div>
      <PageHeader icon={BookOpen} title="API Documentation" subtitle="OpenAPI 3.0 reference for all 35+ endpoints" gradient="from-emerald-500/20 to-teal-500/10" badge="new">
        <input
          type="text" value={filter} onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter endpoints (e.g. dkim, batch, /api/monitor)…"
          className="w-full h-11 px-4 rounded-xl bg-surface border border-border text-sm focus:outline-none focus:border-accent/50"
        />
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <HealthCard title="API Status" endpoint="/api/health" icon={Zap} />
        <HealthCard title="Live Metrics" endpoint="/api/metrics" icon={Activity} />
        <HealthCard title="OpenAPI Spec" endpoint="/api/openapi" icon={Code} />
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-text-muted">Loading…</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort().map(([category, eps]) => (
            <div key={category}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-accent mb-2 capitalize">{category}</h2>
              <div className="rounded-2xl bg-surface border border-border overflow-hidden">
                {eps.map((ep, i) => (
                  <div key={i} className={cn('flex items-center gap-3 p-3 smooth-all hover:bg-surface-hover',
                    i > 0 && 'border-t border-border'
                  )}>
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider w-12 text-center flex-shrink-0',
                      CATEGORIES[ep.method] || 'text-text-secondary'
                    )}>{ep.method}</span>
                    <code className="text-xs font-mono text-text-primary flex-1 truncate">{ep.path}</code>
                    <button onClick={() => copy(ep.raw, ep.path)} className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors">
                      {copied === ep.path ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <ChevronRight className="w-3 h-3 text-text-muted" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 rounded-2xl bg-surface border border-border">
        <h3 className="text-sm font-semibold mb-3">Quick Start</h3>
        <pre className="px-4 py-3 rounded-lg bg-surface-2 font-mono text-[11px] overflow-x-auto">{`# Check DNS for a domain
curl http://localhost:8181/api/dns/google.com

# Get deliverability score
curl http://localhost:8181/api/deliverability/example.com

# Batch scan
curl -X POST http://localhost:8181/api/batch \\
  -H "Content-Type: application/json" \\
  -d '{"tool": "dns", "targets": ["google.com", "github.com"]}'

# Live monitor WebSocket
wscat -c ws://localhost:8181/ws/monitor`}</pre>
      </div>
    </div>
  )
}

function HealthCard({ title, endpoint, icon: Icon }: any) {
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    const t = setInterval(() => {
      fetch(`/api${endpoint.replace('/api', '')}`).then(r => r.json()).then(setData).catch(() => {})
    }, 5000)
    fetch(`/api${endpoint.replace('/api', '')}`).then(r => r.json()).then(setData).catch(() => {})
    return () => clearInterval(t)
  }, [endpoint])

  return (
    <div className="p-4 rounded-2xl bg-surface border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-accent" />
        <span className="text-xs font-semibold">{title}</span>
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
      </div>
      <code className="text-[10px] font-mono text-text-muted block truncate">{endpoint}</code>
      {data && (
        <div className="mt-2 text-[10px] text-text-secondary font-mono truncate">
          {data.status || data.openapi || `${data.total_requests || 0} reqs`}
        </div>
      )}
    </div>
  )
}

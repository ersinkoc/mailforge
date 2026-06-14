import { useState } from 'react'
import { Layers, Loader2, Download, CheckCircle2, XCircle, AlertTriangle, Zap } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { api } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { cn, downloadBlob, timeAgo } from '@/lib/utils'

const TOOLS = [
  { id: 'dns', label: 'DNS Lookup' },
  { id: 'mx', label: 'MX Lookup' },
  { id: 'blacklist', label: 'Blacklist Check' },
  { id: 'spf', label: 'SPF Check' },
  { id: 'dmarc', label: 'DMARC Check' },
  { id: 'rdns', label: 'Reverse DNS' },
  { id: 'deliverability', label: 'Deliverability Score' },
  { id: 'whois', label: 'WHOIS Lookup' },
] as const

export default function Batch() {
  const { toast } = useToast()
  const [tool, setTool] = useState<typeof TOOLS[number]['id']>('dns')
  const [targets, setTargets] = useState('google.com\nmicrosoft.com\ngithub.com\nstackoverflow.com\nwikipedia.org')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const list = targets.split('\n').map(t => t.trim()).filter(Boolean)

  const run = async () => {
    if (list.length === 0) return
    if (list.length > 50) {
      toast('Maximum 50 targets per batch', 'error')
      return
    }
    setLoading(true); setError(null); setResults([])
    try {
      const res = await api.batch(tool, list)
      setResults(res.data || [])
      toast(`Scanned ${res.count || list.length} targets`, 'success')
    } catch (e: any) { setError(e.message); toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const downloadCSV = () => {
    if (results.length === 0) return
    const rows: string[] = ['target,success,tool,key,value']
    for (const entry of results) {
      const flat: Record<string, any> = {}
      const walk = (obj: any, prefix = '') => {
        if (!obj || typeof obj !== 'object') return
        for (const [k, v] of Object.entries(obj)) {
          const key = prefix ? `${prefix}.${k}` : k
          if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, key)
          else flat[key] = v
        }
      }
      walk(entry.result, '')
      for (const [k, v] of Object.entries(flat)) {
        rows.push(`"${entry.target}","${entry.success}","${tool}","${k}","${String(v ?? '').replace(/"/g, '""')}"`)
      }
    }
    downloadBlob(rows.join('\n'), `batch-${tool}-${Date.now()}.csv`, 'text/csv')
    toast('CSV exported', 'success')
  }

  return (
    <div>
      <PageHeader icon={Layers} title="Batch Scanner" subtitle="Run any check against up to 50 targets in parallel" gradient="from-amber-500/20 to-orange-500/10" badge="new">
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {TOOLS.map(t => (
              <button
                key={t.id}
                onClick={() => setTool(t.id as any)}
                className={cn('px-3 py-2 rounded-xl text-xs font-medium transition-all',
                  tool === t.id
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'bg-surface-2 text-text-secondary border border-border hover:border-border-hover'
                )}
              >{t.label}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <textarea
                value={targets}
                onChange={(e) => setTargets(e.target.value)}
                rows={8}
                placeholder="One target per line&#10;google.com&#10;microsoft.com&#10;github.com"
                className="w-full px-4 py-3 rounded-2xl bg-surface border border-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent/50 transition-all resize-y font-mono"
              />
              <div className="flex items-center justify-between mt-1.5 text-[10px] text-text-muted">
                <span>{list.length} target{list.length !== 1 ? 's' : ''} parsed</span>
                <span>Max 50 per batch</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={run} disabled={loading || list.length === 0} className="h-12 px-5 rounded-xl bg-gradient-to-r from-accent to-accent-2 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/25 disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {loading ? `Scanning…` : `Scan ${list.length}`}
              </button>
              <button onClick={downloadCSV} disabled={results.length === 0} className="h-10 px-4 rounded-xl bg-surface-2 border border-border text-text-secondary text-sm font-medium transition-all flex items-center justify-center gap-2 hover:border-border-hover disabled:opacity-50">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>
        </div>
      </PageHeader>

      {error && <div className="p-4 rounded-2xl bg-danger-muted border border-danger/30 text-sm text-danger">{error}</div>}

      {results.length > 0 && (
        <div className="space-y-2 animate-fade-in-up">
          {results.map((entry: any, i: number) => (
            <div key={i} className={cn('p-4 rounded-2xl border flex items-center gap-3',
              entry.success ? 'bg-surface border-border' : 'bg-danger-muted border-danger/30'
            )}>
              {entry.success ? <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" /> : <XCircle className="w-4 h-4 text-danger flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-mono font-semibold truncate">{entry.target}</div>
                {entry.error && <div className="text-xs text-danger mt-0.5">{entry.error}</div>}
              </div>
              {entry.result && (
                <div className="text-[10px] text-text-muted">
                  {Object.keys(entry.result).filter(k => k !== 'duration_ms' && k !== 'error').length} fields
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

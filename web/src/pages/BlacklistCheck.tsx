import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShieldAlert, Loader2, Search, CheckCircle2, XCircle, AlertTriangle, Globe } from 'lucide-react'
import { api } from '@/lib/api'
import { useDomain, useHistory, useScanResults } from '@/lib/store'
import { BlacklistSkeleton } from '@/components/Skeleton'
import ExportButton from '@/components/ExportButton'

interface BulkResult {
  ip: string
  data?: any
  error?: string
}

export default function BlacklistCheck() {
  const [searchParams] = useSearchParams()
  const { domain: sharedDomain, ip: sharedIp, setDomain, setIp: setStoreIp } = useDomain()
  const { addHistory } = useHistory()
  const { setLastResult } = useScanResults()
  const [ip, setIp] = useState(sharedIp || sharedDomain || '')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(0)

  // Auto-run from ?ip= query param (supports comma-separated)
  const ipParam = searchParams.get('ip')
  useEffect(() => {
    if (ipParam) {
      const ips = ipParam.split(',').map(s => s.trim()).filter(Boolean)
      if (ips.length === 1) {
        setIp(ips[0])
        runCheckSingle(ips[0])
      } else if (ips.length > 1) {
        setIp(ips.join(', '))
        runBulkCheck(ips)
      }
    }
  }, [ipParam])

  const runCheckSingle = async (target?: string) => {
    const val = (target || ip).trim()
    if (!val) return
    setIp(val)
    setDomain(val)
    setStoreIp(val)
    setBulkResults([])
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await api.blacklist(val)
      setResult(res.data)
      setLastResult('blacklist', val, res.data)
      addHistory(val, 'Blacklist Check')
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  const runBulkCheck = async (ips: string[]) => {
    setBulkResults([])
    setBulkLoading(true); setError(''); setResult(null)
    setStoreIp(ips[0])
    setDomain(ips[0])
    const MAX_CONCURRENT = 5
    let completed = 0
    const validIps = ips.map(s => s.trim()).filter(Boolean)
    const total = validIps.length

    // Accumulate bulk stats locally (not React state, to avoid timing issues)
    let bulkTotal = 0
    let bulkListed = 0
    let bulkClean = 0

    // Semaphore-based concurrency limiter
    if (total === 0) { setBulkLoading(false); return }
    let running = 0
    let nextIdx = 0
    await new Promise<void>((resolve) => {
      const checkNext = () => {
        while (running < MAX_CONCURRENT && nextIdx < total) {
          const idx = nextIdx++
          const val = validIps[idx]
          running++
          api.blacklist(val).then((res) => {
            completed++
            setBulkProgress((completed / total) * 100)
            // Accumulate stats locally
            bulkTotal += res.data?.total_count || 0
            bulkListed += res.data?.listed_count || 0
            bulkClean += res.data?.clean_count || 0
            setBulkResults(prev => [...prev, { ip: val, data: res.data }])
          }).catch((e: any) => {
            completed++
            setBulkProgress((completed / total) * 100)
            setBulkResults(prev => [...prev, { ip: val, error: e.message }])
          }).finally(() => {
            running--
            if (completed >= total) resolve()
            else checkNext()
          })
        }
      }
      checkNext()
    })
    // Cache aggregated bulk results for Dashboard mini card
    setLastResult('blacklist', ips.join(', '), {
      total_count: bulkTotal,
      listed_count: bulkListed,
      clean_count: bulkClean,
      ip_count: validIps.length,
      bulk: true,
    })
    addHistory(ips.join(', '), 'Blacklist Check')
    setBulkLoading(false)
  }

  const handleSubmit = () => {
    const val = ip.trim()
    if (!val) return
    const ips = val.includes(',') ? val.split(',').map(s => s.trim()).filter(Boolean) : [val]
    if (ips.length === 1) runCheckSingle(ips[0])
    else runBulkCheck(ips)
  }

  const bulkTotal = bulkResults.reduce((s, r) => s + (r.data?.total_count || 0), 0)
  const bulkListed = bulkResults.reduce((s, r) => s + (r.data?.listed_count || 0), 0)
  const bulkClean = bulkResults.reduce((s, r) => s + (r.data?.clean_count || 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Blacklist Check</h1>
          <p className="text-sm text-text-secondary">Check IP against 20+ DNS-based blacklists (DNSBL)</p>
        </div>
      </div>

      <div className="flex gap-3">
        <input type="text" value={ip} onChange={(e) => setIp(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Enter IP address (e.g. 8.8.8.8) or comma-separated IPs"
          className="flex-1 h-11 px-4 rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
        <button onClick={handleSubmit} disabled={loading || bulkLoading || !ip.trim()}
          className="h-11 px-6 rounded-xl bg-gradient-to-r from-accent to-purple-500 hover:from-accent-hover hover:to-purple-400 disabled:opacity-50 text-white text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-accent/25">
          {(loading || bulkLoading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Check
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-danger-muted border border-danger/20 text-danger text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {loading && <BlacklistSkeleton />}

      {/* Single IP Result */}
      {!loading && !bulkLoading && result && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Blacklist results for <span className="font-mono text-text-primary">{result.ip}</span>
              <span className="text-text-muted">· {result.duration_ms}ms</span>
            </div>
            <ExportButton data={result} filename={`blacklist-${result.ip}`} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-surface border border-border text-center">
              <div className="text-2xl font-bold text-text-primary">{result.total_count}</div>
              <div className="text-xs text-text-muted mt-1">Total Lists</div>
            </div>
            <div className="p-4 rounded-2xl bg-danger-muted border border-danger/20 text-center">
              <div className="text-2xl font-bold text-danger">{result.listed_count}</div>
              <div className="text-xs text-danger/70 mt-1">Listed ⚠️</div>
            </div>
            <div className="p-4 rounded-2xl bg-success-muted border border-success/20 text-center">
              <div className="text-2xl font-bold text-success">{result.clean_count}</div>
              <div className="text-xs text-success/70 mt-1">Clean ✓</div>
            </div>
          </div>

          <div className="space-y-1">
            {result.lists?.map((entry: any, i: number) => (
              <div key={i} className={`flex items-center justify-between py-2.5 px-4 rounded-xl border transition-colors ${
                entry.listed ? 'bg-danger-muted border-danger/20' : entry.error ? 'bg-surface border-border opacity-60' : 'bg-surface border-border hover:border-border-hover hover:bg-surface-hover'
              }`}>
                <div className="flex items-center gap-3">
                  {entry.listed ? <XCircle className="w-4 h-4 text-danger flex-shrink-0" />
                    : entry.error ? <AlertTriangle className="w-4 h-4 text-text-muted flex-shrink-0" />
                    : <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />}
                  <span className="text-sm font-medium text-text-primary">{entry.name}</span>
                </div>
                <div className="text-xs text-text-secondary">
                  {entry.listed ? <span className="text-danger font-mono">{entry.response}</span>
                    : entry.error ? <span className="text-text-muted">{entry.error}</span>
                    : <span className="text-success">Clean</span>}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-text-muted text-center">Checked in {result.duration_ms}ms · {result.listed_count} of {result.total_count} lists returned positive</p>
        </div>
      )}

      {/* Bulk Results */}
      {bulkLoading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 className="w-4 h-4 text-accent animate-spin" />
            Checking IPs... ({bulkResults.length}/{ip.split(',').filter(s => s.trim()).length})
          </div>
          <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-purple-400 transition-all duration-300"
              style={{ width: `${bulkProgress}%` }} />
          </div>
        </div>
      )}

      {!loading && !bulkLoading && bulkResults.length > 0 && (
        <div className="space-y-5">
          {/* Bulk Summary */}
          <div className="p-4 rounded-2xl bg-surface border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold">Bulk Check Summary</span>
              <span className="text-xs text-text-muted">· {bulkResults.length} IPs checked</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-xl bg-surface-hover text-center">
                <div className="text-xl font-bold text-text-primary">{bulkTotal}</div>
                <div className="text-[10px] text-text-muted">Total Lists</div>
              </div>
              <div className="p-3 rounded-xl bg-danger-muted text-center">
                <div className="text-xl font-bold text-danger">{bulkListed}</div>
                <div className="text-[10px] text-danger/70">Listed ⚠️</div>
              </div>
              <div className="p-3 rounded-xl bg-success-muted text-center">
                <div className="text-xl font-bold text-success">{bulkClean}</div>
                <div className="text-[10px] text-success/70">Clean ✓</div>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <ExportButton data={bulkResults.filter(r => r.data)} filename={`blacklist-bulk`} />
            </div>
          </div>

          {/* Per-IP Results */}
          {bulkResults.map((r, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-surface border border-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-semibold text-text-primary">{r.ip}</span>
                  {r.data && (
                    <>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.data.listed_count > 0 ? 'bg-danger-muted text-danger' : 'bg-success-muted text-success'
                      }`}>
                        {r.data.listed_count > 0 ? `${r.data.listed_count} listed` : 'Clean'}
                      </span>
                      <span className="text-[10px] text-text-muted">· {r.data.duration_ms}ms</span>
                    </>
                  )}
                  {r.error && <span className="text-xs text-danger">{r.error}</span>}
                </div>
              </div>
              {r.data?.listed_count > 0 && r.data?.lists && (
                <div className="space-y-1 ml-2">
                  {r.data.lists.filter((e: any) => e.listed).map((entry: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 py-1 text-xs">
                      <XCircle className="w-3 h-3 text-danger flex-shrink-0" />
                      <span className="text-text-secondary">{entry.name}</span>
                      <span className="text-danger font-mono">{entry.response}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

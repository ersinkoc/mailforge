import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Mail, Loader2, Search, AlertTriangle, CheckCircle2, XCircle, Copy, Server, Globe, ArrowRight, Check, ShieldAlert } from 'lucide-react'
import { api } from '@/lib/api'
import { useDomain, useHistory, useScanResults } from '@/lib/store'
import ExportButton from '@/components/ExportButton'
import { MXLookupSkeleton } from '@/components/Skeleton'

export default function MXLookup() {
  const [searchParams] = useSearchParams()
  const { domain: sharedDomain, ip: sharedIp, setDomain, setIp } = useDomain()
  const { addHistory } = useHistory()
  const { setLastResult } = useScanResults()
  const navigate = useNavigate()
  const [domain, setDomainLocal] = useState(searchParams.get('q') || sharedDomain || '')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedIp, setSelectedIp] = useState<string | null>(sharedIp || null)

  const q = searchParams.get('q')
  useEffect(() => {
    if (q) {
      setDomainLocal(q)
      runLookup(q)
    }
  }, [q])

  const runLookup = async (d?: string) => {
    const target = (d || domain).trim()
    if (!target) return
    setDomain(target)
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await api.mx(target)
      setResult(res.data)
      setLastResult('mx', target, res.data)
      // Extract primary MX IP for IP-consuming pages
      const firstMx = res.data?.mx?.find((m: any) => m.valid && m.ips?.length > 0)
      const firstIp = firstMx?.ips?.[0] || null
      setSelectedIp(firstIp)
      if (firstIp) setIp(firstIp)
      addHistory(target, 'MX Lookup')
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)

  const validCount = result?.mx?.filter((m: any) => m.valid).length || 0
  const totalIps = result?.mx?.reduce((sum: number, m: any) => sum + (m.ips?.length || 0), 0) || 0

  const allIps = useMemo(() => {
    if (!result?.mx) return []
    return result.mx
      .filter((m: any) => m.valid && m.ips?.length > 0)
      .flatMap((m: any) => m.ips.map((ip: string) => ({ ip, host: m.host })))
  }, [result])

  const selectIp = (ip: string) => {
    setSelectedIp(ip)
    setIp(ip)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 flex items-center justify-center">
          <Mail className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">MX Lookup</h1>
          <p className="text-sm text-text-secondary">Resolve mail exchange records with IP addresses for each MX host</p>
        </div>
      </div>

      <div className="flex gap-3">
        <input type="text" value={domain} onChange={(e) => setDomainLocal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runLookup()}
          placeholder="Enter domain (e.g. google.com)"
          className="flex-1 h-11 px-4 rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
        <button onClick={() => runLookup()} disabled={loading || !domain.trim()}
          className="h-11 px-6 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 text-white text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-teal-500/25">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Lookup MX
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-danger-muted border border-danger/20 text-danger text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {loading && <MXLookupSkeleton />}

      {!loading && result && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <CheckCircle2 className="w-4 h-4 text-success" />
              MX records for <span className="font-mono text-text-primary">{result.domain}</span>
              <span className="text-text-muted">· {result.duration_ms}ms</span>
            </div>
            <ExportButton data={result} filename={`mx-${result.domain}`} />
          </div>

          {result.warn && (
            <div className="p-3 rounded-xl bg-warning-muted border border-warning/20 text-warning text-sm">{result.warn}</div>
          )}

          {/* IP Selector — shown when multiple IPs exist */}
          {allIps.length > 1 && (
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Select Active IP</span>
                <span className="text-[10px] text-text-muted">· used for Blacklist, Port Scan, Reverse DNS</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {allIps.map(({ ip, host }: { ip: string; host: string }) => {
                  const isActive = ip === selectedIp
                  return (
                    <button
                      key={ip}
                      onClick={() => selectIp(ip)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-mono transition-all ${
                        isActive
                          ? 'bg-teal-500/15 border-teal-500/40 text-teal-400 shadow-sm shadow-teal-500/10'
                          : 'bg-surface-hover border-border text-text-secondary hover:border-border-hover hover:text-text-primary'
                      }`}
                    >
                      {isActive ? <Check className="w-3 h-3" /> : <ArrowRight className="w-3 h-3 opacity-50" />}
                      {ip}
                      <span className={`text-[10px] ${isActive ? 'text-teal-400/70' : 'text-text-muted'}`}>({host})</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Bulk Blacklist Check */}
          {allIps.length > 0 && (
            <button
              onClick={() => navigate(`/blacklist?ip=${allIps.map((item: { ip: string; host: string }) => item.ip).join(',')}`)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-medium hover:bg-danger/15 transition-all"
            >
              <ShieldAlert className="w-4 h-4" />
              Blacklist Check All IPs
              <span className="text-[10px] text-danger/60">({allIps.length} IPs)</span>
            </button>
          )}

          {/* Summary Stats */}
          {result.mx && result.mx.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-surface border border-border text-center">
                <div className="text-2xl font-bold text-teal-400">{result.mx.length}</div>
                <div className="text-xs text-text-muted mt-1">MX Records</div>
              </div>
              <div className="p-4 rounded-2xl bg-surface border border-border text-center">
                <div className="text-2xl font-bold text-success">{validCount}</div>
                <div className="text-xs text-text-muted mt-1">Resolved</div>
              </div>
              <div className="p-4 rounded-2xl bg-surface border border-border text-center">
                <div className="text-2xl font-bold text-accent">{totalIps}</div>
                <div className="text-xs text-text-muted mt-1">Total IPs</div>
              </div>
            </div>
          )}

          {/* MX Records */}
          {result.mx && result.mx.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Mail Exchange Servers</h3>
              <div className="space-y-2">
                {result.mx.map((mx: any, i: number) => (
                  <div key={i} className="p-4 rounded-2xl bg-surface border border-border hover:border-border-hover transition-colors group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mx.valid ? 'bg-success/15' : 'bg-danger/15'}`}>
                          <Server className={`w-4 h-4 ${mx.valid ? 'text-success' : 'text-danger'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-semibold text-text-primary">{mx.host}</span>
                            {mx.valid ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-danger" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-text-muted">Priority: </span>
                            <span className="text-xs font-mono font-bold text-teal-400">{mx.priority}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => copyToClipboard(mx.host)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-surface-hover">
                        <Copy className="w-3.5 h-3.5 text-text-muted hover:text-text-primary" />
                      </button>
                    </div>

                    {/* IP Addresses */}
                    {mx.ips && mx.ips.length > 0 && (
                      <div className="ml-11 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                          <Globe className="w-3 h-3" />
                          Resolved IPs
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {mx.ips.map((ip: string, j: number) => {
                            const isActive = ip === selectedIp
                            return (
                              <button
                                key={j}
                                onClick={() => selectIp(ip)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                                  isActive
                                    ? 'bg-teal-500/15 border border-teal-500/40 text-teal-400'
                                    : 'bg-surface-hover border border-border text-text-secondary hover:border-border-hover hover:text-text-primary'
                                }`}
                              >
                                {isActive ? <Check className="w-3 h-3" /> : <ArrowRight className="w-3 h-3 opacity-50" />}
                                {ip}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {(!mx.ips || mx.ips.length === 0) && mx.valid && (
                      <div className="ml-11">
                        <span className="text-xs text-text-muted italic">No IP addresses resolved</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No MX Records */}
          {result.mx && result.mx.length === 0 && !result.warn && (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
              <Mail className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">No MX records found</p>
              <p className="text-xs mt-1">This domain does not have mail exchange records configured</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

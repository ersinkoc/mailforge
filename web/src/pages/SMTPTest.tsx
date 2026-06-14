import { useState, useMemo } from 'react'
import { Server, Loader2, Search, CheckCircle2, XCircle, AlertTriangle, Shield, Globe, ArrowRight, GitCompareArrows, ArrowLeftRight } from 'lucide-react'
import { api } from '@/lib/api'
import { useDomain, useHistory, useScanResults } from '@/lib/store'
import { SMTPSkeleton } from '@/components/Skeleton'
import ExportButton from '@/components/ExportButton'
import { parseSmtpBanner } from '@/lib/utils'

export default function SMTPTest() {
  const { domain: sharedDomain, ip: sharedIp, setDomain, setIp: setStoreIp } = useDomain()
  const { addHistory } = useHistory()
  const { setLastResult } = useScanResults()
  const [host, setHost] = useState(sharedIp || sharedDomain || '')
  const [port, setPort] = useState('25')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mxServers, setMxServers] = useState<any[]>([])
  const [loadingMx, setLoadingMx] = useState(false)
  const [ptrResult, setPtrResult] = useState<any>(null)
  const [loadingPtr, setLoadingPtr] = useState(false)

  const runTest = async (testHost?: string, suggestedPort?: number) => {
    const target = (testHost || host).trim()
    if (!target) return
    setHost(target)
    setDomain(target)
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(target)) setStoreIp(target)
    if (suggestedPort) setPort(String(suggestedPort))
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await api.smtp(target, parseInt(port) || 25)
      setResult(res.data)
      setLastResult('smtp', target, res.data)
      addHistory(target, 'SMTP Test')
      // Auto-fetch MX for comparison if host is a domain
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(target)) {
        fetchMxServers(target)
      }
      // Auto-fetch PTR for comparison
      if (res.data?.ip) {
        fetchPtr(res.data.ip)
      }
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  const fetchMxServers = async (overrideHost?: string) => {
    const target = (overrideHost || host).trim()
    if (!target || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(target)) return
    setMxServers([])
    setLoadingMx(true)
    try {
      const res = await api.mx(target)
      setMxServers(res.data?.mx || [])
    } catch { setMxServers([]) } finally { setLoadingMx(false) }
  }

  const fetchPtr = async (ip: string) => {
    setLoadingPtr(true)
    setPtrResult(null)
    try {
      const res = await api.rdns(ip)
      setPtrResult(res.data)
    } catch { setPtrResult(null) } finally { setLoadingPtr(false) }
  }

  // PTR ↔ Host comparison
  const ptrComparison = useMemo(() => {
    if (!result?.host || !ptrResult?.hosts?.length) return null
    const testedHost = result.host.toLowerCase().replace(/\.$/, '')
    const ptrHosts = ptrResult.hosts.map((h: string) => h.toLowerCase().replace(/\.$/, ''))
    const exactMatch = ptrHosts.includes(testedHost)
    const partialMatch = !exactMatch && ptrHosts.some((h: string) => testedHost.includes(h) || h.includes(testedHost))
    return { testedHost, ptrHosts, exactMatch, partialMatch }
  }, [result?.host, ptrResult])

  // Parsed banner info
  const parsedBanner = useMemo(() => result?.banner ? parseSmtpBanner(result.banner) : null, [result?.banner])

  // Compare connected IP with MX IPs
  const ipComparison = useMemo(() => {
    if (!result?.ip || mxServers.length === 0) return null
    const connectedIp = result.ip
    const allMxIps = mxServers
      .filter((m: any) => m.valid)
      .flatMap((m: any) => (m.ips || []).map((ip: string) => ({ ip, host: m.host, priority: m.priority })))
    const match = allMxIps.find((mx) => mx.ip === connectedIp)
    return { connectedIp, allMxIps, match, totalMxIps: allMxIps.length }
  }, [result?.ip, mxServers])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center">
          <Server className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">SMTP Test</h1>
          <p className="text-sm text-text-secondary">Test SMTP server connection, banner, STARTTLS and auth</p>
        </div>
      </div>

      <div className="flex gap-3">
        <input type="text" value={host} onChange={(e) => setHost(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runTest()}
          placeholder="SMTP host (e.g. smtp.gmail.com)"
          className="flex-1 h-11 px-4 rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
        <input type="text" value={port} onChange={(e) => setPort(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runTest()}
          placeholder="Port"
          className="w-24 h-11 px-4 rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
        <button onClick={() => runTest()} disabled={loading || !host.trim()}
          className="h-11 px-6 rounded-xl bg-gradient-to-r from-accent to-purple-500 hover:from-accent-hover hover:to-purple-400 disabled:opacity-50 text-white text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-accent/25">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Test
        </button>
      </div>        <div className="flex gap-2 items-center">
        {[25, 465, 587].map(p => {
          const recommended = result?.connected && (
            (p === 587 && result.starttls) || (p === 465 && result.tls_version) || (p === 25 && !result.starttls)
          )
          return (
            <button key={p} onClick={() => setPort(String(p))}
              className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                String(p) === port
                  ? 'bg-accent/15 border-accent/30 text-accent'
                  : recommended
                    ? 'bg-success-muted border-success/20 text-success'
                    : 'bg-surface border-border text-text-secondary hover:text-text-primary hover:border-border-hover'
              }`}>
              Port {p}{recommended && <span className="ml-1 text-[10px]">✓</span>}
            </button>
          )
        })}
        {host.trim() && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host.trim()) && (
          <button onClick={() => fetchMxServers()} disabled={loadingMx}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-400 hover:bg-cyan-500/15 transition-colors flex items-center gap-1.5">
            {loadingMx ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
            Show MX Servers
          </button>
        )}
      </div>

      {mxServers.length > 0 && (
        <div className="p-3 rounded-xl bg-surface border border-border space-y-2">
          <div className="flex items-center gap-2 text-[10px] text-text-muted uppercase tracking-wider font-semibold">
            <Server className="w-3 h-3" />
            MX Servers for {host.trim()}
            <span className="text-text-muted/60 normal-case">· click to test</span>
          </div>
          <div className="space-y-1">
            {mxServers.filter((m: any) => m.valid).map((mx: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-text-muted w-6 text-right">p{mx.priority}</span>
                <button onClick={() => runTest(mx.host, 25)}
                  className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-hover border border-border hover:border-cyan-500/30 hover:bg-cyan-500/5 text-left transition-all group">
                  <Server className="w-3 h-3 text-text-muted group-hover:text-cyan-400 flex-shrink-0" />
                  <span className="text-xs font-mono text-text-primary truncate">{mx.host}</span>
                  {mx.ips?.length > 0 && (
                    <>
                      <ArrowRight className="w-3 h-3 text-text-muted/40 flex-shrink-0" />
                      <span className="text-[10px] font-mono text-teal-400/70">{mx.ips[0]}</span>
                    </>
                  )}
                  <span className="ml-auto text-[10px] text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">Test →</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="flex items-center gap-2 p-4 rounded-xl bg-danger-muted border border-danger/20 text-danger text-sm"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}</div>}

      {loading && <SMTPSkeleton />}

      {!loading && result && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <CheckCircle2 className="w-4 h-4 text-success" />
              SMTP test for <span className="font-mono text-text-primary">{result.host}:{result.port}</span>
              <span className="text-text-muted">· {result.duration_ms}ms</span>
            </div>
            <ExportButton data={result} filename={`smtp-${result.host}`} />
          </div>
          {/* PTR ↔ Host Comparison */}
          {(ptrComparison || loadingPtr) && (
            <div className={`p-4 rounded-2xl border ${
              loadingPtr ? 'bg-surface border-border' :
              ptrComparison?.exactMatch ? 'bg-success-muted border-success/20' :
              ptrComparison?.partialMatch ? 'bg-warning-muted border-warning/20' :
              'bg-danger-muted border-danger/20'
            }`}>
              <div className="flex items-center gap-3">
                {loadingPtr ? (
                  <Loader2 className="w-5 h-5 text-accent animate-spin" />
                ) : (
                  <ArrowLeftRight className={`w-5 h-5 ${
                    ptrComparison?.exactMatch ? 'text-success' :
                    ptrComparison?.partialMatch ? 'text-warning' : 'text-danger'
                  }`} />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${
                      loadingPtr ? 'text-text-secondary' :
                      ptrComparison?.exactMatch ? 'text-success' :
                      ptrComparison?.partialMatch ? 'text-warning' : 'text-danger'
                    }`}>
                      {loadingPtr ? 'Checking PTR record...' :
                       ptrComparison?.exactMatch ? 'PTR matches hostname' :
                       ptrComparison?.partialMatch ? 'PTR partially matches' : 'PTR mismatch'}
                    </span>
                  </div>
                  {!loadingPtr && ptrComparison && (
                    <div className="text-xs text-text-muted mt-0.5">
                      <span className="font-mono text-text-secondary">{result.ip}</span>
                      {' → '}
                      {ptrComparison.ptrHosts.map((ptrH: string, i: number) => (
                        <span key={i} className={`font-mono ${
                          ptrComparison.exactMatch ? 'text-success' :
                          ptrComparison.partialMatch ? 'text-warning' : 'text-danger'
                        }`}>{ptrH}</span>
                      ))}
                      {' ↔ '}
                      <span className="font-mono text-text-secondary">{ptrComparison.testedHost}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* IP Comparison */}
          {ipComparison && (
            <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
              ipComparison.match
                ? 'bg-success-muted border-success/20'
                : 'bg-warning-muted border-warning/20'
            }`}>
              <GitCompareArrows className={`w-5 h-5 ${ipComparison.match ? 'text-success' : 'text-warning'}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${ipComparison.match ? 'text-success' : 'text-warning'}`}>
                    {ipComparison.match ? 'IP matches MX record' : 'IP not in MX list'}
                  </span>
                  <span className="text-xs font-mono text-text-muted">{ipComparison.connectedIp}</span>
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  {ipComparison.match ? (
                    <>Matches <span className="font-mono text-text-secondary">{ipComparison.match.host}</span> (priority {ipComparison.match.priority})</>
                  ) : (
                    <>Connected IP is not listed in {ipComparison.totalMxIps} MX record IP{ipComparison.totalMxIps !== 1 ? 's' : ''}</>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className={`flex items-center gap-3 p-4 rounded-2xl border ${result.connected ? 'bg-success-muted border-success/20' : 'bg-danger-muted border-danger/20'}`}>
            {result.connected ? <CheckCircle2 className="w-5 h-5 text-success" /> : <XCircle className="w-5 h-5 text-danger" />}
            <div>
              <span className={`font-semibold ${result.connected ? 'text-success' : 'text-danger'}`}>
                {result.connected ? 'Connected' : 'Connection Failed'}
              </span>
              <span className="text-xs text-text-muted ml-2">· {result.host}:{result.port} → {result.ip || 'N/A'}</span>
            </div>
          </div>

          {result.banner && (
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Server Banner</h3>
              <code className="text-sm font-mono text-accent">{result.banner}</code>
              {parsedBanner && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text-secondary">Software:</span>
                    <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-xs font-bold">
                      {parsedBanner.software}
                    </span>
                  </div>
                  {parsedBanner.version && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-text-secondary">Version:</span>
                      <span className="px-2 py-0.5 rounded-md bg-success/10 text-success text-xs font-bold font-mono">
                        {parsedBanner.version}
                      </span>
                    </div>
                  )}
                  {parsedBanner.hostname && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-text-secondary">Host:</span>
                      <span className="text-xs font-mono text-text-muted">{parsedBanner.hostname}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Connected', value: result.connected ? 'Yes' : 'No', ok: result.connected },
              { label: 'STARTTLS', value: result.starttls ? 'Supported' : 'Not Available', ok: result.starttls },
              { label: 'TLS Version', value: result.tls_version || 'N/A', ok: !!result.tls_version },
            ].map(item => (
              <div key={item.label} className="p-3 rounded-xl bg-surface border border-border text-center">
                <div className="text-xs text-text-muted">{item.label}</div>
                <div className={`text-sm font-semibold mt-1 ${item.ok ? 'text-success' : 'text-text-muted'}`}>{item.value}</div>
              </div>
            ))}
          </div>

          {result.auth_methods?.length > 0 && (
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Auth Methods</h3>
              <div className="flex gap-2">
                {result.auth_methods.map((m: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-accent/15 text-accent text-xs font-mono">{m}</span>
                ))}
              </div>
            </div>
          )}

          {result.certificate && (
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" /> TLS Certificate
              </h3>
              {[
                { label: 'Subject', value: result.certificate.subject },
                { label: 'Issuer', value: result.certificate.issuer },
                { label: 'Expires', value: result.certificate.not_after },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <span className="text-text-muted w-16">{item.label}:</span>
                  <span className="text-text-primary font-mono text-xs">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

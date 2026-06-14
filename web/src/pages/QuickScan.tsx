import { useState, useEffect, useRef } from 'react'
import { Zap, Loader2, Globe, FileText, KeyRound, ShieldCheck, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { useDomain, useHistory, useScanResults } from '@/lib/store'
import ExportButton from '@/components/ExportButton'

interface ScanResult {
  tool: string
  label: string
  icon: any
  status: 'pending' | 'loading' | 'done' | 'error'
  progress: number
  data?: any
  error?: string
}

export default function QuickScan() {
  const { domain: sharedDomain, setDomain, setIp } = useDomain()
  const { addHistory } = useHistory()
  const { setLastResult } = useScanResults()
  const [domain, setDomainLocal] = useState(sharedDomain || '')
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState<ScanResult[]>([])
  const [allDone, setAllDone] = useState(false)
  const intervalsRef = useRef<number[]>([])

  // Cleanup all intervals on unmount
  useEffect(() => {
    return () => { intervalsRef.current.forEach(id => clearInterval(id)) }
  }, [])

  const runQuickScan = async () => {
    if (!domain.trim()) return
    setDomain(domain.trim())
    setScanning(true)
    setAllDone(false)

    const checks: ScanResult[] = [
      { tool: 'dns', label: 'DNS Lookup', icon: Globe, status: 'loading', progress: 0 },
      { tool: 'spf', label: 'SPF Check', icon: FileText, status: 'pending', progress: 0 },
      { tool: 'dkim', label: 'DKIM Check', icon: KeyRound, status: 'pending', progress: 0 },
      { tool: 'dmarc', label: 'DMARC Check', icon: ShieldCheck, status: 'pending', progress: 0 },
    ]
    setResults([...checks])

    const runCheck = async (index: number, apiFn: () => Promise<any>) => {
      setResults(prev => prev.map((r, i) => i === index ? { ...r, status: 'loading', progress: 10 } : r))
      // Simulate progress while waiting
      const interval = window.setInterval(() => {
        setResults(prev => prev.map((r, i) => i === index && r.status === 'loading'
          ? { ...r, progress: Math.min(r.progress + Math.random() * 15, 90) }
          : r))
      }, 300)
      intervalsRef.current.push(interval)
      try {
        const res = await apiFn()
        clearInterval(interval)
        intervalsRef.current = intervalsRef.current.filter(id => id !== interval)
        setResults(prev => prev.map((r, i) => i === index ? { ...r, status: 'done', progress: 100, data: res.data } : r))
        // Cache individual tool results for Dashboard
        const toolKeys = ['dns', 'spf', 'dkim', 'dmarc']
        const toolKey = toolKeys[index] as any
        if (toolKey) setLastResult(toolKey, domain.trim(), res.data)
      } catch (e: any) {
        clearInterval(interval)
        intervalsRef.current = intervalsRef.current.filter(id => id !== interval)
        setResults(prev => prev.map((r, i) => i === index ? { ...r, status: 'error', progress: 100, error: e.message } : r))
      }
    }

    // Run all checks in parallel
    await Promise.allSettled([
      runCheck(0, async () => {
        const res = await api.dns(domain.trim())
        // Extract primary A record IP for IP-consuming pages
        const firstA = res.data?.a?.[0]
        if (firstA?.ip) setIp(firstA.ip)
        return res
      }),
      runCheck(1, () => api.spf(domain.trim())),
      runCheck(2, () => api.dkim(domain.trim(), 'default')),
      runCheck(3, () => api.dmarc(domain.trim())),
    ])

    addHistory(domain.trim(), 'Quick Scan')
    setScanning(false)
    setAllDone(true)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading': return <Loader2 className="w-5 h-5 text-accent animate-spin" />
      case 'done': return <CheckCircle2 className="w-5 h-5 text-success" />
      case 'error': return <XCircle className="w-5 h-5 text-danger" />
      default: return <div className="w-5 h-5 rounded-full border-2 border-border" />
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/10 flex items-center justify-center">
          <Zap className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Quick Scan</h1>
          <p className="text-sm text-text-secondary">Run DNS, SPF, DKIM & DMARC checks simultaneously</p>
        </div>
      </div>

      <div className="flex gap-3">
        <input type="text" value={domain} onChange={(e) => setDomainLocal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runQuickScan()}
          placeholder="Enter domain (e.g. google.com)"
          className="flex-1 h-11 px-4 rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
        <button onClick={runQuickScan} disabled={scanning || !domain.trim()}
          className="h-11 px-6 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 text-white text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-yellow-500/25">
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {scanning ? 'Scanning...' : 'Quick Scan'}
        </button>
      </div>

      {scanning && results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, i) => {
            const Icon = result.icon
            const barColor = result.status === 'loading' ? 'from-accent to-purple-400'
              : result.status === 'done' ? 'from-success to-emerald-400'
              : result.status === 'error' ? 'from-danger to-red-400'
              : ''
            return (
              <div key={i} className="p-4 rounded-2xl bg-surface border border-border">
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon(result.status)}
                  <Icon className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm font-semibold">{result.label}</span>
                  <span className="text-xs text-text-muted ml-auto">
                    {result.status === 'loading' ? `${Math.round(result.progress)}%`
                      : result.status === 'done' ? 'Done'
                      : result.status === 'error' ? 'Failed'
                      : 'Waiting...'}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-300 ease-out`}
                    style={{ width: `${result.progress}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {results.length > 0 && !scanning && (
        <div className="space-y-4">
          {/* Export */}
          {allDone && (
            <div className="flex justify-end">
              <ExportButton data={results.filter(r => r.data).reduce((acc, r) => ({ ...acc, [r.tool]: r.data }), {})} filename={`quickscan-${domain}`} />
            </div>
          )}

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((result, i) => {
              const Icon = result.icon
              return (
                <div key={i} className="p-4 rounded-2xl bg-surface border border-border hover:border-border-hover hover:bg-surface-hover transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    {getStatusIcon(result.status)}
                    <Icon className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm font-semibold">{result.label}</span>
                    {result.status === 'done' && result.data?.duration_ms && (
                      <span className="text-xs text-text-muted ml-auto">{result.data.duration_ms}ms</span>
                    )}
                  </div>

                  {result.status === 'done' && result.data && (
                    <div className="text-xs text-text-secondary space-y-1">
                      {result.tool === 'dns' && (
                        <>
                          <div>MX: {result.data.mx?.length || 0} records</div>
                          <div>A: {result.data.a?.length || 0} records</div>
                          <div>TXT: {result.data.txt?.length || 0} records</div>
                        </>
                      )}
                      {result.tool === 'spf' && (
                        <>
                          <div className={result.data.valid ? 'text-success' : 'text-danger'}>
                            {result.data.valid ? '✓ Valid SPF' : '✗ No SPF Found'}
                          </div>
                          {result.data.dns_lookups > 0 && <div>DNS Lookups: {result.data.dns_lookups}/{result.data.max_lookups}</div>}
                        </>
                      )}
                      {result.tool === 'dkim' && (
                        <div className={result.data.valid ? 'text-success' : 'text-danger'}>
                          {result.data.valid ? `✓ Valid DKIM (${result.data.key_type || 'rsa'}, ${result.data.key_size || '?'} bits)` : '✗ No DKIM Found'}
                        </div>
                      )}
                      {result.tool === 'dmarc' && (
                        <>
                          <div className={result.data.valid ? 'text-success' : 'text-danger'}>
                            {result.data.valid ? `✓ DMARC Policy: ${result.data.policy}` : '✗ No DMARC Found'}
                          </div>
                          {result.data.warnings?.length > 0 && (
                            <div className="text-warning mt-1">{result.data.warnings[0]}</div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {result.status === 'error' && (
                    <div className="text-xs text-danger flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />{result.error}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

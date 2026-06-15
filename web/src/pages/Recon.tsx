import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  Globe, Shield, Server, Mail, Lock, CheckCircle2, XCircle, AlertTriangle, 
  Clock, Zap, Activity, Database, Network, Eye, FileText, RefreshCw, Calendar
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import SearchInput from '@/components/SearchInput'
import { api } from '@/lib/api'
import { useDomain, useHistory } from '@/lib/store'
import { useToast } from '@/components/Toast'
import { ResultSkeleton } from '@/components/Skeleton'
import { cn } from '@/lib/utils'

interface ReconSummary {
  domain_age: string
  domain_expires: string
  mail_provider: string
  security_score: string
  issues_found: number
  warnings: number
}

interface ReconData {
  domain: string
  timestamp: string
  total_duration_ms: number
  summary: ReconSummary
  whois?: unknown
  dns?: unknown
  mx?: unknown
  spf?: unknown
  dkim?: unknown
  dmarc?: unknown
  dnssec?: unknown
  subdomains?: unknown
  port_scan?: unknown
  tls?: unknown
  geoip?: unknown
  blacklist?: unknown
  deliverability?: unknown
  email_validate?: unknown
  errors?: Array<{ tool: string; error: string; phase: string }>
}

export default function Recon() {
  const [params] = useSearchParams()
  const { domain, setDomain } = useDomain()
  const { addHistory } = useHistory()
  const { toast } = useToast()
  const [input, setInput] = useState('')
  const [data, setData] = useState<ReconData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightMode, setLightMode] = useState(false)

  useEffect(() => {
    const initial = domain || params.get('q') || ''
    setInput(initial)
  }, [domain, params])

  const run = async () => {
    if (!input.trim()) return
    setDomain(input.trim())
    setLoading(true); setError(null)
    try {
      const res = await api.recon(input.trim(), lightMode)
      setData(res.data.data)  // res.data is ReconResponse { data: ReconResult }
      addHistory(input.trim(), 'Recon')
      toast(`Recon complete for ${input.trim()}`, 'success')
    } catch (e: any) { 
      setError(e.message); 
      toast(e.message || 'Recon failed', 'error') 
    }
    finally { setLoading(false) }
  }

  const scoreColor = (score: string) => {
    switch (score?.toLowerCase()) {
      case 'excellent': return 'text-success'
      case 'good': return 'text-info'
      case 'fair': return 'text-warning'
      case 'poor': return 'text-danger'
      default: return 'text-text-secondary'
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const ToolCard = ({ title, icon: Icon, data: toolData, status }: { title: string; icon: any; data?: unknown; status?: 'ok' | 'warn' | 'error' }) => (
    <div className={cn(
      "bg-surface rounded-lg p-4 border",
      status === 'ok' ? 'border-success/30' : 
      status === 'warn' ? 'border-warning/30' :
      status === 'error' ? 'border-danger/30' :
      'border-border'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-text-secondary" />
        <span className="text-sm font-medium text-text-secondary">{title}</span>
        {status === 'ok' && <CheckCircle2 className="w-4 h-4 text-success ml-auto" />}
        {status === 'warn' && <AlertTriangle className="w-4 h-4 text-warning ml-auto" />}
        {status === 'error' && <XCircle className="w-4 h-4 text-danger ml-auto" />}
        {!status && <div className="w-4 h-4 rounded-full border border-text-muted ml-auto" />}
      </div>
      {toolData ? (
        <pre className="text-xs text-text-muted overflow-auto max-h-32 whitespace-pre-wrap">
          {JSON.stringify(toolData, null, 2)}
        </pre>
      ) : (
        <span className="text-xs text-text-muted">No data</span>
      )}
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Reconnaissance"
        subtitle="Comprehensive domain analysis — WHOIS, DNS, MX, SPF, DKIM, DMARC, DNSSEC, and more"
        icon={Globe}
      />

      {/* Search Bar */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1">
          <SearchInput
            value={input}
            onChange={setInput}
            onSubmit={run}
            placeholder="Enter domain (e.g., example.com)"
            loading={loading}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary whitespace-nowrap">
          <input
            type="checkbox"
            checked={lightMode}
            onChange={(e) => setLightMode(e.target.checked)}
            className="rounded border-border bg-surface checked:bg-accent"
          />
          Light mode
        </label>
        <button
          onClick={run}
          disabled={loading || !input.trim()}
          className="btn btn-primary px-4 flex items-center gap-2"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {loading ? 'Scanning...' : 'Run Recon'}
        </button>
      </div>

      {/* Results */}
      {loading && <ResultSkeleton />}

      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 text-danger">
          <XCircle className="w-5 h-5 inline mr-2" />
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-accent" />
                <span className="text-sm text-text-secondary">Security Score</span>
              </div>
              <span className={cn("text-2xl font-bold", scoreColor(data.summary.security_score))}>
                {data.summary.security_score || 'N/A'}
              </span>
            </div>

            <div className="bg-surface rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-accent" />
                <span className="text-sm text-text-secondary">Domain Age</span>
              </div>
              <span className="text-xl font-bold text-text-primary">
                {data.summary.domain_age || 'N/A'}
              </span>
            </div>

            <div className="bg-surface rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-accent" />
                <span className="text-sm text-text-secondary">Expires</span>
              </div>
              <span className="text-xl font-bold text-text-primary">
                {data.summary.domain_expires || 'N/A'}
              </span>
            </div>

            <div className="bg-surface rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-accent" />
                <span className="text-sm text-text-secondary">Mail Provider</span>
              </div>
              <span className="text-xl font-bold text-text-primary">
                {data.summary.mail_provider || 'N/A'}
              </span>
            </div>
          </div>

          {/* Issues Summary */}
          <div className="flex gap-4">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg",
              data.summary.issues_found > 0 ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
            )}>
              <XCircle className="w-4 h-4" />
              <span>{data.summary.issues_found} Critical Issues</span>
            </div>
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg",
              data.summary.warnings > 0 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
            )}>
              <AlertTriangle className="w-4 h-4" />
              <span>{data.summary.warnings} Warnings</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface text-text-secondary">
              <Activity className="w-4 h-4" />
              <span>Completed in {formatDuration(data.total_duration_ms)}</span>
            </div>
          </div>

          {/* Tool Results Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ToolCard 
              title="WHOIS" 
              icon={FileText} 
              data={data.whois} 
              status={data.whois ? 'ok' : undefined}
            />
            <ToolCard 
              title="DNS" 
              icon={Network} 
              data={data.dns} 
              status={data.dns ? 'ok' : undefined}
            />
            <ToolCard 
              title="MX Records" 
              icon={Mail} 
              data={data.mx} 
              status={data.mx ? 'ok' : undefined}
            />
            <ToolCard 
              title="SPF" 
              icon={Shield} 
              data={data.spf} 
              status={data.spf ? 'ok' : 'warn'}
            />
            <ToolCard 
              title="DKIM" 
              icon={Lock} 
              data={data.dkim} 
              status={data.dkim ? 'ok' : 'warn'}
            />
            <ToolCard 
              title="DMARC" 
              icon={Shield} 
              data={data.dmarc} 
              status={data.dmarc ? 'ok' : 'warn'}
            />
            <ToolCard 
              title="DNSSEC" 
              icon={CheckCircle2} 
              data={data.dnssec} 
              status={data.dnssec ? 'ok' : 'warn'}
            />
            <ToolCard 
              title="Subdomains" 
              icon={Database} 
              data={data.subdomains} 
              status={data.subdomains ? 'ok' : undefined}
            />
            <ToolCard 
              title="Port Scan" 
              icon={Server} 
              data={data.port_scan} 
              status={data.port_scan ? 'ok' : undefined}
            />
            <ToolCard 
              title="TLS" 
              icon={Lock} 
              data={data.tls} 
              status={data.tls ? 'ok' : undefined}
            />
            <ToolCard 
              title="GeoIP" 
              icon={Globe} 
              data={data.geoip} 
              status={data.geoip ? 'ok' : undefined}
            />
            <ToolCard 
              title="Blacklist" 
              icon={AlertTriangle} 
              data={data.blacklist} 
              status={data.blacklist ? 'ok' : undefined}
            />
            <ToolCard 
              title="Deliverability" 
              icon={Zap} 
              data={data.deliverability} 
              status={data.deliverability ? 'ok' : undefined}
            />
            <ToolCard 
              title="Email Validation" 
              icon={Mail} 
              data={data.email_validate} 
              status={data.email_validate ? 'ok' : undefined}
            />
          </div>

          {/* Errors */}
          {data.errors && data.errors.length > 0 && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg p-4">
              <h3 className="text-danger font-medium mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Errors ({data.errors.length})
              </h3>
              <div className="space-y-2">
                {data.errors.map((err, i) => (
                  <div key={i} className="text-sm text-danger/80">
                    <span className="font-mono">{err.tool}</span>: {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

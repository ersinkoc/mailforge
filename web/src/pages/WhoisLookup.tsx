import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Search, Loader2, AlertTriangle, CheckCircle2, Globe, Calendar,
  Server, Timer, AlertCircle, ArrowRight, Clock, Info, RefreshCw
} from 'lucide-react'
import { api } from '@/lib/api'
import { useDomain, useHistory, useScanResults } from '@/lib/store'
import ExportButton from '@/components/ExportButton'
import { WhoisSkeleton } from '@/components/Skeleton'

const quickLinks = [
  { label: 'DNS', path: '/dns', icon: Globe, color: 'text-blue-400' },
  { label: 'MX', path: '/mx', icon: Server, color: 'text-teal-400' },
  { label: 'SPF', path: '/spf', icon: Info, color: 'text-emerald-400' },
  { label: 'DKIM', path: '/dkim', icon: Info, color: 'text-amber-400' },
  { label: 'DMARC', path: '/dmarc', icon: Info, color: 'text-purple-400' },
]

const compoundTLDs: Record<string, { type: string; country: string }> = {
  'com.tr': { type: '2nd-level', country: 'Türkiye' },
  'org.tr': { type: '2nd-level', country: 'Türkiye' },
  'net.tr': { type: '2nd-level', country: 'Türkiye' },
  'web.tr': { type: '2nd-level', country: 'Türkiye' },
  'gen.tr': { type: '2nd-level', country: 'Türkiye' },
  'edu.tr': { type: '2nd-level', country: 'Türkiye' },
  'gov.tr': { type: '2nd-level', country: 'Türkiye' },
  'mil.tr': { type: '2nd-level', country: 'Türkiye' },
  'co.uk': { type: '2nd-level', country: 'United Kingdom' },
  'org.uk': { type: '2nd-level', country: 'United Kingdom' },
  'net.uk': { type: '2nd-level', country: 'United Kingdom' },
  'me.uk': { type: '2nd-level', country: 'United Kingdom' },
  'co.jp': { type: '2nd-level', country: 'Japan' },
  'or.jp': { type: '2nd-level', country: 'Japan' },
  'ne.jp': { type: '2nd-level', country: 'Japan' },
  'go.jp': { type: '2nd-level', country: 'Japan' },
  'co.kr': { type: '2nd-level', country: 'South Korea' },
  'or.kr': { type: '2nd-level', country: 'South Korea' },
  'ne.kr': { type: '2nd-level', country: 'South Korea' },
  'co.nz': { type: '2nd-level', country: 'New Zealand' },
  'net.nz': { type: '2nd-level', country: 'New Zealand' },
  'org.nz': { type: '2nd-level', country: 'New Zealand' },
  'co.za': { type: '2nd-level', country: 'South Africa' },
  'net.za': { type: '2nd-level', country: 'South Africa' },
  'org.za': { type: '2nd-level', country: 'South Africa' },
  'co.in': { type: '2nd-level', country: 'India' },
  'net.in': { type: '2nd-level', country: 'India' },
  'org.in': { type: '2nd-level', country: 'India' },
  'com.au': { type: '2nd-level', country: 'Australia' },
  'net.au': { type: '2nd-level', country: 'Australia' },
  'org.au': { type: '2nd-level', country: 'Australia' },
  'com.br': { type: '2nd-level', country: 'Brazil' },
  'net.br': { type: '2nd-level', country: 'Brazil' },
  'org.br': { type: '2nd-level', country: 'Brazil' },
  'com.cn': { type: '2nd-level', country: 'China' },
  'net.cn': { type: '2nd-level', country: 'China' },
  'org.cn': { type: '2nd-level', country: 'China' },
  'com.co': { type: '2nd-level', country: 'Colombia' },
  'net.co': { type: '2nd-level', country: 'Colombia' },
  'com.mx': { type: '2nd-level', country: 'Mexico' },
  'net.mx': { type: '2nd-level', country: 'Mexico' },
  'com.sg': { type: '2nd-level', country: 'Singapore' },
  'net.sg': { type: '2nd-level', country: 'Singapore' },
  'com.tw': { type: '2nd-level', country: 'Taiwan' },
  'net.tw': { type: '2nd-level', country: 'Taiwan' },
  'org.tw': { type: '2nd-level', country: 'Taiwan' },
  'com.ar': { type: '2nd-level', country: 'Argentina' },
  'net.ar': { type: '2nd-level', country: 'Argentina' },
  'org.ar': { type: '2nd-level', country: 'Argentina' },
  'com.cl': { type: '2nd-level', country: 'Chile' },
  'net.cl': { type: '2nd-level', country: 'Chile' },
  'com.ve': { type: '2nd-level', country: 'Venezuela' },
  'net.ve': { type: '2nd-level', country: 'Venezuela' },
  'com.hk': { type: '2nd-level', country: 'Hong Kong' },
  'net.hk': { type: '2nd-level', country: 'Hong Kong' },
  'org.hk': { type: '2nd-level', country: 'Hong Kong' },
  'co.th': { type: '2nd-level', country: 'Thailand' },
  'co.id': { type: '2nd-level', country: 'Indonesia' },
  'net.id': { type: '2nd-level', country: 'Indonesia' },
  'org.id': { type: '2nd-level', country: 'Indonesia' },
}

const tldInfo: Record<string, { type: string; notes?: string }> = {
  com: { type: 'gTLD', notes: 'Commercial' },
  net: { type: 'gTLD', notes: 'Network' },
  org: { type: 'gTLD', notes: 'Organization' },
  io: { type: 'ccTLD', notes: 'British Indian Ocean Territory' },
  dev: { type: 'gTLD', notes: 'Developer' },
  app: { type: 'gTLD', notes: 'Google Registry' },
  ai: { type: 'ccTLD', notes: 'Anguilla' },
  co: { type: 'ccTLD', notes: 'Colombia' },
  me: { type: 'ccTLD', notes: 'Montenegro' },
  tv: { type: 'ccTLD', notes: 'Tuvalu' },
  de: { type: 'ccTLD', notes: 'Germany' },
  uk: { type: 'ccTLD', notes: 'United Kingdom' },
  fr: { type: 'ccTLD', notes: 'France' },
  tr: { type: 'ccTLD', notes: 'Türkiye' },
  ru: { type: 'ccTLD', notes: 'Russia' },
  cn: { type: 'ccTLD', notes: 'China' },
  jp: { type: 'ccTLD', notes: 'Japan' },
  kr: { type: 'ccTLD', notes: 'South Korea' },
  nl: { type: 'ccTLD', notes: 'Netherlands' },
  au: { type: 'ccTLD', notes: 'Australia' },
  nz: { type: 'ccTLD', notes: 'New Zealand' },
  za: { type: 'ccTLD', notes: 'South Africa' },
  br: { type: 'ccTLD', notes: 'Brazil' },
  mx: { type: 'ccTLD', notes: 'Mexico' },
  in: { type: 'ccTLD', notes: 'India' },
  sg: { type: 'ccTLD', notes: 'Singapore' },
  tw: { type: 'ccTLD', notes: 'Taiwan' },
  hk: { type: 'ccTLD', notes: 'Hong Kong' },
  ar: { type: 'ccTLD', notes: 'Argentina' },
  cl: { type: 'ccTLD', notes: 'Chile' },
  ve: { type: 'ccTLD', notes: 'Venezuela' },
  th: { type: 'ccTLD', notes: 'Thailand' },
  id: { type: 'ccTLD', notes: 'Indonesia' },
  info: { type: 'gTLD', notes: 'Information' },
  biz: { type: 'gTLD', notes: 'Business' },
  name: { type: 'gTLD', notes: 'Personal' },
  pro: { type: 'gTLD', notes: 'Professional' },
  store: { type: 'gTLD', notes: 'E-commerce' },
  online: { type: 'gTLD', notes: 'Online' },
  site: { type: 'gTLD', notes: 'Website' },
}

export default function WhoisLookup() {
  const [searchParams] = useSearchParams()
  const { domain: sharedDomain, setDomain } = useDomain()
  const { addHistory } = useHistory()
  const { setLastResult } = useScanResults()
  const [domain, setDomainLocal] = useState(searchParams.get('q') || sharedDomain || '')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cacheStats, setCacheStats] = useState<any>(null)
  const navigate = useNavigate()

  // Load cache stats on mount and after each lookup
  useEffect(() => {
    api.whoisStats().then(res => setCacheStats(res.data)).catch(() => {})
  }, [])

  const q = searchParams.get('q')
  useEffect(() => {
    if (q) {
      setDomainLocal(q)
      runLookup(q)
    }
  }, [q])

  const validateDomain = (d: string): string | null => {
    let domain = d.trim()
    if (!domain) return 'Domain cannot be empty'

    // Remove protocol prefix
    if (domain.startsWith('http://')) domain = domain.slice(7)
    else if (domain.startsWith('https://')) domain = domain.slice(8)

    // Remove trailing slash and path
    const slashIdx = domain.indexOf('/')
    if (slashIdx !== -1) domain = domain.slice(0, slashIdx)

    // Remove port
    const colonIdx = domain.indexOf(':')
    if (colonIdx !== -1) domain = domain.slice(0, colonIdx)

    // Remove trailing dot (FQDN)
    domain = domain.replace(/\.$/, '')

    if (!domain) return 'Invalid domain format'
    if (!domain.includes('.')) return 'Domain must contain at least one dot (e.g. example.com)'
    if (domain.length > 253) return 'Domain name too long (max 253 characters)'

    const labels = domain.split('.')
    const labelRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i

    for (const label of labels) {
      if (!label) return 'Domain contains empty label'
      if (label.length > 63) return `Domain label too long: '${label}' (max 63 characters)`
      if (!labelRegex.test(label)) return `Invalid domain label: '${label}' (only alphanumeric and hyphens allowed)`
    }

    const tld = labels[labels.length - 1]
    if (tld.length < 2) return 'TLD must be at least 2 characters'

    return null
  }

  const runLookup = async (d?: string, refresh = false) => {
    const target = (d || domain).trim()
    if (!target) return

    if (!refresh) {
      const validationError = validateDomain(target)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    setDomain(target)
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await api.whois(target, refresh)
      setResult(res.data)
      setLastResult('whois', target, res.data)
      addHistory(target, 'WHOIS Lookup')
    } catch (e: any) { setError(e.message) } finally {
      setLoading(false)
      // Refresh cache stats after lookup
      api.whoisStats().then(res => setCacheStats(res.data)).catch(() => {})
    }
  }

  const formatDate = (d: string) => {
    if (!d) return 'N/A'
    try {
      return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch { return d }
  }

  const calcAge = (created: string) => {
    if (!created) return null
    const diff = Date.now() - new Date(created).getTime()
    if (diff < 0) return null
    const days = Math.floor(diff / 86400000)
    if (days < 30) return `${days} days`
    if (days < 365) return `${Math.floor(days / 30)} months`
    const years = Math.floor(days / 365)
    const remainMonths = Math.floor((days % 365) / 30)
    return remainMonths > 0 ? `${years}y ${remainMonths}m` : `${years} year${years !== 1 ? 's' : ''}`
  }

  const calcExpiry = (expires: string) => {
    if (!expires) return null
    const diff = new Date(expires).getTime() - Date.now()
    const days = Math.floor(diff / 86400000)
    return days
  }

  // Precise countdown: days, hours, minutes
  const preciseCountdown = useMemo(() => {
    if (!result?.expires_at) return null
    const diff = new Date(result.expires_at).getTime() - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, expired: true }
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    return { days, hours, minutes, expired: false }
  }, [result?.expires_at])

  const expiryDays = result ? calcExpiry(result.expires_at) : null
  const domainAge = result ? calcAge(result.created_at) : null
  const agePercent = result?.created_at ? Math.min(100, ((Date.now() - new Date(result.created_at).getTime()) / (10 * 365.25 * 86400000)) * 100) : 0
  const ringRadius = 45
  const ringCircumference = 2 * Math.PI * ringRadius
  const expiryPercent = expiryDays !== null && expiryDays > 0 ? Math.min(100, (expiryDays / 365) * 100) : 0
  const ringColor = expiryDays !== null ? (expiryDays <= 0 ? '#ef4444' : expiryDays <= 30 ? '#ef4444' : expiryDays <= 90 ? '#f59e0b' : '#10b981') : '#6b7280'

  // Extract TLD info — handles compound TLDs like .com.tr, .co.uk
  const tld = useMemo(() => {
    if (!result?.domain) return null
    const domain = result.domain.toLowerCase()
    // Check compound TLDs first (longest match)
    for (const [ctld, info] of Object.entries(compoundTLDs)) {
      if (domain.endsWith('.' + ctld)) {
        return { type: info.type, notes: `${info.country} — .${ctld}` }
      }
    }
    // Fall back to simple TLD
    const parts = domain.split('.')
    const tldKey = parts[parts.length - 1]
    return tldKey ? (tldInfo[tldKey] || null) : null
  }, [result?.domain])

  // Timeline events
  const timelineEvents = useMemo(() => {
    if (!result) return []
    const events: { date: string; label: string; color: string; icon: any }[] = []
    if (result.created_at) {
      events.push({ date: result.created_at, label: 'Domain Registered', color: 'bg-blue-500', icon: Globe })
    }
    if (result.updated_at && result.updated_at !== result.created_at) {
      events.push({ date: result.updated_at, label: 'Last Updated', color: 'bg-amber-500', icon: Clock })
    }
    if (result.expires_at) {
      events.push({ date: result.expires_at, label: 'Expires', color: expiryDays !== null && expiryDays <= 0 ? 'bg-red-500' : 'bg-emerald-500', icon: Timer })
    }
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [result, expiryDays])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 flex items-center justify-center">
          <Globe className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">WHOIS Lookup</h1>
          <p className="text-sm text-text-secondary">Domain registration info, registrar, expiry & name servers</p>
        </div>
      </div>

      <div className="flex gap-3">
        <input type="text" value={domain} onChange={(e) => setDomainLocal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runLookup()}
          placeholder="Enter domain (e.g. google.com)"
          className="flex-1 h-11 px-4 rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
        <button onClick={() => runLookup()} disabled={loading || !domain.trim()}
          className="h-11 px-6 rounded-xl bg-gradient-to-r from-accent to-purple-500 hover:from-accent-hover hover:to-purple-400 disabled:opacity-50 text-white text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-accent/25">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Lookup
        </button>
        {result && (
          <button onClick={() => runLookup(undefined, true)} disabled={loading}
            className="h-11 px-4 rounded-xl bg-surface border border-border hover:border-border-hover text-text-secondary hover:text-text-primary disabled:opacity-50 text-sm font-medium transition-all flex items-center gap-2"
            title="Refresh (bypass 24h cache)">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Refresh
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-danger-muted border border-danger/20 text-danger text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {loading && <WhoisSkeleton />}

      {!loading && result && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <CheckCircle2 className="w-4 h-4 text-success" />
              WHOIS for <span className="font-mono text-text-primary">{result.domain}</span>
              <span className="text-text-muted">· {result.duration_ms}ms</span>
            </div>
            <ExportButton data={result} filename={`whois-${result.domain}`} />
          </div>

          {/* Cache Stats */}
          {cacheStats && (
            <div className="p-3 rounded-xl bg-surface border border-border">
              <div className="flex items-center gap-4 flex-wrap text-[10px]">
                <span className="text-text-muted font-semibold uppercase tracking-wider">Cache:</span>
                <span className="text-text-secondary"><span className="font-mono text-success font-semibold">{cacheStats.hits}</span> hits</span>
                <span className="text-text-secondary"><span className="font-mono text-danger font-semibold">{cacheStats.misses}</span> misses</span>
                <span className="text-text-secondary"><span className="font-mono text-accent font-semibold">{cacheStats.hit_rate?.toFixed(1)}%</span> hit rate</span>
                <span className="text-text-secondary"><span className="font-mono text-text-primary font-semibold">{cacheStats.size}</span>/{cacheStats.max_size} entries</span>
                {cacheStats.avg_age_s > 0 && (
                  <span className="text-text-secondary">Avg age: <span className="font-mono text-text-primary font-semibold">{Math.round(cacheStats.avg_age_s)}s</span></span>
                )}
              </div>
            </div>
          )}

          {/* TLD Badge */}
          {tld && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-surface border border-border">
              <span className="text-xs font-semibold text-text-muted">TLD:</span>
              <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-xs font-bold">
                .{result.domain.split('.').pop()}
              </span>
              <span className="text-xs text-text-secondary">{tld.type}</span>
              {tld.notes && (
                <>
                  <span className="text-text-muted">·</span>
                  <span className="text-xs text-text-muted">{tld.notes}</span>
                </>
              )}
            </div>
          )}

          {/* Quick Cross-Tool Links */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-muted font-semibold">Quick tools:</span>
            {quickLinks.map((link) => {
              const Icon = link.icon
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(`${link.path}?q=${encodeURIComponent(result.domain)}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-border-hover hover:bg-surface-hover transition-all text-xs font-medium text-text-secondary"
                >
                  <Icon className={`w-3 h-3 ${link.color}`} />
                  {link.label}
                  <ArrowRight className="w-3 h-3 opacity-50" />
                </button>
              )
            })}
          </div>

          {/* Domain Lifecycle — Combined Ring + Age Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Registrar</span>
              </div>
              <div className="text-sm font-semibold text-text-primary">{result.registrar || 'N/A'}</div>
              {result.server && (
                <div className="text-[10px] text-text-muted mt-1 font-mono">via {result.server}</div>
              )}
              {result.cached && (
                <div className="mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[10px] font-semibold">
                    <Clock className="w-3 h-3" /> Cached
                  </span>
                </div>
              )}
            </div>
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Created</span>
              </div>
              <div className="text-sm font-semibold text-text-primary">{formatDate(result.created_at)}</div>
            </div>

            {/* Combined Lifecycle Card: Ring + Age + Expiry */}
            <div className="p-5 rounded-2xl bg-surface border border-border flex flex-col items-center gap-4">
              {expiryDays !== null && result.expires_at ? (
                <>
                  <div className="relative w-28 h-28">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r={ringRadius} fill="none" stroke="currentColor" strokeWidth="6" className="text-surface-hover" />
                      <circle
                        cx="50" cy="50" r={ringRadius}
                        fill="none"
                        stroke={ringColor}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringCircumference - (ringCircumference * expiryPercent) / 100}
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold" style={{ color: ringColor }}>
                        {expiryDays <= 0 ? '!' : expiryDays}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {expiryDays <= 0 ? 'Expired' : 'days left'}
                      </span>
                    </div>
                  </div>

                  {/* Precise Countdown */}
                  {preciseCountdown && !preciseCountdown.expired && (
                    <div className="flex items-center gap-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-text-primary">{preciseCountdown.days}</span>
                        <span className="text-[10px] text-text-muted uppercase">Days</span>
                      </div>
                      <span className="text-text-muted text-lg">:</span>
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-text-primary">{preciseCountdown.hours}</span>
                        <span className="text-[10px] text-text-muted uppercase">Hours</span>
                      </div>
                      <span className="text-text-muted text-lg">:</span>
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-text-primary">{preciseCountdown.minutes}</span>
                        <span className="text-[10px] text-text-muted uppercase">Min</span>
                      </div>
                    </div>
                  )}

                  <div className="w-full space-y-2">
                    {/* Inline warning banner */}
                    {expiryDays !== null && expiryDays <= 0 && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-danger-muted border border-danger/20">
                        <AlertCircle className="w-3.5 h-3.5 text-danger flex-shrink-0" />
                        <span className="text-[11px] font-semibold text-danger">Expired! May be available for re-registration.</span>
                      </div>
                    )}
                    {expiryDays !== null && expiryDays > 0 && expiryDays <= 30 && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-danger-muted border border-danger/20">
                        <AlertCircle className="w-3.5 h-3.5 text-danger flex-shrink-0" />
                        <span className="text-[11px] font-semibold text-danger">Renew immediately — {expiryDays} days left!</span>
                      </div>
                    )}
                    {expiryDays !== null && expiryDays > 30 && expiryDays <= 90 && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-warning-muted border border-warning/20">
                        <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                        <span className="text-[11px] font-semibold text-warning">Expires in {expiryDays} days — consider renewing.</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-muted">Expires</span>
                      <span className={`text-xs font-semibold ${expiryDays <= 30 ? 'text-danger' : expiryDays <= 90 ? 'text-warning' : 'text-success'}`}>
                        {formatDate(result.expires_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-muted">Domain Age</span>
                      <span className="text-xs font-semibold text-text-primary">{domainAge || 'N/A'}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${agePercent}%`, background: 'linear-gradient(90deg, #10b981 0%, #f59e0b 60%, #ef4444 100%)' }} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-text-muted">0y</span>
                      <span className="text-[10px] text-text-muted">10y</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Timer className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Domain Age</span>
                  </div>
                  <div className="text-sm font-semibold text-text-primary">{domainAge || 'N/A'}</div>
                  {result.created_at && (
                    <div className="text-xs text-text-muted">since {formatDate(result.created_at)}</div>
                  )}
                  <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${agePercent}%`, background: 'linear-gradient(90deg, #10b981 0%, #f59e0b 60%, #ef4444 100%)' }} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-text-muted">0y</span>
                    <span className="text-[10px] text-text-muted">10y</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Domain Timeline */}
          {timelineEvents.length > 0 && (
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-accent" />
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Domain Timeline</span>
              </div>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-4">
                  {timelineEvents.map((event, i) => {
                    const Icon = event.icon
                    return (
                      <div key={i} className="relative flex items-start gap-4 pl-1">
                        <div className={`relative z-10 w-7 h-7 rounded-full ${event.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-text-primary">{event.label}</span>
                            <span className="text-xs font-mono text-text-muted">{formatDate(event.date)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {result.updated_at && (
            <div className="p-3 rounded-xl bg-surface border border-border flex items-center gap-2">
              <span className="text-xs text-text-muted">Last Updated:</span>
              <span className="text-sm font-mono text-text-primary">{formatDate(result.updated_at)}</span>
            </div>
          )}

          {/* Name Servers */}
          {result.name_servers?.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Name Servers</h3>
              <div className="space-y-1.5">
                {result.name_servers.map((ns: string, i: number) => (
                  <div key={i} className="py-2 px-4 rounded-xl bg-surface border border-border hover:border-border-hover transition-colors">
                    <span className="text-sm font-mono text-accent">{ns}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw Details */}
          {result.details && Object.keys(result.details).length > 0 && (
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-text-secondary transition-colors py-1">
                <span>Raw Details ({Object.keys(result.details).length} fields)</span>
                <span className="text-text-muted group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="mt-2 space-y-1">
                {Object.entries(result.details).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-3 py-2 px-4 rounded-xl bg-surface border border-border hover:border-border-hover transition-colors">
                    <span className="text-xs font-semibold text-text-secondary min-w-32 flex-shrink-0">{key}</span>
                    <span className="text-sm font-mono text-text-primary break-all">{String(value)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

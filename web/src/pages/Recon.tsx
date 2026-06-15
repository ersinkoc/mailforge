import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Globe, Shield, Server, Mail, Lock, CheckCircle2, XCircle, AlertTriangle,
  Clock, Zap, Activity, Database, Network, FileText, Calendar, Loader2,
  ExternalLink, TrendingUp, TrendingDown, Minus, AlertCircle
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import SearchInput from '@/components/SearchInput'
import { api } from '@/lib/api'
import { useDomain, useHistory } from '@/lib/store'
import { useToast } from '@/components/Toast'
import { cn } from '@/lib/utils'

interface ToolResult {
  name: string
  status: 'pending' | 'loading' | 'done' | 'error'
  data?: unknown
  error?: string
  duration?: number
}

// Score badge component
function ScoreBadge({ score }: { score: string }) {
  const colors: Record<string, string> = {
    excellent: 'bg-success/20 text-success border-success/30',
    good: 'bg-info/20 text-info border-info/30',
    fair: 'bg-warning/20 text-warning border-warning/30',
    poor: 'bg-danger/20 text-danger border-danger/30',
  }
  return (
    <span className={cn(
      "px-3 py-1 rounded-full text-sm font-medium border",
      colors[score.toLowerCase()] || 'bg-surface text-text-secondary border-border'
    )}>
      {score}
    </span>
  )
}

// Progress bar component
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// Status indicator
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="w-4 h-4 text-success" />
    case 'error':
      return <XCircle className="w-4 h-4 text-danger" />
    case 'loading':
      return <Loader2 className="w-4 h-4 text-accent animate-spin" />
    default:
      return <div className="w-4 h-4 rounded-full border-2 border-text-muted" />
  }
}

// DNS Record table
function DNSRecordsTable({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      {/* A Records */}
      {data.a?.length > 0 && (
        <div>
          <div className="text-xs font-medium text-text-muted mb-1">IPv4 Addresses</div>
          <div className="flex flex-wrap gap-2">
            {data.a.map((r: any, i: number) => (
              <span key={i} className="px-2 py-1 bg-surface-2 rounded text-sm font-mono">
                {r.ip}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AAAA Records */}
      {data.aaaa?.length > 0 && (
        <div>
          <div className="text-xs font-medium text-text-muted mb-1">IPv6 Addresses</div>
          <div className="flex flex-wrap gap-2">
            {data.aaaa.map((r: any, i: number) => (
              <span key={i} className="px-2 py-1 bg-surface-2 rounded text-sm font-mono text-xs">
                {r.ip}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* MX Records */}
      {data.mx?.length > 0 && (
        <div>
          <div className="text-xs font-medium text-text-muted mb-1">Mail Servers</div>
          <div className="space-y-1">
            {data.mx.slice(0, 5).map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-xs text-text-muted w-8">{r.priority}</span>
                <span className="font-mono">{r.host || '(none)'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TXT Records */}
      {data.txt?.length > 0 && (
        <div>
          <div className="text-xs font-medium text-text-muted mb-1">TXT Records</div>
          <div className="space-y-1">
            {data.txt.slice(0, 3).map((r: any, i: number) => (
              <div key={i} className="text-xs font-mono text-text-secondary truncate" title={r.text}>
                {r.text.slice(0, 60)}...
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Name Servers */}
      {data.ns?.length > 0 && (
        <div>
          <div className="text-xs font-medium text-text-muted mb-1">Name Servers</div>
          <div className="space-y-1">
            {data.ns.map((r: any, i: number) => (
              <div key={i} className="text-sm font-mono text-text-secondary">
                {r.host}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// SPF Result display
function SPFResult({ data }: { data: any }) {
  const status = data?.is_valid ? 'valid' : 'invalid'
  const statusColors = {
    valid: 'text-success',
    invalid: 'text-danger',
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <StatusIcon status={data?.is_valid ? 'done' : 'error'} />
        <span className={cn("font-medium", statusColors[status])}>
          SPF {data?.is_valid ? 'Valid' : 'Invalid'}
        </span>
      </div>
      {data?.record && (
        <div className="text-xs font-mono text-text-muted bg-surface-2 p-2 rounded truncate" title={data.record}>
          {data.record}
        </div>
      )}
      {data?. mechanisms && (
        <div className="flex flex-wrap gap-1 mt-2">
          {data.mechanisms.map((m: string, i: number) => (
            <span key={i} className="px-2 py-0.5 bg-surface-2 rounded text-xs">
              {m}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// DMARC Result display
function DMARCResult({ data }: { data: any }) {
  const hasRecord = !!data?.record

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <StatusIcon status={hasRecord ? 'done' : 'error'} />
        <span className={cn("font-medium", hasRecord ? 'text-success' : 'text-danger')}>
          {hasRecord ? 'DMARC Found' : 'No DMARC Record'}
        </span>
      </div>
      {data?.policy && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Policy:</span>
          <span className={cn(
            "px-2 py-0.5 rounded text-xs font-medium",
            data.policy === 'reject' ? 'bg-danger/20 text-danger' :
            data.policy === 'quarantine' ? 'bg-warning/20 text-warning' :
            'bg-surface-2 text-text-secondary'
          )}>
            {data.policy}
          </span>
        </div>
      )}
      {data?.record && (
        <div className="text-xs font-mono text-text-muted bg-surface-2 p-2 rounded" title={data.record}>
          {data.record.slice(0, 80)}...
        </div>
      )}
    </div>
  )
}

// Blacklist result
function BlacklistResult({ data }: { data: any }) {
  const listed = data?.listed_count > 0

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <StatusIcon status={listed ? 'error' : 'done'} />
        <span className={cn("font-medium", listed ? 'text-danger' : 'text-success')}>
          {listed ? `${data.listed_count} Listings Found` : 'Not Listed'}
        </span>
      </div>
      {data?.lists?.length > 0 && (
        <div className="space-y-1">
          {data.lists.slice(0, 5).map((l: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-danger">{l.list}</span>
              <span className="text-text-muted">{l.result}</span>
            </div>
          ))}
          {data.lists.length > 5 && (
            <div className="text-xs text-text-muted">+{data.lists.length - 5} more</div>
          )}
        </div>
      )}
    </div>
  )
}

// Deliverability score gauge
function DeliverabilityScore({ data }: { data: any }) {
  const score = data?.score || 0
  const grade = data?.grade || 'N/A'

  const gradeColors: Record<string, string> = {
    'A+': 'text-success', 'A': 'text-success', 'A-': 'text-success',
    'B+': 'text-info', 'B': 'text-info', 'B-': 'text-info',
    'C+': 'text-warning', 'C': 'text-warning', 'C-': 'text-warning',
    'D': 'text-danger', 'F': 'text-danger',
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="var(--surface-2)"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--info)' : score >= 40 ? 'var(--warning)' : 'var(--danger)'}
              strokeWidth="3"
              strokeDasharray={`${score}, 100`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-lg font-bold", gradeColors[grade] || 'text-text-primary')}>
              {grade}
            </span>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-2xl font-bold">{score}/100</div>
          <div className="text-xs text-text-muted">Deliverability Score</div>
        </div>
      </div>
      {data?.issues?.length > 0 && (
        <div className="space-y-1">
          {data.issues.map((issue: string, i: number) => (
            <div key={i} className="flex items-start gap-1 text-xs text-warning">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{issue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Subdomains result
function SubdomainsResult({ data }: { data: any }) {
  const count = data?.subdomains?.length || 0

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <StatusIcon status={count > 0 ? 'done' : 'error'} />
        <span className="font-medium">{count} Subdomains Found</span>
      </div>
      {count > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.subdomains.slice(0, 10).map((s: string, i: number) => (
            <span key={i} className="px-2 py-0.5 bg-surface-2 rounded text-xs font-mono">
              {s}
            </span>
          ))}
          {count > 10 && (
            <span className="px-2 py-0.5 bg-surface-2 rounded text-xs text-text-muted">
              +{count - 10} more
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Port scan result
function PortScanResult({ data }: { data: any }) {
  const openPorts = data?.open_ports || []
  const filtered = openPorts.filter((p: any) => p.status === 'open')

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <StatusIcon status={filtered.length > 0 ? 'done' : 'error'} />
        <span className="font-medium">{filtered.length} Open Ports</span>
      </div>
      {filtered.length > 0 && (
        <div className="grid grid-cols-4 gap-1">
          {filtered.slice(0, 12).map((p: any, i: number) => (
            <div key={i} className="px-2 py-1 bg-surface-2 rounded text-xs text-center">
              <span className="font-mono">{p.port}</span>
              <div className="text-[10px] text-text-muted truncate">{p.service || ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// TLS result
function TLSResult({ data }: { data: any }) {
  const grade = data?.grade || 'N/A'
  const gradeColors: Record<string, string> = {
    'A+': 'text-success', 'A': 'text-success', 'A-': 'text-success',
    'B': 'text-info', 'C': 'text-warning', 'D': 'text-danger', 'F': 'text-danger',
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <StatusIcon status={grade !== 'N/A' ? 'done' : 'error'} />
        <span className={cn("font-bold text-lg", gradeColors[grade] || 'text-text-primary')}>
          {grade}
        </span>
        <span className="text-xs text-text-muted">TLS Grade</span>
      </div>
      {data?.protocol && (
        <div className="text-xs text-text-muted">
          Protocol: <span className="text-text-secondary font-mono">{data.protocol}</span>
        </div>
      )}
      {data?.cipher && (
        <div className="text-xs text-text-muted truncate" title={data.cipher}>
          Cipher: <span className="text-text-secondary font-mono">{data.cipher.slice(0, 30)}</span>
        </div>
      )}
    </div>
  )
}

// Geo result
function GeoResult({ data }: { data: any }) {
  if (!data?.country) {
    return (
      <div className="flex items-center gap-2 text-text-muted">
        <XCircle className="w-4 h-4 text-danger" />
        <span>No geolocation data</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-surface-2 rounded-full flex items-center justify-center text-xl">
        {data.country_code}
      </div>
      <div>
        <div className="font-medium">{data.country}</div>
        <div className="text-sm text-text-muted">
          {data.city && `${data.city}, `}{data.region}
        </div>
        {data.isp && (
          <div className="text-xs text-text-muted">{data.isp}</div>
        )}
      </div>
    </div>
  )
}

// Email validation result
function EmailResult({ data }: { data: any }) {
  const status = data?.valid ? 'valid' : 'invalid'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <StatusIcon status={status === 'valid' ? 'done' : 'error'} />
        <span className={cn("font-medium", status === 'valid' ? 'text-success' : 'text-danger')}>
          {data?.email || 'Email'} {status === 'valid' ? 'Valid' : 'Invalid'}
        </span>
      </div>
      {data?.issues?.length > 0 && (
        <div className="space-y-1">
          {data.issues.map((issue: string, i: number) => (
            <div key={i} className="flex items-start gap-1 text-xs text-warning">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{issue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// WHOIS summary card
function WhoisSummary({ data }: { data: any }) {
  if (!data) return null

  const created = data.created_at ? new Date(data.created_at) : null
  const expires = data.expires_at ? new Date(data.expires_at) : null
  const age = created ? Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 365)) : null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <StatusIcon status="done" />
        <span className="font-medium">{data.registrar || 'Unknown Registrar'}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {created && (
          <div>
            <div className="text-xs text-text-muted">Registered</div>
            <div>{created.toLocaleDateString()}</div>
          </div>
        )}
        {expires && (
          <div>
            <div className="text-xs text-text-muted">Expires</div>
            <div className={expires < new Date() ? 'text-danger' : ''}>
              {expires.toLocaleDateString()}
            </div>
          </div>
        )}
        {age !== null && (
          <div>
            <div className="text-xs text-text-muted">Age</div>
            <div>{age} years</div>
          </div>
        )}
        {data.name_servers?.length > 0 && (
          <div>
            <div className="text-xs text-text-muted">Name Servers</div>
            <div>{data.name_servers.length}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Recon() {
  const [params] = useSearchParams()
  const { domain, setDomain } = useDomain()
  const { addHistory } = useHistory()
  const { toast } = useToast()
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)

  const [tools, setTools] = useState<Record<string, ToolResult>>({
    whois: { name: 'WHOIS', status: 'pending' },
    dns: { name: 'DNS Lookup', status: 'pending' },
    mx: { name: 'MX Records', status: 'pending' },
    spf: { name: 'SPF Check', status: 'pending' },
    dkim: { name: 'DKIM Check', status: 'pending' },
    dmarc: { name: 'DMARC Check', status: 'pending' },
    dnssec: { name: 'DNSSEC', status: 'pending' },
    blacklist: { name: 'Blacklist', status: 'pending' },
    deliverability: { name: 'Deliverability', status: 'pending' },
    subdomains: { name: 'Subdomains', status: 'pending' },
    portscan: { name: 'Port Scan', status: 'pending' },
    tls: { name: 'TLS Inspector', status: 'pending' },
    geo: { name: 'GeoIP', status: 'pending' },
    email: { name: 'Email Validate', status: 'pending' },
  })

  useEffect(() => {
    const initial = domain || params.get('q') || ''
    setInput(initial)
  }, [domain, params])

  const updateTool = (key: string, update: Partial<ToolResult>) => {
    setTools(prev => ({ ...prev, [key]: { ...prev[key], ...update } }))
  }

  const runAllTools = async () => {
    if (!input.trim()) return
    setDomain(input.trim())
    setRunning(true)
    setStartTime(Date.now())

    // Reset all tools
    setTools({
      whois: { name: 'WHOIS', status: 'pending' },
      dns: { name: 'DNS Lookup', status: 'pending' },
      mx: { name: 'MX Records', status: 'pending' },
      spf: { name: 'SPF Check', status: 'pending' },
      dkim: { name: 'DKIM Check', status: 'pending' },
      dmarc: { name: 'DMARC Check', status: 'pending' },
      dnssec: { name: 'DNSSEC', status: 'pending' },
      blacklist: { name: 'Blacklist', status: 'pending' },
      deliverability: { name: 'Deliverability', status: 'pending' },
      subdomains: { name: 'Subdomains', status: 'pending' },
      portscan: { name: 'Port Scan', status: 'pending' },
      tls: { name: 'TLS Inspector', status: 'pending' },
      geo: { name: 'GeoIP', status: 'pending' },
      email: { name: 'Email Validate', status: 'pending' },
    })

    const target = input.trim()

    // Phase 1: Independent tools in parallel
    const phase1 = [
      (async () => {
        updateTool('dns', { status: 'loading' })
        const start = Date.now()
        try {
          const res = await api.dns(target)
          updateTool('dns', { status: 'done', data: res.data, duration: Date.now() - start })
        } catch (e: any) {
          updateTool('dns', { status: 'error', error: e.message })
        }
      })(),
      (async () => {
        updateTool('whois', { status: 'loading' })
        const start = Date.now()
        try {
          const res = await api.whois(target)
          updateTool('whois', { status: 'done', data: res.data, duration: Date.now() - start })
        } catch (e: any) {
          updateTool('whois', { status: 'error', error: e.message })
        }
      })(),
    ]

    await Promise.all(phase1)

    // Get IP from DNS result directly (not from state)
    let dnsResult: any = null
    setTools(prev => {
      dnsResult = prev.dns.data
      return prev
    })
    const primaryIP = dnsResult?.a?.[0]?.ip

    // Phase 2: Domain-based tools (all parallel after DNS completes)
    const phase2 = [
      (async () => {
        updateTool('mx', { status: 'loading' })
        const start = Date.now()
        try {
          const res = await api.mx(target)
          updateTool('mx', { status: 'done', data: res.data, duration: Date.now() - start })
        } catch (e: any) {
          updateTool('mx', { status: 'error', error: e.message })
        }
      })(),
      (async () => {
        updateTool('spf', { status: 'loading' })
        const start = Date.now()
        try {
          const res = await api.spf(target)
          updateTool('spf', { status: 'done', data: res.data, duration: Date.now() - start })
        } catch (e: any) {
          updateTool('spf', { status: 'error', error: e.message })
        }
      })(),
      (async () => {
        updateTool('dkim', { status: 'loading' })
        const start = Date.now()
        try {
          const res = await api.dkim(target, 'default')
          updateTool('dkim', { status: 'done', data: res.data, duration: Date.now() - start })
        } catch (e: any) {
          updateTool('dkim', { status: 'error', error: e.message })
        }
      })(),
      (async () => {
        updateTool('dmarc', { status: 'loading' })
        const start = Date.now()
        try {
          const res = await api.dmarc(target)
          updateTool('dmarc', { status: 'done', data: res.data, duration: Date.now() - start })
        } catch (e: any) {
          updateTool('dmarc', { status: 'error', error: e.message })
        }
      })(),
      (async () => {
        updateTool('dnssec', { status: 'loading' })
        const start = Date.now()
        try {
          const res = await api.dnssec(target)
          updateTool('dnssec', { status: 'done', data: res.data, duration: Date.now() - start })
        } catch (e: any) {
          updateTool('dnssec', { status: 'error', error: e.message })
        }
      })(),
      (async () => {
        updateTool('deliverability', { status: 'loading' })
        const start = Date.now()
        try {
          const res = await api.deliverability(target)
          updateTool('deliverability', { status: 'done', data: res.data, duration: Date.now() - start })
        } catch (e: any) {
          updateTool('deliverability', { status: 'error', error: e.message })
        }
      })(),
      (async () => {
        updateTool('subdomains', { status: 'loading' })
        const start = Date.now()
        try {
          const res = await api.subdomains(target)
          updateTool('subdomains', { status: 'done', data: res.data, duration: Date.now() - start })
        } catch (e: any) {
          updateTool('subdomains', { status: 'error', error: e.message })
        }
      })(),
      (async () => {
        updateTool('email', { status: 'loading' })
        const start = Date.now()
        try {
          const res = await api.email(`admin@${target}`)
          updateTool('email', { status: 'done', data: res.data, duration: Date.now() - start })
        } catch (e: any) {
          updateTool('email', { status: 'error', error: e.message })
        }
      })(),
    ]

    // Phase 2b: IP-based tools (run in parallel with Phase 2)
    const phase2b = [
      (async () => {
        if (!primaryIP) {
          updateTool('blacklist', { status: 'done', data: { listed_count: 0 }, duration: 0 })
          return
        }
        updateTool('blacklist', { status: 'loading' })
        const start = Date.now()
        try {
          const res = await api.blacklist(primaryIP)
          updateTool('blacklist', { status: 'done', data: res.data, duration: Date.now() - start })
        } catch (e: any) {
          updateTool('blacklist', { status: 'error', error: e.message })
        }
      })(),
      (async () => {
        if (!primaryIP) {
          updateTool('tls', { status: 'done', data: {}, duration: 0 })
          return
        }
        updateTool('tls', { status: 'loading' })
        const start = Date.now()
        try {
          const res = await api.tls(primaryIP)
          updateTool('tls', { status: 'done', data: res.data, duration: Date.now() - start })
        } catch (e: any) {
          updateTool('tls', { status: 'error', error: e.message })
        }
      })(),
      (async () => {
        if (!primaryIP) {
          updateTool('geo', { status: 'done', data: {}, duration: 0 })
          return
        }
        updateTool('geo', { status: 'loading' })
        const start = Date.now()
        try {
          const res = await api.geo(primaryIP)
          updateTool('geo', { status: 'done', data: res.data, duration: Date.now() - start })
        } catch (e: any) {
          updateTool('geo', { status: 'error', error: e.message })
        }
      })(),
    ]

    // Run both phases in parallel
    await Promise.all([...phase2, ...phase2b])

    // Phase 3: Port scan (depends on MX)
    let mxResult: any = null
    setTools(prev => {
      mxResult = prev.mx.data
      return prev
    })
    const mailServer = mxResult?.mx?.[0]?.host
    if (mailServer) {
      updateTool('portscan', { status: 'loading' })
      const start = Date.now()
      try {
        const res = await api.scan(mailServer)
        updateTool('portscan', { status: 'done', data: res.data, duration: Date.now() - start })
      } catch (e: any) {
        updateTool('portscan', { status: 'error', error: e.message })
      }
    } else {
      updateTool('portscan', { status: 'done', data: { open_ports: [] }, duration: 0 })
    }

    setRunning(false)
    addHistory(target, 'Recon')
    toast(`Recon complete for ${target}`, 'success')
  }

  // Calculate summary stats
  const stats = useMemo(() => {
    const entries = Object.values(tools)
    const done = entries.filter(t => t.status === 'done').length
    const errors = entries.filter(t => t.status === 'error').length
    const totalDuration = startTime ? Date.now() - startTime : 0
    return { done, errors, total: entries.length, totalDuration }
  }, [tools, startTime])

  // Render tool-specific content
  const renderToolContent = (key: string, tool: ToolResult) => {
    if (tool.status !== 'done' || !tool.data) return null

    switch (key) {
      case 'whois':
        return <WhoisSummary data={tool.data} />
      case 'dns':
        return <DNSRecordsTable data={tool.data} />
      case 'mx':
        return tool.data && typeof tool.data === 'object' && Object.keys(tool.data).length > 0 ? (
          <DNSRecordsTable data={tool.data} />
        ) : (
          <span className="text-text-muted text-sm">No MX records</span>
        )
      case 'spf':
        return <SPFResult data={tool.data} />
      case 'dkim':
        return tool.data && (tool.data as any).record ? (
          <div className="space-y-2">
            <StatusIcon status="done" />
            <div className="text-xs font-mono text-text-muted truncate">{(tool.data as any).record}</div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-text-muted">
            <XCircle className="w-4 h-4 text-warning" />
            <span>No DKIM record found</span>
          </div>
        )
      case 'dmarc':
        return <DMARCResult data={tool.data} />
      case 'dnssec':
        return (
          <div className="flex items-center gap-2">
            <StatusIcon status={(tool.data as any)?.secure ? 'done' : 'error'} />
            <span className={(tool.data as any)?.secure ? 'text-success' : 'text-warning'}>
              {(tool.data as any)?.secure ? 'DNSSEC Secure' : 'DNSSEC Not Configured'}
            </span>
          </div>
        )
      case 'blacklist':
        return <BlacklistResult data={tool.data} />
      case 'deliverability':
        return <DeliverabilityScore data={tool.data} />
      case 'subdomains':
        return <SubdomainsResult data={tool.data} />
      case 'portscan':
        return <PortScanResult data={tool.data} />
      case 'tls':
        return <TLSResult data={tool.data} />
      case 'geo':
        return <GeoResult data={tool.data} />
      case 'email':
        return <EmailResult data={tool.data} />
      default:
        return null
    }
  }

  const ToolCard = ({ toolKey, icon: Icon }: { toolKey: string; icon: any }) => {
    const tool = tools[toolKey]
    if (!tool) return null

    return (
      <div className={cn(
        "bg-surface rounded-lg p-4 border transition-all duration-300",
        tool.status === 'done' && tool.data ? 'border-success/30' :
        tool.status === 'error' ? 'border-danger/30' :
        tool.status === 'loading' ? 'border-accent/50' :
        'border-border opacity-50'
      )}>
        <div className="flex items-center gap-2 mb-3">
          <Icon className="w-4 h-4 text-text-secondary" />
          <span className="text-sm font-medium text-text-secondary">{tool.name}</span>
          <div className="ml-auto flex items-center gap-2">
            {tool.status === 'loading' && <Loader2 className="w-3 h-3 animate-spin text-accent" />}
            {tool.status === 'done' && tool.data !== undefined && <CheckCircle2 className="w-4 h-4 text-success" />}
            {tool.status === 'error' && <XCircle className="w-4 h-4 text-danger" />}
            {tool.status === 'pending' && <div className="w-4 h-4 rounded-full border border-text-muted" />}
            {tool.duration !== undefined && (
              <span className="text-xs text-text-muted">{tool.duration}ms</span>
            )}
          </div>
        </div>
        {tool.status === 'loading' && (
          <ProgressBar value={60} max={100} color="bg-accent" />
        )}
        {tool.status === 'done' && tool.data !== undefined && renderToolContent(toolKey, tool)}
        {tool.status === 'error' && tool.error && (
          <p className="text-xs text-danger">{tool.error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Reconnaissance"
        subtitle="Comprehensive domain analysis — all tools run in parallel for maximum speed"
        icon={Globe}
      />

      {/* Search Bar */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1">
          <SearchInput
            value={input}
            onChange={setInput}
            onSubmit={runAllTools}
            placeholder="Enter domain (e.g., example.com)"
            loading={running}
            buttonLabel={running ? 'Scanning...' : 'Run Recon'}
          />
        </div>
      </div>

      {/* Progress Bar */}
      {running && (
        <div className="mb-6 bg-surface rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent animate-pulse" />
              <span className="text-sm text-text-primary">
                Running {stats.done}/{stats.total} tools...
              </span>
            </div>
            <span className="text-sm text-text-muted">
              {stats.totalDuration}ms elapsed
            </span>
          </div>
          <div className="h-2 bg-surface-2 rounded overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-accent to-accent-2 transition-all duration-300 rounded-full"
              style={{ width: `${(stats.done / stats.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {!running && stats.done > 0 && (
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="bg-surface rounded-lg p-4 border border-border">
            <div className="text-2xl font-bold text-success">{stats.done}</div>
            <div className="text-sm text-text-muted">Completed</div>
          </div>
          <div className="bg-surface rounded-lg p-4 border border-border">
            <div className="text-2xl font-bold text-danger">{stats.errors}</div>
            <div className="text-sm text-text-muted">Errors</div>
          </div>
          <div className="bg-surface rounded-lg p-4 border border-border">
            <div className="text-2xl font-bold text-accent">{stats.totalDuration}ms</div>
            <div className="text-sm text-text-muted">Total Time</div>
          </div>
          <div className="bg-surface rounded-lg p-4 border border-border">
            <div className="text-2xl font-bold text-info">{stats.total}</div>
            <div className="text-sm text-text-muted">Total Tools</div>
          </div>
        </div>
      )}

      {/* Tool Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ToolCard toolKey="whois" icon={FileText} />
        <ToolCard toolKey="dns" icon={Network} />
        <ToolCard toolKey="mx" icon={Mail} />
        <ToolCard toolKey="spf" icon={Shield} />
        <ToolCard toolKey="dkim" icon={Lock} />
        <ToolCard toolKey="dmarc" icon={Shield} />
        <ToolCard toolKey="dnssec" icon={CheckCircle2} />
        <ToolCard toolKey="blacklist" icon={AlertTriangle} />
        <ToolCard toolKey="deliverability" icon={Zap} />
        <ToolCard toolKey="subdomains" icon={Database} />
        <ToolCard toolKey="portscan" icon={Server} />
        <ToolCard toolKey="tls" icon={Lock} />
        <ToolCard toolKey="geo" icon={Globe} />
        <ToolCard toolKey="email" icon={Mail} />
      </div>

      {/* Start Prompt */}
      {!running && stats.done === 0 && (
        <div className="text-center py-12 text-text-muted">
          <Globe className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">Enter a domain and click "Run Recon"</p>
          <p className="text-sm">All 14 diagnostic tools will run in parallel</p>
        </div>
      )}
    </div>
  )
}
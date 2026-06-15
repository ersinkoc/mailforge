import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  Globe, Shield, Server, Mail, Lock, CheckCircle2, XCircle, AlertTriangle, 
  Clock, Zap, Activity, Database, Network, Eye, FileText, RefreshCw, Calendar,
  Loader2, ChevronRight
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

export default function Recon() {
  const [params] = useSearchParams()
  const { domain, setDomain } = useDomain()
  const { addHistory } = useHistory()
  const { toast } = useToast()
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  
  // Individual tool results
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

    // Phase 1: Independent tools in parallel (DNS-based)
    const phase1 = [
      // DNS must come first for MX and Geo
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
      
      // WHOIS is independent
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

    // Phase 2: After DNS completes - MX, Geo
    const dnsData = tools.dns.data as any
    const primaryIP = dnsData?.a?.[0]?.ip || dnsData?.aaaa?.[0]?.ip

    const phase2 = [
      // MX needs DNS (domain's mail servers)
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

      // SPF needs DNS
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

      // DKIM - domain independent
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

      // DMARC
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

      // DNSSEC
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

      // Blacklist - needs IP from DNS
      (async () => {
        if (!primaryIP) {
          updateTool('blacklist', { status: 'done', data: { ip: null, lists: [], listed_count: 0 }, duration: 0 })
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

      // Deliverability
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

      // Subdomains
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

      // TLS - needs IP
      (async () => {
        if (!primaryIP) {
          updateTool('tls', { status: 'done', data: { error: 'No IP found' }, duration: 0 })
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

      // GeoIP - needs IP
      (async () => {
        if (!primaryIP) {
          updateTool('geo', { status: 'done', data: { ip: null }, duration: 0 })
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

      // Email validation
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

    await Promise.all(phase2)

    // Phase 3: Port scan (takes longer, run last)
    const mxData = tools.mx.data as any
    const mailServer = mxData?.mx?.[0]?.host
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
      updateTool('portscan', { status: 'done', data: { error: 'No mail server found' }, duration: 0 })
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

  const ToolCard = ({ toolKey, icon: Icon }: { toolKey: string; icon: any }) => {
    const tool = tools[toolKey]
    if (!tool) return null

    return (
      <div className={cn(
        "bg-surface rounded-lg p-4 border transition-all duration-300",
        tool.status === 'done' && tool.data && !tool.error ? 'border-success/30' :
        tool.status === 'error' ? 'border-danger/30' :
        tool.status === 'loading' ? 'border-accent/50 animate-pulse' :
        'border-border opacity-50'
      )}>
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4 text-text-secondary" />
          <span className="text-sm font-medium text-text-secondary">{tool.name}</span>
          <div className="ml-auto flex items-center gap-2">
            {tool.status === 'loading' && <Loader2 className="w-3 h-3 animate-spin text-accent" />}
            {tool.status === 'done' && !tool.error && tool.data !== undefined && <CheckCircle2 className="w-4 h-4 text-success" />}
            {tool.status === 'error' && tool.error && <XCircle className="w-4 h-4 text-danger" />}
            {tool.status === 'pending' && <div className="w-4 h-4 rounded-full border border-text-muted" />}
            {tool.duration !== undefined && <span className="text-xs text-text-muted">{tool.duration}ms</span>}
          </div>
        </div>
        {tool.status === 'loading' && (
          <div className="h-1 bg-surface-2 rounded overflow-hidden">
            <div className="h-full bg-accent animate-pulse rounded-full" style={{ width: '60%' }} />
          </div>
        )}
        {tool.status === 'done' && !tool.error && tool.data !== undefined && (
          <pre className="text-xs text-text-muted overflow-auto max-h-24 whitespace-pre-wrap font-mono">
            {(JSON.stringify(tool.data, null, 2) || '').slice(0, 200)}
            {(JSON.stringify(tool.data) || '').length > 200 && '...'}
          </pre>
        )}
        {tool.status === 'error' && (
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

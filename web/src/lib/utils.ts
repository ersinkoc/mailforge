import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Date / Time ──────────────────────────────────
export function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  return `${m}m ${s}s`
}

// ── Number formatting ────────────────────────────
export function compactNumber(n: number): string {
  if (n < 1000) return n.toString()
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  return `${(n / 1_000_000_000).toFixed(1)}B`
}

// ── Banner parser (SMTP) ─────────────────────────
const BANNER_PATTERNS: { pattern: RegExp; name: string; version?: string }[] = [
  { pattern: /Postfix(?:\s+(?:SMTP|ESMTP))?[\s/]+([\d.]+)/i, name: 'Postfix' },
  { pattern: /Exim\s+([\d.]+)/i, name: 'Exim' },
  { pattern: /Sendmail\s+([\d.]+)/i, name: 'Sendmail' },
  { pattern: /Microsoft ESMTP MAIL Service.*?([\d.]+)/i, name: 'Exchange' },
  { pattern: /Haraka\s+([\d.]+)/i, name: 'Haraka' },
  { pattern: /Lotus-Domino\s+([\d.]+)/i, name: 'Lotus Domino' },
  { pattern: /hMailServer\s+([\d.]+)/i, name: 'hMailServer' },
  { pattern: /OpenSMTPD\s+([\d.]+)/i, name: 'OpenSMTPD' },
  { pattern: /Dovecot\s+(?:Postfix|ESMTP)?[\s/]*([\d.]*)/i, name: 'Dovecot' },
  { pattern: /iRedMail\s+([\d.]+)/i, name: 'iRedMail' },
  { pattern: /Kerio Connect\s+([\d.]+)/i, name: 'Kerio Connect' },
  { pattern: /Zimbra\s+(?:collaboration\s+(?:Server\s+)?)?([\d.]+)/i, name: 'Zimbra' },
  { pattern: /Qmail-1.03/i, name: 'Qmail', version: '1.03' },
  { pattern: /MDaemon\s+([\d.]+)/i, name: 'MDaemon' },
  { pattern: /Novell GroupWise\s+([\d.]+)/i, name: 'GroupWise' },
]

export interface ParsedBanner {
  software: string
  version: string
  hostname?: string
}

export function parseSmtpBanner(banner: string): ParsedBanner | null {
  if (!banner) return null
  const parts = banner.split(/\s+/)
  const hostname = parts.length > 1 ? parts[1]?.split('.')[0] : undefined
  for (const { pattern, name, version } of BANNER_PATTERNS) {
    const match = banner.match(pattern)
    if (match) {
      return { software: name, version: version || match[1] || 'unknown', hostname }
    }
  }
  return null
}

// ── Object flatten ───────────────────────────────
export function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj ?? {})) {
    const newKey = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey))
    } else if (Array.isArray(value)) {
      result[newKey] = value.join('; ')
    } else {
      result[newKey] = value
    }
  }
  return result
}

// ── HTML escape ──────────────────────────────────
export function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ── Detect input type ────────────────────────────
export function detectInputType(input: string): 'ipv4' | 'ipv6' | 'domain' | 'email' | 'url' | 'unknown' {
  if (!input) return 'unknown'
  if (/^https?:\/\//i.test(input)) return 'url'
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(input)) return 'email'
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(input)) return 'ipv4'
  if (input.includes(':') && /^[0-9a-fA-F:]+$/.test(input)) return 'ipv6'
  if (/^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(input)) return 'domain'
  return 'unknown'
}

// ── Color utilities ──────────────────────────────
export function getGradeColor(grade: string): string {
  const g = grade.toUpperCase()
  if (g === 'A+' || g === 'A') return 'text-success'
  if (g === 'B') return 'text-info'
  if (g === 'C') return 'text-warning'
  return 'text-danger'
}

export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-success'
  if (score >= 70) return 'text-info'
  if (score >= 50) return 'text-warning'
  return 'text-danger'
}

// ── Copy to clipboard ────────────────────────────
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// ── Download blob ────────────────────────────────
export function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

// ── Tool metadata catalog ────────────────────────
export interface ToolMeta {
  id: string
  label: string
  description: string
  path: string
  category: 'core' | 'security' | 'network' | 'analysis' | 'utility' | 'monitor'
  badge?: 'new' | 'beta' | 'pro'
  keywords: string[]
}

export const TOOL_CATALOG: ToolMeta[] = [
  // Core
  { id: 'dashboard', label: 'Dashboard', description: 'Overview & analytics', path: '/', category: 'core', keywords: ['home', 'overview'] },
  { id: 'quick-scan', label: 'Quick Scan', description: 'Run 4 essential checks in parallel', path: '/quick-scan', category: 'core', keywords: ['fast', 'instant'] },
  { id: 'recon', label: 'Reconnaissance', description: 'Comprehensive domain analysis — all tools in parallel', path: '/recon', category: 'core', keywords: ['full', 'scan', 'recon', 'all'] },

  // Security
  { id: 'blacklist', label: 'Blacklist Check', description: 'Check IP against 20+ DNSBL lists', path: '/blacklist', category: 'security', keywords: ['dnsbl', 'rbl', 'spam'] },
  { id: 'spf', label: 'SPF Check', description: 'Validate and parse SPF records', path: '/spf', category: 'security', keywords: ['sender', 'policy'] },
  { id: 'dkim', label: 'DKIM Check', description: 'Verify DKIM keys and selectors', path: '/dkim', category: 'security', keywords: ['signature', 'signing'] },
  { id: 'dmarc', label: 'DMARC Check', description: 'Validate DMARC policy and alignment', path: '/dmarc', category: 'security', keywords: ['reporting', 'policy'] },
  { id: 'mtasts', label: 'MTA-STS Check', description: 'Verify MTA Strict Transport Security', path: '/mtasts', category: 'security', badge: 'new', keywords: ['tls', 'smtp'] },
  { id: 'tlsrpt', label: 'TLS-RPT Check', description: 'TLS failure reporting endpoint', path: '/tlsrpt', category: 'security', badge: 'new', keywords: ['reporting'] },
  { id: 'bimi', label: 'BIMI Check', description: 'Brand Indicators for Message Identification', path: '/bimi', category: 'security', badge: 'new', keywords: ['brand', 'logo'] },
  { id: 'dnssec', label: 'DNSSEC Check', description: 'Validate DNSSEC chain', path: '/dnssec', category: 'security', badge: 'new', keywords: ['chain of trust'] },
  { id: 'relay', label: 'Open Relay Test', description: 'Check if SMTP server is an open relay', path: '/relay', category: 'security', badge: 'new', keywords: ['smtp', 'security'] },
  { id: 'catchall', label: 'Catch-All Test', description: 'Detect catch-all email domains', path: '/catchall', category: 'security', badge: 'new', keywords: ['email'] },
  { id: 'deliverability', label: 'Deliverability Score', description: 'Aggregate email-auth score with grade', path: '/deliverability', category: 'security', badge: 'new', keywords: ['score', 'grade'] },

  // Network
  { id: 'dns', label: 'DNS Lookup', description: 'MX, A, AAAA, TXT, NS, CNAME records', path: '/dns', category: 'network', keywords: ['records'] },
  { id: 'mx', label: 'MX Lookup', description: 'Resolve mail exchange records with IPs', path: '/mx', category: 'network', keywords: ['mail servers'] },
  { id: 'rdns', label: 'Reverse DNS', description: 'PTR lookup for IP addresses', path: '/rdns', category: 'network', keywords: ['ptr', 'reverse'] },
  { id: 'ports', label: 'Port Scanner', description: 'Scan common mail ports on host', path: '/ports', category: 'network', keywords: ['scan', 'tcp'] },
  { id: 'smtp', label: 'SMTP Test', description: 'Test SMTP server connection & TLS', path: '/smtp', category: 'network', keywords: ['connectivity'] },
  { id: 'propagation', label: 'DNS Propagation', description: 'Check DNS from 8 global resolvers', path: '/propagation', category: 'network', badge: 'new', keywords: ['geo', 'anycast'] },
  { id: 'subdomains', label: 'Subdomain Discovery', description: 'Enumerate subdomains from wordlist', path: '/subdomains', category: 'network', badge: 'new', keywords: ['recon', 'enum'] },
  { id: 'geo', label: 'IP Geolocation', description: 'Country, city, ISP, ASN for any IP', path: '/geo', category: 'network', badge: 'new', keywords: ['location', 'geoip'] },

  // Analysis
  { id: 'headers', label: 'Header Analyzer', description: 'Parse email headers and routing', path: '/headers', category: 'analysis', keywords: ['parse', 'routing'] },
  { id: 'whois', label: 'WHOIS Lookup', description: 'Domain registration information', path: '/whois', category: 'analysis', keywords: ['registrar'] },
  { id: 'email', label: 'Email Validator', description: 'Multi-factor email address validation', path: '/email', category: 'analysis', badge: 'new', keywords: ['verify', 'syntax'] },
  { id: 'tls', label: 'TLS Inspector', description: 'Certificate grade, chain, and HSTS', path: '/tls', category: 'analysis', badge: 'new', keywords: ['ssl', 'cert'] },
  { id: 'http', label: 'HTTP Headers', description: 'Security headers & server fingerprint', path: '/http', category: 'analysis', badge: 'new', keywords: ['csp', 'hsts'] },

  // Utility
  { id: 'sanitize', label: 'Sanitize & Defang', description: 'Make threat data safe to share', path: '/sanitize', category: 'utility', badge: 'new', keywords: ['defang', 'redact'] },
  { id: 'tld', label: 'TLD Parser', description: 'Break domain into TLD/SLD/subdomain', path: '/tld', category: 'utility', badge: 'new', keywords: ['parse', 'suffix'] },
  { id: 'batch', label: 'Batch Scanner', description: 'Run checks against up to 50 targets', path: '/batch', category: 'utility', badge: 'new', keywords: ['bulk', 'many'] },
  { id: 'monitor', label: 'Live Monitor', description: 'Continuous monitoring with WebSocket', path: '/monitor', category: 'monitor', badge: 'new', keywords: ['watch', 'realtime'] },
  { id: 'docs', label: 'API Docs', description: 'OpenAPI / Swagger documentation', path: '/docs', category: 'utility', badge: 'new', keywords: ['reference', 'openapi'] },
  { id: 'settings', label: 'Settings', description: 'Customize the experience', path: '/settings', category: 'utility', keywords: ['preferences'] },
]

export function searchTools(query: string): ToolMeta[] {
  if (!query) return []
  const q = query.toLowerCase()
  return TOOL_CATALOG.filter(t =>
    t.label.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.id.toLowerCase().includes(q) ||
    t.keywords.some(k => k.toLowerCase().includes(q))
  )
}

// ── Debounce ─────────────────────────────────────
export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return ((...args: any[]) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), ms)
  }) as T
}

// ── Local storage with expiry ────────────────────
export function storageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function storageSet(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

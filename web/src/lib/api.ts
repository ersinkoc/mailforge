const BASE = '/api'

// API response wrapper — backend returns { data: T }
interface ApiResponse<T> {
  data: T
  success?: boolean
  error?: string
}

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  let json: ApiResponse<T>
  try {
    json = await res.json()
  } catch {
    throw new Error(`Invalid JSON response from ${path} (HTTP ${res.status})`)
  }
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `HTTP ${res.status}`)
  }
  return json
}

// Define response types for better type safety
interface HealthResponse { status: string }
interface MetricsResponse { [key: string]: number }
interface DNSResponse { a?: Array<{ip: string}>; mx?: Array<{priority: number, host: string}>; txt?: string[] }
interface MXRecord { priority: number; host: string; valid?: boolean; ips?: string[] }
interface MXResponse { mx: MXRecord[] }
interface BlacklistResponse { listed_count: number; clean_count: number; total_count: number }
interface SPFResponse { valid: boolean; dns_lookups?: number; max_lookups?: number }
interface DKIMResponse { valid: boolean; key_type?: string; key_size?: string }
interface DMARCResponse { valid: boolean; policy?: string; warnings?: string[] }
interface SMTPResponse { connected: boolean; starttls?: boolean; tls_version?: string; error?: string; ip?: string; host?: string; banner?: string }
interface PortScanResponse { ports: Array<{port: number; state: string}> }
interface RDNSResponse { hostname?: string; hosts?: string[] }
interface HeaderResponse { analyzed: boolean }
interface WhoisResponse { domain: string; registrar?: string; created?: string; expires?: string }
interface WhoisStatsResponse { count: number }
interface SuperResponse { result: string; success: boolean }
interface EmailResponse { valid: boolean; deliverability?: string }
interface GeoResponse { country?: string; city?: string; ip?: string }
interface TLSResponse { version?: string; cipher?: string }
interface HTTPResponse { status: number; headers: Record<string, string> }
interface MTASTSResponse { policy?: string }
interface TLSRPTResponse { policy?: string }
interface BIMIResponse { logo?: string }
interface DNSSECResponse { secure: boolean }
interface DeliverabilityResponse { grade: string; score: number }
interface RelayResponse { relay: boolean }
interface CatchallResponse { catchall: boolean }
interface SubdomainsResponse { subdomains: string[] }
interface PropagationResponse { propagation: Record<string, boolean> }
interface TLDResponse { tld: string }
interface SanitizeResponse { sanitized: string }
interface BatchResponse { data: unknown[]; count: number }
interface MonitorEntry { id?: string; name: string; type: string; tool: string; value: string; interval: number }
interface MonitorsResponse { monitors: MonitorEntry[] }

export const api = {
  // ── Health & meta ─────────────────────────────
  health: () => request<HealthResponse>('/health'),
  metrics: () => request<MetricsResponse>('/metrics'),
  openapi: () => request<{ endpoints: string[] }>('/openapi'),

  // ── Core diagnostics ──────────────────────────
  dns: (domain: string) => request<DNSResponse>(`/dns/${domain}`),
  mx: (domain: string) => request<MXResponse>(`/mx/${domain}`),
  blacklist: (ip: string) => request<BlacklistResponse>(`/blacklist/${ip}`),
  spf: (domain: string) => request<SPFResponse>(`/spf/${domain}`),
  dkim: (domain: string, selector = 'default') =>
    request<DKIMResponse>(`/dkim/${domain}/${selector}`),
  dkimDiscover: (domain: string) => request<DKIMResponse>(`/dkim-discover/${domain}`),
  dmarc: (domain: string) => request<DMARCResponse>(`/dmarc/${domain}`),
  smtp: (host: string, port = 25) => request<SMTPResponse>(`/smtp/${host}/${port}`),
  scan: (host: string, ports?: number[]) =>
    request<PortScanResponse>(`/scan/${host}${ports ? '/' + ports.join(',') : ''}`),
  rdns: (ip: string) => request<RDNSResponse>(`/rdns/${ip}`),
  header: (header: string) =>
    request<HeaderResponse>('/header', {
      method: 'POST',
      body: JSON.stringify({ header }),
    }),
  whois: (domain: string, refresh = false) =>
    request<WhoisResponse>(`/whois/${domain}${refresh ? '?refresh=true' : ''}`),
  whoisStats: () => request<WhoisStatsResponse>('/whois'),
  super: (input: string) => request<SuperResponse>(`/super/${input}`),

  // ── New v2 tools ──────────────────────────────
  email: (addr: string) => request<EmailResponse>(`/email/${addr}`),
  geo: (ip: string) => request<GeoResponse>(`/geo/${ip}`),
  tls: (host: string, port = 443) => request<TLSResponse>(`/tls/${host}/${port}`),
  http: (url: string) => request<HTTPResponse>(`/http/${url}`),
  mtasts: (domain: string) => request<MTASTSResponse>(`/mtasts/${domain}`),
  tlsrpt: (domain: string) => request<TLSRPTResponse>(`/tlsrpt/${domain}`),
  bimi: (domain: string) => request<BIMIResponse>(`/bimi/${domain}`),
  dnssec: (domain: string) => request<DNSSECResponse>(`/dnssec/${domain}`),
  deliverability: (domain: string) => request<DeliverabilityResponse>(`/deliverability/${domain}`),
  relay: (host: string, port = 25) => request<RelayResponse>(`/relay/${host}/${port}`),
  catchall: (domain: string) => request<CatchallResponse>(`/catchall/${domain}`),
  subdomains: (domain: string) => request<SubdomainsResponse>(`/subdomains/${domain}`),
  propagation: (domain: string) => request<PropagationResponse>(`/propagation/${domain}`),
  tld: (domain: string) => request<TLDResponse>(`/tld/${domain}`),

  sanitize: (text: string) =>
    request<SanitizeResponse>('/sanitize', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  // ── Batch & monitors ───────────────────────────
  batch: (tool: string, targets: string[]) =>
    request<BatchResponse>('/batch', {
      method: 'POST',
      body: JSON.stringify({ tool, targets }),
    }),
  monitorsList: () => request<MonitorsResponse>('/monitors'),
  monitorAdd: (entry: MonitorEntry) =>
    request<MonitorEntry>('/monitors', {
      method: 'POST',
      body: JSON.stringify(entry),
    }),
  monitorRemove: (id: string) =>
    request<{ success: boolean }>(`/monitors/${id}`, { method: 'DELETE' }),
}

export function monitorWebSocket(): WebSocket {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return new WebSocket(`${proto}://${window.location.host}/ws/monitor`)
}

const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json()
  if (!res.ok || (data && data.success === false)) {
    throw new Error(data?.error || `HTTP ${res.status}`)
  }
  return data
}

export const api = {
  // ── Health & meta ─────────────────────────────
  health: () => request<any>('/health'),
  metrics: () => request<any>('/metrics'),
  openapi: () => request<any>('/openapi'),

  // ── Core diagnostics ──────────────────────────
  dns: (domain: string) => request<any>(`/dns/${domain}`),
  mx: (domain: string) => request<any>(`/mx/${domain}`),
  blacklist: (ip: string) => request<any>(`/blacklist/${ip}`),
  spf: (domain: string) => request<any>(`/spf/${domain}`),
  dkim: (domain: string, selector = 'default') =>
    request<any>(`/dkim/${domain}/${selector}`),
  dkimDiscover: (domain: string) => request<any>(`/dkim-discover/${domain}`),
  dmarc: (domain: string) => request<any>(`/dmarc/${domain}`),
  smtp: (host: string, port = 25) => request<any>(`/smtp/${host}/${port}`),
  scan: (host: string, ports?: number[]) =>
    request<any>(`/scan/${host}${ports ? '/' + ports.join(',') : ''}`),
  rdns: (ip: string) => request<any>(`/rdns/${ip}`),
  header: (header: string) =>
    request<any>('/header', {
      method: 'POST',
      body: JSON.stringify({ header }),
    }),
  whois: (domain: string, refresh = false) =>
    request<any>(`/whois/${domain}${refresh ? '?refresh=true' : ''}`),
  whoisStats: () => request<any>('/whois'),
  super: (input: string) => request<any>(`/super/${input}`),

  // ── New v2 tools ──────────────────────────────
  email: (addr: string) => request<any>(`/email/${addr}`),
  geo: (ip: string) => request<any>(`/geo/${ip}`),
  tls: (host: string, port = 443) => request<any>(`/tls/${host}/${port}`),
  http: (url: string) => request<any>(`/http/${url}`),
  mtasts: (domain: string) => request<any>(`/mtasts/${domain}`),
  tlsrpt: (domain: string) => request<any>(`/tlsrpt/${domain}`),
  bimi: (domain: string) => request<any>(`/bimi/${domain}`),
  dnssec: (domain: string) => request<any>(`/dnssec/${domain}`),
  deliverability: (domain: string) => request<any>(`/deliverability/${domain}`),
  relay: (host: string, port = 25) => request<any>(`/relay/${host}/${port}`),
  catchall: (domain: string) => request<any>(`/catchall/${domain}`),
  subdomains: (domain: string) => request<any>(`/subdomains/${domain}`),
  propagation: (domain: string) => request<any>(`/propagation/${domain}`),
  tld: (domain: string) => request<any>(`/tld/${domain}`),

  sanitize: (text: string) =>
    request<any>('/sanitize', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  // ── Batch & monitors ───────────────────────────
  batch: (tool: string, targets: string[]) =>
    request<any>('/batch', {
      method: 'POST',
      body: JSON.stringify({ tool, targets }),
    }),
  monitorsList: () => request<any>('/monitors'),
  monitorAdd: (entry: any) =>
    request<any>('/monitors', {
      method: 'POST',
      body: JSON.stringify(entry),
    }),
  monitorRemove: (id: string) =>
    request<any>(`/monitors/${id}`, { method: 'DELETE' }),
}

export function monitorWebSocket(): WebSocket {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return new WebSocket(`${proto}://${window.location.host}/ws/monitor`)
}

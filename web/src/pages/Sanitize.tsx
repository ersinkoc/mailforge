import { useState } from 'react'
import { ShieldAlert, Copy, Check, Mail, Globe, Network, Loader2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import ExportButton from '@/components/ExportButton'
import { api } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { cn, copyToClipboard } from '@/lib/utils'
import { ResultSkeleton } from '@/components/Skeleton'

export default function Sanitize() {
  const { toast } = useToast()
  const [input, setInput] = useState('Suspicious email from attacker@malicious-domain.ru targeting ceo@company.com. See http://phishingsite.tk/login and IP 203.0.113.42')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const run = async () => {
    if (!input.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await api.sanitize(input)
      setData(res.data)
      toast('Sanitization complete', 'success')
    } catch (e: any) { setError(e.message); toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const copyText = async (text: string, key: string) => {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(key)
      toast('Copied to clipboard', 'success')
      setTimeout(() => setCopied(null), 2000)
    }
  }

  return (
    <div>
      <PageHeader icon={ShieldAlert} title="Sanitize & Defang" subtitle="Make threat data safe to share in tickets and reports" gradient="from-red-500/20 to-orange-500/10" badge="new">
        <div className="space-y-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            placeholder="Paste threat data, suspicious email, IOC list, or any text containing emails/URLs/IPs…"
            className="w-full px-4 py-3 rounded-2xl bg-surface border border-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent/50 transition-all resize-y font-mono"
          />
          <button onClick={run} disabled={loading || !input.trim()} className="h-10 px-5 rounded-xl bg-gradient-to-r from-accent to-accent-2 text-white text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-accent/25 disabled:opacity-50">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
            Sanitize
          </button>
        </div>
      </PageHeader>

      {loading && <ResultSkeleton />}
      {error && !loading && <div className="p-4 rounded-2xl bg-danger-muted border border-danger/30 text-sm text-danger">{error}</div>}

      {data && !loading && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox icon={Mail} label="Emails" value={data.emails?.length || 0} color="text-info" />
            <StatBox icon={Globe} label="URLs" value={data.urls?.length || 0} color="text-warning" />
            <StatBox icon={Network} label="IPv4" value={data.ipv4_count} color="text-accent" />
            <StatBox icon={Network} label="IPv6" value={data.ipv6_count} color="text-fuchsia-400" />
          </div>

          <OutputBlock title="Sanitized" subtitle="Email/URLs redacted, IPs obfuscated" body={data.sanitized} onCopy={() => copyText(data.sanitized, 'san')} copied={copied === 'san'} />
          <OutputBlock title="Defanged" subtitle="Visible but un-clickable (safe to share)" body={data.defanged} onCopy={() => copyText(data.defanged, 'def')} copied={copied === 'def'} />
          <OutputBlock title="Original" subtitle="As-typed" body={data.input} onCopy={() => copyText(data.input, 'in')} copied={copied === 'in'} />

          {data.emails && data.emails.length > 0 && (
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <h3 className="text-sm font-semibold mb-2">Extracted Emails</h3>
              <div className="flex flex-wrap gap-1.5">
                {data.emails.map((e: string, i: number) => (
                  <span key={i} className="px-2 py-1 rounded-md bg-info/10 text-info text-[10px] font-mono">{e}</span>
                ))}
              </div>
            </div>
          )}

          {data.urls && data.urls.length > 0 && (
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <h3 className="text-sm font-semibold mb-2">Extracted URLs</h3>
              <div className="space-y-1">
                {data.urls.map((u: string, i: number) => (
                  <div key={i} className="px-3 py-2 rounded-lg bg-surface-2 font-mono text-[11px] break-all">{u}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatBox({ icon: Icon, label, value, color }: any) {
  return (
    <div className="p-3 rounded-2xl bg-surface border border-border">
      <Icon className={cn('w-4 h-4', color)} />
      <div className="text-2xl font-bold tabular-nums mt-1">{value}</div>
      <div className="text-[10px] text-text-muted uppercase tracking-wider">{label}</div>
    </div>
  )
}

function OutputBlock({ title, subtitle, body, onCopy, copied }: any) {
  return (
    <div className="p-4 rounded-2xl bg-surface border border-border">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-[10px] text-text-muted">{subtitle}</p>
        </div>
        <button onClick={onCopy} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-surface-2 hover:bg-surface-hover border border-border text-text-secondary">
          {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="px-3 py-2 rounded-lg bg-surface-2 font-mono text-[11px] whitespace-pre-wrap break-all max-h-48 overflow-y-auto">{body}</pre>
    </div>
  )
}

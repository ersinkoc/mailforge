import { useState } from 'react'
import { Mail, Loader2, Search, AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '@/lib/api'
import { useDomain, useHistory, useScanResults } from '@/lib/store'
import { HeaderSkeleton } from '@/components/Skeleton'
import ExportButton from '@/components/ExportButton'

export default function HeaderAnalyzer() {
  const { setDomain } = useDomain()
  const { addHistory } = useHistory()
  const { setLastResult } = useScanResults()
  const [header, setHeader] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showRaw, setShowRaw] = useState(false)

  const runAnalyze = async () => {
    if (!header.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await api.header(header.trim())
      setResult(res.data)
      const fromMatch = header.match(/From:\s*(.+)/i)
      setLastResult('headers', fromMatch?.[1]?.split('@')[1]?.trim() || 'header', res.data)
      if (fromMatch) {
        const domain = fromMatch[1].split('@')[1]?.trim()
        if (domain) { setDomain(domain); addHistory(domain, 'Header Analyzer') }
      }
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  const parseExample = () => {
    setHeader(`From: sender@example.com
To: recipient@example.com
Subject: Test Email
Date: Mon, 10 Jun 2026 10:00:00 +0000
Message-ID: <abc123@example.com>
Received: from mail.example.com (mail.example.com [1.2.3.4])
    by mx.receiver.com (8.14.4/8.14.4) with ESMTP id ABC123
    for <recipient@example.com>; Mon, 10 Jun 2026 10:00:01 +0000
Received: from sender-pc (unknown [5.6.7.8])
    by mail.example.com with ESMTP id DEF456
    for <recipient@example.com>; Mon, 10 Jun 2026 09:59:58 +0000
Authentication-Results: mx.receiver.com;
    spf=pass (domain of sender@example.com designates 1.2.3.4 as permitted sender);
    dkim=pass header.i=@example.com;
    dmarc=pass (p=REJECT) header.from=example.com
DKIM-Signature: v=1; a=rsa-sha256; d=example.com; s=selector;
    h=from:to:subject:date:message-id;
    bh=abc123=;
    b=xyz789=;`)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 flex items-center justify-center">
          <Mail className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Email Header Analyzer</h1>
          <p className="text-sm text-text-secondary">Parse email headers, routing, and authentication results</p>
        </div>
      </div>

      <div className="space-y-3">
        <textarea value={header} onChange={(e) => setHeader(e.target.value)}
          placeholder="Paste your email headers here..."
          rows={8}
          className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-muted text-sm font-mono focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 resize-y transition-all" />
        <div className="flex gap-3">
          <button onClick={runAnalyze} disabled={loading || !header.trim()}
            className="h-10 px-5 rounded-xl bg-gradient-to-r from-accent to-purple-500 hover:from-accent-hover hover:to-purple-400 disabled:opacity-50 text-white text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-accent/25">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Analyze
          </button>
          <button onClick={parseExample}
            className="h-10 px-4 rounded-xl bg-surface border border-border text-text-secondary hover:text-text-primary text-sm transition-colors">
            Load Example
          </button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 p-4 rounded-xl bg-danger-muted border border-danger/20 text-danger text-sm"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}</div>}

      {loading && <HeaderSkeleton />}

      {!loading && result && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Header analysis complete
            </div>
            <ExportButton data={result} filename={`header-${result.from || 'analysis'}`} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: 'From', value: result.from },
              { label: 'To', value: result.to },
              { label: 'Subject', value: result.subject },
              { label: 'Date', value: result.date },
              { label: 'Message ID', value: result.message_id },
            ].filter(i => i.value).map(item => (
              <div key={item.label} className="p-3 rounded-xl bg-surface border border-border">
                <div className="text-xs text-text-muted">{item.label}</div>
                <div className="text-sm text-text-primary font-mono mt-1 break-all">{item.value}</div>
              </div>
            ))}
          </div>

          {result.auth_results && Object.keys(result.auth_results).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Authentication Results</h3>
              {Object.entries(result.auth_results).map(([key, value]) => {
                const v = String(value).toLowerCase()
                const isPass = v.includes('pass')
                const isFail = v.includes('fail')
                return (
                  <div key={key} className="p-3 rounded-xl bg-surface border border-border">
                    <div className="text-xs font-semibold text-text-secondary mb-1">{key}</div>
                    <div className={`text-sm font-mono ${isPass ? 'text-success' : isFail ? 'text-danger' : 'text-text-primary'} break-all`}>
                      {String(value)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {result.routing?.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Message Routing ({result.routing.length} hops)</h3>
              <div className="relative pl-6 space-y-3">
                <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                {result.routing.map((hop: any) => (
                  <div key={hop.hop} className="relative py-3 px-4 rounded-xl bg-surface border border-border hover:border-border-hover transition-colors">
                    <div className="absolute -left-4 top-4 w-3 h-3 rounded-full bg-accent border-2 border-surface" />
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-accent">Hop {hop.hop}</span>
                      {hop.delay && <span className="text-xs text-text-muted">{hop.delay}</span>}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {hop.from && <span>from <span className="font-mono text-text-primary">{hop.from}</span></span>}
                      {hop.to && <span> → <span className="font-mono text-text-primary">{hop.to}</span></span>}
                    </div>
                    {hop.date && <div className="text-xs text-text-muted mt-1 font-mono">{hop.date}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.warnings?.length > 0 && (
            <div className="space-y-1.5">
              {result.warnings.map((w: string, i: number) => (
                <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-warning-muted border border-warning/20 text-warning text-sm">
                  <Info className="w-4 h-4 flex-shrink-0" />{w}
                </div>
              ))}
            </div>
          )}

          <div>
            <button onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-2 text-xs text-text-muted hover:text-text-secondary transition-colors">
              {showRaw ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showRaw ? 'Hide' : 'Show'} Raw Headers
            </button>
            {showRaw && result.headers && (
              <div className="mt-2 p-4 rounded-xl bg-surface border border-border max-h-64 overflow-y-auto">
                {Object.entries(result.headers).map(([key, value]) => (
                  <div key={key} className="text-xs font-mono">
                    <span className="text-accent">{key}:</span> <span className="text-text-secondary break-all">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

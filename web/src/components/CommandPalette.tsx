import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Sparkles, Zap, Globe, ShieldAlert, FileText, KeyRound, ShieldCheck, Server, Scan, ArrowLeftRight, Mail, X, Clock, History, ArrowRight, Settings, BookOpen, Activity, ChevronRight, Hash, Command } from 'lucide-react'
import { cn, searchTools, type ToolMeta, copyToClipboard } from '@/lib/utils'
import { api } from '@/lib/api'
import { useToast } from './Toast'
import { useHistory } from '@/lib/store'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

const iconMap: Record<string, any> = {
  dashboard: Sparkles, 'quick-scan': Zap, dns: Globe, mx: Mail,
  blacklist: ShieldAlert, spf: FileText, dkim: KeyRound, dmarc: ShieldCheck,
  smtp: Server, ports: Scan, rdns: ArrowLeftRight, headers: Mail, whois: Search,
}

const categoryColors: Record<string, string> = {
  core: 'text-amber-400',
  security: 'text-rose-400',
  network: 'text-sky-400',
  analysis: 'text-violet-400',
  utility: 'text-emerald-400',
  monitor: 'text-fuchsia-400',
}

type Command = {
  id: string
  type: 'tool' | 'action' | 'history'
  title: string
  subtitle?: string
  icon?: any
  path?: string
  category?: string
  action?: () => void
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [actionMode, setActionMode] = useState<'navigate' | 'analyze'>('navigate')
  const [analyzing, setAnalyzing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { domainHistory, ipHistory } = useHistory()

  // Build commands list
  const allCommands: Command[] = useMemo(() => {
    const cmds: Command[] = []

    // Tool navigation
    searchTools('').forEach(t => {
      cmds.push({
        id: `tool-${t.id}`,
        type: 'tool',
        title: t.label,
        subtitle: t.description,
        icon: iconMap[t.id] || Hash,
        path: t.path,
        category: t.category,
      })
    })

    // Quick actions
    cmds.push(
      { id: 'action-api-docs', type: 'action', title: 'API Documentation', subtitle: 'View OpenAPI spec', icon: BookOpen, path: '/docs', category: 'utility' },
      { id: 'action-settings', type: 'action', title: 'Settings', subtitle: 'Customize the experience', icon: Settings, path: '/settings', category: 'utility' },
      { id: 'action-clear-history', type: 'action', title: 'Clear All History', subtitle: 'Remove all scan history', icon: X, action: () => { localStorage.removeItem('mailtools_history'); toast('History cleared', 'success'); onClose() }, category: 'utility' },
    )

    // Recent history (top 5)
    const allHist = [...domainHistory, ...ipHistory].slice(0, 5)
    allHist.forEach(h => {
      cmds.push({
        id: `hist-${h.id}`,
        type: 'history',
        title: h.value,
        subtitle: `${h.tool} · ${new Date(h.timestamp).toLocaleDateString()}`,
        icon: History,
        category: h.type === 'ip' ? 'network' : 'security',
        action: () => { navigate(`/${h.tool.toLowerCase().replace(/\s+/g, '-')}?q=${encodeURIComponent(h.value)}`); onClose() },
      })
    })

    return cmds
  }, [domainHistory, ipHistory, navigate, onClose, toast])

  // Filter based on query
  const filtered = useMemo(() => {
    if (!query) return allCommands
    const q = query.toLowerCase()
    return allCommands.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.subtitle?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q)
    )
  }, [allCommands, query])

  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIdx(0)
  }, [query])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx(prev => (prev + 1) % Math.max(1, filtered.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx(prev => (prev - 1 + filtered.length) % Math.max(1, filtered.length))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleSelect(filtered[selectedIdx])
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, filtered, selectedIdx, onClose])

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`)
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedIdx])

  const handleSelect = useCallback(async (cmd?: Command) => {
    if (!cmd) return
    if (cmd.action) {
      cmd.action()
      return
    }
    if (cmd.path) {
      navigate(cmd.path)
      onClose()
    }
  }, [navigate, onClose])

  // Smart analyze: detect domain/IP/email and offer to run super scan
  const superScan = useCallback(async (input: string) => {
    if (!input.trim()) return
    setAnalyzing(true)
    try {
      const res = await api.super(input.trim())
      if (res.success) {
        toast(`Analyzed ${input.trim()} — see Dashboard`, 'success')
        navigate('/')
        onClose()
      }
    } catch (e: any) {
      toast(e.message || 'Analysis failed', 'error')
    } finally {
      setAnalyzing(false)
    }
  }, [navigate, onClose, toast])

  if (!open) return null

  // Group filtered results
  const grouped = useMemo(() => {
    const groups: Record<string, Command[]> = {}
    for (const cmd of filtered) {
      const key = cmd.type
      if (!groups[key]) groups[key] = []
      groups[key].push(cmd)
    }
    return groups
  }, [filtered])

  let runningIdx = 0

  return (
    <>
      <div
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-[18vh] -translate-x-1/2 w-full max-w-2xl z-[201] animate-fade-in-scale">
        <div className="glass-strong rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <Search className="w-5 h-5 text-text-muted flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools, actions, or paste a domain/IP to analyze…"
              className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted text-sm focus:outline-none"
            />
            <kbd className="kbd">ESC</kbd>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-surface-2">
            <button
              onClick={() => setActionMode('navigate')}
              className={cn(
                'flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                actionMode === 'navigate' ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Zap className="w-3 h-3 inline-block mr-1.5" />
              Navigate
            </button>
            <button
              onClick={() => setActionMode('analyze')}
              className={cn(
                'flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                actionMode === 'analyze' ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Activity className="w-3 h-3 inline-block mr-1.5" />
              Analyze
            </button>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
            {filtered.length === 0 && query && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-text-secondary">No matches found.</p>
                {actionMode === 'analyze' && (
                  <button
                    onClick={() => superScan(query)}
                    disabled={analyzing}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-accent to-accent-2 text-white text-sm font-medium"
                  >
                    <Zap className="w-4 h-4" />
                    {analyzing ? 'Analyzing…' : `Analyze "${query}"`}
                  </button>
                )}
              </div>
            )}
            {Object.entries(grouped).map(([type, cmds]) => (
              <div key={type} className="mb-1">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  {type === 'tool' ? 'Tools' : type === 'action' ? 'Actions' : 'Recent'}
                </div>
                {cmds.map(cmd => {
                  const idx = runningIdx++
                  const Icon = cmd.icon
                  const isSelected = idx === selectedIdx
                  return (
                    <button
                      key={cmd.id}
                      data-idx={idx}
                      onClick={() => handleSelect(cmd)}
                      onMouseEnter={() => setSelectedIdx(idx)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left smooth-all',
                        isSelected ? 'bg-accent/10' : 'hover:bg-surface-hover'
                      )}
                    >
                      <div className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                        isSelected ? 'bg-accent/20' : 'bg-surface-2'
                      )}>
                        {Icon && <Icon className={cn('w-4 h-4', isSelected ? 'text-accent' : categoryColors[cmd.category || 'utility'])} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text-primary truncate">{cmd.title}</div>
                        {cmd.subtitle && <div className="text-xs text-text-muted truncate">{cmd.subtitle}</div>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {cmd.category && (
                          <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{cmd.category}</span>
                        )}
                        {isSelected && <ArrowRight className="w-3.5 h-3.5 text-accent" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-surface-2">
            <div className="flex items-center gap-3 text-[10px] text-text-muted">
              <span className="flex items-center gap-1"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> Navigate</span>
              <span className="flex items-center gap-1"><kbd className="kbd">↵</kbd> Select</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
              <Command className="w-3 h-3" />
              <span>MailForge</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

import { useMemo } from 'react'
import { ArrowRight, Plus, Minus, RefreshCw, Equal } from 'lucide-react'
import type { ScanResultCache } from '@/lib/store'

interface DiffEntry {
  key: string
  type: 'added' | 'removed' | 'changed' | 'unchanged'
  oldValue?: any
  newValue?: any
}

function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {}
  if (!obj || typeof obj !== 'object') return result
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(result, flattenObject(val, fullKey))
    } else if (Array.isArray(val)) {
      result[fullKey] = val
    } else {
      result[fullKey] = val
    }
  }
  return result
}

function computeDiff(oldResult: any, newResult: any): DiffEntry[] {
  const oldFlat = flattenObject(oldResult)
  const newFlat = flattenObject(newResult)
  const allKeys = new Set([...Object.keys(oldFlat), ...Object.keys(newFlat)])
  const entries: DiffEntry[] = []

  for (const key of [...allKeys].sort()) {
    const oldVal = oldFlat[key]
    const newVal = newFlat[key]
    const oldStr = JSON.stringify(oldVal)
    const newStr = JSON.stringify(newVal)

    if (oldVal === undefined) {
      entries.push({ key, type: 'added', newValue: newVal })
    } else if (newVal === undefined) {
      entries.push({ key, type: 'removed', oldValue: oldVal })
    } else if (oldStr !== newStr) {
      entries.push({ key, type: 'changed', oldValue: oldVal, newValue: newVal })
    } else {
      entries.push({ key, type: 'unchanged', oldValue: oldVal, newValue: newVal })
    }
  }
  return entries
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'boolean') return val ? 'true' : 'false'
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]'
    const items = val.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v))
    return `[${items.join(', ')}]`
  }
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

interface ScanDiffViewProps {
  oldEntry: ScanResultCache
  newEntry: ScanResultCache
  showUnchanged?: boolean
}

export default function ScanDiffView({ oldEntry, newEntry, showUnchanged = false }: ScanDiffViewProps) {
  const diff = useMemo(() => computeDiff(oldEntry.result, newEntry.result), [oldEntry.result, newEntry.result])

  const stats = useMemo(() => ({
    added: diff.filter(e => e.type === 'added').length,
    removed: diff.filter(e => e.type === 'removed').length,
    changed: diff.filter(e => e.type === 'changed').length,
    unchanged: diff.filter(e => e.type === 'unchanged').length,
  }), [diff])

  const visibleEntries = showUnchanged ? diff : diff.filter(e => e.type !== 'unchanged')
  const hasChanges = stats.added + stats.removed + stats.changed > 0

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header with timestamps */}
      <div className="flex items-center gap-3 text-[11px]">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-hover border border-border">
          <span className="text-text-muted">Before:</span>
          <span className="font-mono text-text-secondary">
            {new Date(oldEntry.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-hover border border-border">
          <span className="text-text-muted">After:</span>
          <span className="font-mono text-text-secondary">
            {new Date(newEntry.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Stats badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {stats.added > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-semibold">
            <Plus className="w-3 h-3" /> {stats.added} added
          </span>
        )}
        {stats.removed > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger/10 text-danger text-[10px] font-semibold">
            <Minus className="w-3 h-3" /> {stats.removed} removed
          </span>
        )}
        {stats.changed > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/10 text-warning text-[10px] font-semibold">
            <RefreshCw className="w-3 h-3" /> {stats.changed} changed
          </span>
        )}
        {!hasChanges && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold">
            <Equal className="w-3 h-3" /> No changes
          </span>
        )}
      </div>

      {/* Diff entries */}
      {visibleEntries.length > 0 ? (
        <div className="space-y-0.5 max-h-64 overflow-y-auto rounded-xl border border-border">
          {visibleEntries.map(entry => {
            const styles = {
              added: 'bg-success/5 border-l-2 border-success',
              removed: 'bg-danger/5 border-l-2 border-danger',
              changed: 'bg-warning/5 border-l-2 border-warning',
              unchanged: 'border-l-2 border-transparent',
            }
            const icons = {
              added: <Plus className="w-3 h-3 text-success flex-shrink-0" />,
              removed: <Minus className="w-3 h-3 text-danger flex-shrink-0" />,
              changed: <RefreshCw className="w-3 h-3 text-warning flex-shrink-0" />,
              unchanged: <Equal className="w-3 h-3 text-text-muted flex-shrink-0" />,
            }

            return (
              <div key={entry.key} className={`px-3 py-2 ${styles[entry.type]}`}>
                <div className="flex items-start gap-2">
                  {icons[entry.type]}
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-mono text-text-muted">{entry.key}</span>
                    {entry.type === 'changed' && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-danger line-through truncate max-w-[200px]">{formatValue(entry.oldValue)}</span>
                        <ArrowRight className="w-3 h-3 text-text-muted flex-shrink-0" />
                        <span className="text-[10px] font-mono text-success truncate max-w-[200px]">{formatValue(entry.newValue)}</span>
                      </div>
                    )}
                    {entry.type === 'added' && (
                      <div className="text-[10px] font-mono text-success mt-0.5 truncate">{formatValue(entry.newValue)}</div>
                    )}
                    {entry.type === 'removed' && (
                      <div className="text-[10px] font-mono text-danger line-through mt-0.5 truncate">{formatValue(entry.oldValue)}</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-xs text-text-muted">
          {hasChanges ? 'All changes are hidden. Toggle "Show unchanged" to see all fields.' : 'Both results are identical.'}
        </div>
      )}
    </div>
  )
}

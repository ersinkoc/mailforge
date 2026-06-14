import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  lines?: number
  variant?: 'text' | 'rect' | 'circle'
}

// Deterministic pseudo-random based on index — avoids Math.random() flicker on re-render
function seededWidth(index: number): number {
  // Simple hash: (index * 7919 + 104729) mod 1000 / 10 → 0–99.9
  return ((index * 7919 + 104729) % 1000) / 10
}

export default function Skeleton({ className, lines = 1, variant = 'text' }: SkeletonProps) {
  if (variant === 'circle') {
    return <div className={cn('rounded-full bg-surface-hover animate-shimmer', className)} />
  }

  if (variant === 'rect') {
    return <div className={cn('rounded-xl bg-surface-hover animate-shimmer', className)} />
  }

  const widths = useMemo(() => Array.from({ length: lines }, (_, i) => 70 + seededWidth(i) * 0.3), [lines])

  return (
    <div className={cn('space-y-2', className)}>
      {widths.map((w, i) => (
        <div
          key={i}
          className="h-4 rounded-lg bg-surface-hover animate-shimmer"
          style={{ width: `${w}%`, animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  )
}

export function ResultSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <Skeleton variant="rect" className="h-14" />
      <Skeleton variant="rect" className="h-20" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton variant="rect" className="h-24" />
        <Skeleton variant="rect" className="h-24" />
        <Skeleton variant="rect" className="h-24" />
      </div>
      <Skeleton lines={5} />
    </div>
  )
}

export function DNSSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <Skeleton variant="rect" className="h-10" />
      <div className="space-y-3">
        {['MX Records', 'A Records', 'TXT Records'].map((label) => (
          <div key={label} className="space-y-2">
            <div className="h-3 w-24 rounded bg-surface-hover animate-shimmer" />
            <Skeleton variant="rect" className="h-12" />
            <Skeleton variant="rect" className="h-12" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function BlacklistSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-3 gap-4">
        <Skeleton variant="rect" className="h-24" />
        <Skeleton variant="rect" className="h-24" />
        <Skeleton variant="rect" className="h-24" />
      </div>
      <div className="space-y-1.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} variant="rect" className="h-10" />
        ))}
      </div>
    </div>
  )
}

export function SPFSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <Skeleton variant="rect" className="h-16" />
      <Skeleton variant="rect" className="h-16" />
      <div className="space-y-2">
        <div className="h-3 w-32 rounded bg-surface-hover animate-shimmer" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rect" className="h-14" />
        ))}
      </div>
    </div>
  )
}

export function DKIMSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <Skeleton variant="rect" className="h-16" />
      <Skeleton variant="rect" className="h-16" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Skeleton variant="rect" className="h-20" />
        <Skeleton variant="rect" className="h-20" />
        <Skeleton variant="rect" className="h-20" />
        <Skeleton variant="rect" className="h-20" />
      </div>
    </div>
  )
}

export function DMARCSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <Skeleton variant="rect" className="h-16" />
      <Skeleton variant="rect" className="h-16" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} variant="rect" className="h-20" />
        ))}
      </div>
    </div>
  )
}

export function SMTPSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <Skeleton variant="rect" className="h-16" />
      <Skeleton variant="rect" className="h-16" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Skeleton variant="rect" className="h-20" />
        <Skeleton variant="rect" className="h-20" />
        <Skeleton variant="rect" className="h-20" />
      </div>
    </div>
  )
}

export function PortScanSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <Skeleton variant="rect" className="h-8" />
      <div className="space-y-2">
        <div className="h-3 w-28 rounded bg-surface-hover animate-shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-10" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function RDNSSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <Skeleton variant="rect" className="h-8" />
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-surface-hover animate-shimmer" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rect" className="h-12" />
        ))}
      </div>
    </div>
  )
}

export function HeaderSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Skeleton variant="rect" className="h-16" />
        <Skeleton variant="rect" className="h-16" />
        <Skeleton variant="rect" className="h-16" />
        <Skeleton variant="rect" className="h-16" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-40 rounded bg-surface-hover animate-shimmer" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rect" className="h-16" />
        ))}
      </div>
    </div>
  )
}

export function MXLookupSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-3 gap-3">
        <Skeleton variant="rect" className="h-24" />
        <Skeleton variant="rect" className="h-24" />
        <Skeleton variant="rect" className="h-24" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-40 rounded bg-surface-hover animate-shimmer" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rect" className="h-28" />
        ))}
      </div>
    </div>
  )
}

export function WhoisSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Skeleton variant="rect" className="h-24" />
        <Skeleton variant="rect" className="h-24" />
        <Skeleton variant="rect" className="h-24" />
        <Skeleton variant="rect" className="h-24" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-surface-hover animate-shimmer" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rect" className="h-10" />
        ))}
      </div>
    </div>
  )
}

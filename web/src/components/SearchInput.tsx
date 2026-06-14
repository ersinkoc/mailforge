import { useState, type ReactNode } from 'react'
import { Search, Loader2, Sparkles, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  placeholder?: string
  loading?: boolean
  icon?: any
  buttonLabel?: string
  buttonIcon?: any
  buttonVariant?: 'gradient' | 'subtle' | 'danger'
  size?: 'md' | 'lg'
  autoFocus?: boolean
  rightSlot?: ReactNode
  className?: string
  disableButton?: boolean
}

export default function SearchInput({
  value, onChange, onSubmit, placeholder, loading, icon: Icon = Search,
  buttonLabel = 'Analyze', buttonIcon: BtnIcon = Zap, buttonVariant = 'gradient',
  size = 'lg', autoFocus, rightSlot, className, disableButton,
}: SearchInputProps) {
  const sizeClasses = size === 'lg' ? 'h-14 text-base' : 'h-11 text-sm'
  const buttonClasses = size === 'lg' ? 'h-10 px-5 text-sm' : 'h-8 px-4 text-xs'
  const iconClasses = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'

  const buttonStyles = {
    gradient: 'bg-gradient-to-r from-accent to-accent-2 hover:from-accent-hover hover:to-accent-2 text-white shadow-lg shadow-accent/25',
    subtle: 'bg-surface-2 text-text-primary hover:bg-surface-hover border border-border',
    danger: 'bg-gradient-to-r from-danger to-rose-500 text-white shadow-lg shadow-danger/25',
  }[buttonVariant]

  return (
    <div className={cn('relative group', className)}>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/30 to-accent-2/30 rounded-2xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity blur-md" />
      <div className="relative flex items-center bg-surface border border-border rounded-2xl">
        <div className={cn('pl-4 text-text-muted', size === 'lg' ? 'pl-5' : '')}>
          {loading ? <Loader2 className={cn(iconClasses, 'text-accent animate-spin')} /> : <Icon className={iconClasses} />}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            'flex-1 bg-transparent text-text-primary placeholder:text-text-muted focus:outline-none px-3',
            sizeClasses
          )}
        />
        {rightSlot}
        <button
          onClick={onSubmit}
          disabled={loading || !value.trim() || disableButton}
          className={cn(
            'flex items-center gap-2 rounded-xl font-medium transition-all m-1.5 disabled:opacity-50 disabled:cursor-not-allowed',
            buttonClasses,
            buttonStyles
          )}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BtnIcon className="w-3.5 h-3.5" />}
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}

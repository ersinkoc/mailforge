import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  icon: any
  title: string
  subtitle?: string
  gradient?: string
  actions?: ReactNode
  badge?: string
  children?: ReactNode
}

export default function PageHeader({ icon: Icon, title, subtitle, gradient = 'from-violet-500/20 to-fuchsia-500/10', actions, badge, children }: PageHeaderProps) {
  return (
    <div className="mb-8 animate-fade-in-up">
      <div className="flex items-start gap-4">
        <div className={cn('w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg', gradient)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
            {badge && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
      {children && <div className="mt-6">{children}</div>}
    </div>
  )
}

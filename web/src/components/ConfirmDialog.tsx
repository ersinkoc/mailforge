import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  variant?: 'danger' | 'warning' | 'info'
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'danger',
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  const variantStyles = {
    danger: {
      icon: AlertTriangle,
      iconClass: 'text-danger',
      buttonClass: 'bg-danger hover:bg-danger/90 text-white',
    },
    warning: {
      icon: AlertTriangle,
      iconClass: 'text-warning',
      buttonClass: 'bg-warning hover:bg-warning/90 text-white',
    },
    info: {
      icon: AlertTriangle,
      iconClass: 'text-accent',
      buttonClass: 'bg-accent hover:bg-accent/90 text-white',
    },
  }

  const style = variantStyles[variant]
  const Icon = style.icon

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-surface border border-border rounded-2xl shadow-2xl p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-start gap-4">
            <div className={cn('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-surface-2', style.iconClass)}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-base font-semibold text-text-primary">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1.5 text-sm text-text-secondary leading-relaxed">
                {description}
              </Dialog.Description>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <Dialog.Close asChild>
              <button className="px-4 py-2 rounded-lg text-sm font-medium bg-surface-2 border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors">
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              onClick={handleConfirm}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors', style.buttonClass)}
            >
              {confirmLabel}
            </button>
          </div>

          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 w-6 h-6 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

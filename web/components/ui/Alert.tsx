import { cn } from '@/lib/utils'

interface AlertProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error'
  className?: string
}

export function Alert({ children, variant = 'default', className }: AlertProps) {
  const variants = {
    default: 'bg-slate-50 border-slate-200 text-slate-800 dark:text-slate-400',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800'
  }

  return (
    <div className={cn(
      'rounded-lg border p-4 text-sm',
      variants[variant],
      className
    )}>
      {children}
    </div>
  )
}

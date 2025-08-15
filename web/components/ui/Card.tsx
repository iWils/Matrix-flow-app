import { cn } from '@/lib/utils'
import { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div className={cn('rounded-xl bg-white dark:bg-slate-800 p-6 shadow border border-slate-200 dark:border-slate-700', className)} {...props}>
      {children}
    </div>
  )
}

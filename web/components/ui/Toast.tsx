'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  title: string
  message?: string
  variant: ToastVariant
  duration?: number
  actions?: Array<{
    label: string
    onClick: () => void
  }>
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  success: (title: string, message?: string, duration?: number) => string
  error: (title: string, message?: string, duration?: number) => string
  warning: (title: string, message?: string, duration?: number) => string
  info: (title: string, message?: string, duration?: number) => string
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
  maxToasts?: number
}

export function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const addToast = useCallback((toastData: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const toast: Toast = {
      ...toastData,
      id,
      duration: toastData.duration ?? 5000
    }

    setToasts(prev => {
      const updated = [toast, ...prev]
      return updated.slice(0, maxToasts)
    })

    // Auto-remove toast after duration
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration)
    }

    return id
  }, [maxToasts, removeToast])

  const success = useCallback((title: string, message?: string, duration?: number) => {
    return addToast({ title, message, variant: 'success', duration })
  }, [addToast])

  const error = useCallback((title: string, message?: string, duration?: number) => {
    return addToast({ title, message, variant: 'error', duration })
  }, [addToast])

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    return addToast({ title, message, variant: 'warning', duration })
  }, [addToast])

  const info = useCallback((title: string, message?: string, duration?: number) => {
    return addToast({ title, message, variant: 'info', duration })
  }, [addToast])

  return (
    <ToastContext.Provider value={{
      toasts,
      addToast,
      removeToast,
      success,
      error,
      warning,
      info
    }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const { t } = useTranslation(['common'])
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  // Animation d'entrée
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const handleClose = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => onRemove(toast.id), 150)
  }, [toast.id, onRemove])

  const getToastStyles = () => {
    const baseStyles = 'relative max-w-sm w-full overflow-hidden rounded-lg shadow-lg border transition-all duration-200 ease-in-out transform pointer-events-auto'
    const visibilityStyles = isVisible && !isExiting 
      ? 'translate-x-0 opacity-100 scale-100' 
      : 'translate-x-full opacity-0 scale-95'

    const typeStyles = {
      success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    }

    return `${baseStyles} ${visibilityStyles} ${typeStyles[toast.variant]}`
  }

  const getIcon = () => {
    const iconProps = { className: 'w-5 h-5 flex-shrink-0' }
    
    switch (toast.variant) {
      case 'success':
        return <CheckCircle {...iconProps} className="w-5 h-5 flex-shrink-0 text-green-500 dark:text-green-400" />
      case 'error':
        return <AlertCircle {...iconProps} className="w-5 h-5 flex-shrink-0 text-red-500 dark:text-red-400" />
      case 'warning':
        return <AlertTriangle {...iconProps} className="w-5 h-5 flex-shrink-0 text-yellow-500 dark:text-yellow-400" />
      case 'info':
        return <Info {...iconProps} className="w-5 h-5 flex-shrink-0 text-blue-500 dark:text-blue-400" />
      default:
        return null
    }
  }

  const getTextStyles = () => {
    switch (toast.variant) {
      case 'success':
        return 'text-green-800 dark:text-green-200'
      case 'error':
        return 'text-red-800 dark:text-red-200'
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200'
      case 'info':
        return 'text-blue-800 dark:text-blue-200'
      default:
        return 'text-slate-800 dark:text-slate-200'
    }
  }

return (
    <div className={getToastStyles()}>
      <div className="p-4">
        <div className="flex items-start">
          {getIcon()}
          <div className="ml-3 flex-1">
            <div className={`text-sm font-medium ${getTextStyles()}`}>
              {toast.title}
            </div>
            {toast.message && (
              <div className={`mt-1 text-xs ${getTextStyles()} opacity-80`}>
                {toast.message}
              </div>
            )}
            {toast.actions && toast.actions.length > 0 && (
              <div className="mt-2 space-x-2">
                {toast.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={`text-xs font-medium underline hover:no-underline ${getTextStyles()}`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleClose}
            className={`ml-4 flex-shrink-0 rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              toast.variant === 'success' ? 'focus:ring-green-500' :
              toast.variant === 'error' ? 'focus:ring-red-500' :
              toast.variant === 'warning' ? 'focus:ring-yellow-500' :
              'focus:ring-blue-500'
            }`}
            aria-label={t('common:close')}
          >
            <X className={`w-4 h-4 ${getTextStyles()}`} />
          </button>
        </div>
      </div>
    </div>
  )
}
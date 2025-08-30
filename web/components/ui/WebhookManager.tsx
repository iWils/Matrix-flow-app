'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { LoadingSpinner } from './LoadingSpinner'
import { Alert } from './Alert'
import { useToast } from './Toast'

interface WebhookStats {
  totalDeliveries: number
  successRate: number
  averageResponseTime: number
  failedDeliveries: number
  activeCircuitBreakers: number
}

interface WebhookTemplate {
  id: string
  name: string
  description?: string
  events: string[]
  payloadTransform?: string
  customHeaders?: Record<string, string>
  retryPolicy?: any
  enabled: boolean
  createdAt: string
  updatedAt: string
  lastUsed?: string
}

interface WebhookDelivery {
  id: string
  webhookUrl: string
  event: string
  status: 'pending' | 'delivered' | 'failed' | 'circuit_open'
  attempt: number
  statusCode?: number
  responseTime?: number
  errorMessage?: string
  createdAt: string
  deliveredAt?: string
  nextRetryAt?: string
}

interface WebhookManagerProps {
  className?: string
}

export const WebhookManager: React.FC<WebhookManagerProps> = ({ className = '' }) => {
  const { t } = useTranslation('webhooks')
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<'overview' | 'templates' | 'deliveries' | 'testing'>('overview')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<WebhookStats | null>(null)
  const [templates, setTemplates] = useState<WebhookTemplate[]>([])
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week' | 'month'>('day')

  // Modal states
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<WebhookTemplate | null>(null)
  const [showTestModal, setShowTestModal] = useState(false)

  useEffect(() => {
    fetchStats()
    fetchTemplates()
    fetchDeliveries()
  }, [timeRange])

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/webhooks/deliveries?stats=true&timeRange=${timeRange}`)
      const result = await response.json()
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Error fetching webhook stats:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/webhooks/templates')
      const result = await response.json()
      if (result.success) {
        setTemplates(result.data)
      }
    } catch (error) {
      console.error('Error fetching webhook templates:', error)
    }
  }

  const fetchDeliveries = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/webhooks/deliveries?limit=100')
      const result = await response.json()
      if (result.success) {
        setDeliveries(result.data)
      }
    } catch (error) {
      console.error('Error fetching webhook deliveries:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteTemplate = async (templateId: string) => {
    if (!window.confirm(t('templates.delete.confirmation'))) return

    try {
      const response = await fetch(`/api/webhooks/templates/${templateId}`, {
        method: 'DELETE'
      })
      const result = await response.json()
      
      if (result.success) {
        showToast(t('notifications.templateDeleted'), 'success')
        fetchTemplates()
      } else {
        showToast(result.error || t('notifications.errorOccurred'), 'error')
      }
    } catch (error) {
      showToast(t('notifications.errorOccurred'), 'error')
    }
  }

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (ms?: number): string => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'delivered': return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'failed': return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
      case 'circuit_open': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
    }
  }

  // Tab Navigation
  const tabs = [
    { key: 'overview', label: t('sections.overview.title'), icon: '📊' },
    { key: 'templates', label: t('sections.templates.title'), icon: '📝' },
    { key: 'deliveries', label: t('sections.deliveries.title'), icon: '📤' },
    { key: 'testing', label: t('sections.testing.title'), icon: '🧪' }
  ] as const

  if (loading && !stats && !templates.length && !deliveries.length) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-slate-600 dark:text-slate-400">
          Chargement des webhooks...
        </span>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          {t('title')}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {t('description')}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors
              ${activeTab === tab.key
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }
            `}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Time Range Selector */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t('sections.overview.title')}
            </h2>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
            >
              <option value="hour">{t('stats.timeRanges.hour')}</option>
              <option value="day">{t('stats.timeRanges.day')}</option>
              <option value="week">{t('stats.timeRanges.week')}</option>
              <option value="month">{t('stats.timeRanges.month')}</option>
            </select>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.totalDeliveries}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {t('stats.totalDeliveries')}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-green-600">
                  {stats.successRate.toFixed(1)}%
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {t('stats.successRate')}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-blue-600">
                  {formatDuration(stats.averageResponseTime)}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {t('stats.averageResponseTime')}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-red-600">
                  {stats.failedDeliveries}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {t('stats.failedDeliveries')}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.activeCircuitBreakers}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {t('stats.activeCircuitBreakers')}
                </div>
              </div>
            </div>
          )}

          {/* Health Status */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              {t('monitoring.title')}
            </h3>
            
            {stats && (
              <div className="flex items-center mb-4">
                <div className={`
                  inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                  ${stats.successRate > 95 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' :
                    stats.successRate > 80 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'}
                `}>
                  {stats.successRate > 95 ? '✅ ' + t('monitoring.healthy') :
                   stats.successRate > 80 ? '⚠️ ' + t('monitoring.degraded') :
                   '🚨 ' + t('monitoring.unhealthy')}
                </div>
              </div>
            )}

            {stats?.activeCircuitBreakers > 0 && (
              <Alert variant="warning" className="mb-4">
                <div className="flex items-center">
                  <span className="mr-2">⚡</span>
                  {stats.activeCircuitBreakers} circuit breaker(s) ouvert(s)
                </div>
              </Alert>
            )}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t('sections.templates.title')}
            </h2>
            <Button onClick={() => setShowTemplateModal(true)}>
              {t('templates.create.button')}
            </Button>
          </div>

          <div className="grid gap-4">
            {templates.map((template) => (
              <div key={template.id} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-slate-900 dark:text-slate-100">
                        {template.name}
                      </h3>
                      <span className={`
                        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${template.enabled ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}
                      `}>
                        {template.enabled ? t('templates.status.enabled') : t('templates.status.disabled')}
                      </span>
                    </div>
                    
                    {template.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        {template.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-1 mb-2">
                      {template.events.map((event) => (
                        <span key={event} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                          {event}
                        </span>
                      ))}
                    </div>
                    
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t('templates.status.lastUsed')}: {template.lastUsed ? formatDate(template.lastUsed) : t('templates.status.never')}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditingTemplate(template)
                        setShowTemplateModal(true)
                      }}
                    >
                      {t('templates.edit.button')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => deleteTemplate(template.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      {t('templates.delete.button')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deliveries Tab */}
      {activeTab === 'deliveries' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t('sections.deliveries.title')}
            </h2>
            <Button variant="secondary" onClick={fetchDeliveries}>
              Actualiser
            </Button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('deliveries.columns.event')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('deliveries.columns.url')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('deliveries.columns.status')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('deliveries.columns.attempt')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('deliveries.columns.responseTime')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('deliveries.columns.createdAt')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="px-4 py-4 text-sm text-slate-900 dark:text-slate-100">
                        <span className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs">
                          {delivery.event}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {delivery.webhookUrl}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                          {t(`deliveries.status.${delivery.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-900 dark:text-slate-100">
                        {delivery.attempt}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-900 dark:text-slate-100">
                        {formatDuration(delivery.responseTime)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {formatDate(delivery.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Testing Tab */}
      {activeTab === 'testing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t('sections.testing.title')}
            </h2>
            <Button onClick={() => setShowTestModal(true)}>
              {t('testing.actions.send')}
            </Button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {t('testing.description')}
            </p>
            
            <Alert variant="info">
              <div className="flex items-center">
                <span className="mr-2">💡</span>
                Utilisez webhook.site ou requestbin.com pour créer des URLs de test temporaires.
              </div>
            </Alert>
          </div>
        </div>
      )}
    </div>
  )
}
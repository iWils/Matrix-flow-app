'use client'

import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Timeline, ActivityFeed, AuditChart } from './AuditComponents'

interface AuditEntry {
  id: number
  userId: number | null
  matrixId: number | null
  entity: string
  entityId: number
  action: 'create' | 'update' | 'delete'
  changes: Record<string, unknown> | null
  at: Date
  ip: string | null
  userAgent: string | null
  user?: {
    id: number
    username: string
    name: string | null
  }
  matrix?: {
    id: number
    name: string
  }
}

interface AuditVisualizationProps {
  entries: AuditEntry[]
  loading?: boolean
  showFilters?: boolean
  showTimeline?: boolean
  showActivity?: boolean
  showChart?: boolean
  className?: string
}

export function AuditVisualization({
  entries,
  loading = false,
  showFilters = true,
  showTimeline = true,
  showActivity = true,
  showChart = true,
  className = ''
}: AuditVisualizationProps) {
  const { t } = useTranslation()
  const [filters, setFilters] = useState({
    entity: '',
    action: '',
    userId: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  })
  const [viewMode, setViewMode] = useState<'timeline' | 'activity' | 'chart'>('timeline')

  // Filter and process entries
  const filteredEntries = useMemo(() => {
    let filtered = [...entries]

    if (filters.entity) {
      filtered = filtered.filter(entry => entry.entity === filters.entity)
    }

    if (filters.action) {
      filtered = filtered.filter(entry => entry.action === filters.action)
    }

    if (filters.userId) {
      filtered = filtered.filter(entry => entry.userId === parseInt(filters.userId))
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom)
      filtered = filtered.filter(entry => new Date(entry.at) >= fromDate)
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo)
      filtered = filtered.filter(entry => new Date(entry.at) <= toDate)
    }

    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(entry => {
        return (
          entry.entity.toLowerCase().includes(search) ||
          entry.action.toLowerCase().includes(search) ||
          entry.user?.username.toLowerCase().includes(search) ||
          entry.user?.name?.toLowerCase().includes(search) ||
          entry.matrix?.name.toLowerCase().includes(search) ||
          JSON.stringify(entry.changes).toLowerCase().includes(search)
        )
      })
    }

    return filtered.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  }, [entries, filters])

  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    const entities = [...new Set(entries.map(e => e.entity))].sort()
    const actions = [...new Set(entries.map(e => e.action))].sort()
    const users = [...new Set(entries.map(e => e.user).filter(Boolean))]
      .sort((a, b) => (a?.username || '').localeCompare(b?.username || ''))

    return { entities, actions, users }
  }, [entries])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      entity: '',
      action: '',
      userId: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    })
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {t('audit.visualHistory')}
          </h3>
          <p className="text-sm text-gray-500">
            {t('audit.entriesCount', { count: filteredEntries.length })}
          </p>
        </div>

        {/* View Mode Toggle */}
        {(showTimeline || showActivity || showChart) && (
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {showTimeline && (
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 text-sm font-medium ${
                  viewMode === 'timeline'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t('audit.timeline')}
              </button>
            )}
            {showActivity && (
              <button
                onClick={() => setViewMode('activity')}
                className={`px-3 py-1.5 text-sm font-medium ${
                  viewMode === 'activity'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t('audit.activity')}
              </button>
            )}
            {showChart && (
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1.5 text-sm font-medium ${
                  viewMode === 'chart'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t('audit.chart')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-900">{t('audit.filters')}</h4>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {t('audit.clearFilters')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Search */}
            <div className="xl:col-span-2">
              <input
                type="text"
                placeholder={t('audit.searchPlaceholder')}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Entity Filter */}
            <div>
              <select
                value={filters.entity}
                onChange={(e) => handleFilterChange('entity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('audit.allEntities')}</option>
                {filterOptions.entities.map(entity => (
                  <option key={entity} value={entity}>
                    {t(`audit.entities.${entity}`, { defaultValue: entity })}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('audit.allActions')}</option>
                <option value="create">{t('audit.actions.create')}</option>
                <option value="update">{t('audit.actions.update')}</option>
                <option value="delete">{t('audit.actions.delete')}</option>
              </select>
            </div>

            {/* User Filter */}
            <div>
              <select
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('audit.allUsers')}</option>
                {filterOptions.users.map(user => (
                  <option key={user?.id} value={user?.id}>
                    {user?.name || user?.username}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <input
                type="datetime-local"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('audit.dateFrom')}
              />
            </div>

            {/* Date To */}
            <div>
              <input
                type="datetime-local"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('audit.dateTo')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Visualization Content */}
      <div className="min-h-[400px]">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg font-medium mb-2">{t('audit.noEntries')}</p>
            <p className="text-sm">{t('audit.noEntriesDescription')}</p>
          </div>
        ) : (
          <>
            {viewMode === 'timeline' && showTimeline && (
              <Timeline entries={filteredEntries} />
            )}
            {viewMode === 'activity' && showActivity && (
              <ActivityFeed entries={filteredEntries} />
            )}
            {viewMode === 'chart' && showChart && (
              <AuditChart entries={filteredEntries} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default AuditVisualization
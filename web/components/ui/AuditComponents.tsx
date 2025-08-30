'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { fr, enUS as en, es } from 'date-fns/locale'

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

interface AuditComponentProps {
  entries: AuditEntry[]
}

// Get the appropriate date-fns locale
const getDateLocale = (language: string) => {
  switch (language) {
    case 'fr': return fr
    case 'es': return es
    default: return en
  }
}

// Timeline View Component
export function Timeline({ entries }: AuditComponentProps) {
  const { t, i18n } = useTranslation()

  const groupedEntries = useMemo(() => {
    const groups: Record<string, AuditEntry[]> = {}
    
    entries.forEach(entry => {
      const date = format(new Date(entry.at), 'yyyy-MM-dd', { 
        locale: getDateLocale(i18n.language) 
      })
      if (!groups[date]) groups[date] = []
      groups[date].push(entry)
    })

    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [entries, i18n.language])

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'text-green-600'
      case 'update': return 'text-blue-600'
      case 'delete': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        )
      case 'update':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        )
      case 'delete':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const formatChanges = (changes: Record<string, unknown> | null) => {
    if (!changes) return null
    
    return Object.entries(changes).map(([key, value]) => (
      <div key={key} className="text-xs text-gray-600">
        <span className="font-medium">{key}:</span>{' '}
        <span className="font-mono">{JSON.stringify(value)}</span>
      </div>
    ))
  }

  return (
    <div className="space-y-8">
      {groupedEntries.map(([date, dayEntries]) => (
        <div key={date} className="relative">
          {/* Date Header */}
          <div className="flex items-center mb-4">
            <h4 className="text-lg font-medium text-gray-900 bg-white pr-4">
              {format(new Date(date), 'EEEE, MMMM d, yyyy', { 
                locale: getDateLocale(i18n.language) 
              })}
            </h4>
            <div className="flex-1 border-t border-gray-200 ml-4"></div>
          </div>

          {/* Timeline Items */}
          <div className="relative pl-8">
            {/* Vertical Line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200"></div>

            <div className="space-y-4">
              {dayEntries.map((entry) => (
                <div key={entry.id} className="relative flex items-start">
                  {/* Timeline Dot */}
                  <div className={`absolute left-[-1.75rem] w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                    entry.action === 'create' ? 'bg-green-100' :
                    entry.action === 'update' ? 'bg-blue-100' :
                    entry.action === 'delete' ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    <span className={getActionColor(entry.action)}>
                      {getActionIcon(entry.action)}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`font-medium ${getActionColor(entry.action)}`}>
                            {t(`audit.actions.${entry.action}`)}
                          </span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-700">
                            {t(`audit.entities.${entry.entity}`, { defaultValue: entry.entity })}
                          </span>
                          <span className="text-gray-500">#{entry.entityId}</span>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          {entry.user ? (
                            <span>
                              {t('audit.by')} <strong>{entry.user.name || entry.user.username}</strong>
                            </span>
                          ) : (
                            <span>{t('audit.systemAction')}</span>
                          )}
                          {entry.matrix && (
                            <>
                              {' '}{t('audit.inMatrix')} <strong>{entry.matrix.name}</strong>
                            </>
                          )}
                        </div>

                        {/* Changes */}
                        {entry.changes && Object.keys(entry.changes).length > 0 && (
                          <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                            <div className="font-medium text-gray-700">{t('audit.changes')}:</div>
                            {formatChanges(entry.changes)}
                          </div>
                        )}
                      </div>

                      <div className="text-right text-sm text-gray-500 ml-4">
                        <div>{format(new Date(entry.at), 'HH:mm:ss')}</div>
                        {entry.ip && (
                          <div className="text-xs">{entry.ip}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Activity Feed Component
export function ActivityFeed({ entries }: AuditComponentProps) {
  const { t } = useTranslation()

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-800'
      case 'update': return 'bg-blue-100 text-blue-800'
      case 'delete': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-start space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          <div className="flex-shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${getActionColor(entry.action)}`}>
              {entry.action[0].toUpperCase()}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-gray-900">
                {entry.user ? (
                  <span>{entry.user.name || entry.user.username}</span>
                ) : (
                  <span className="text-gray-500">{t('audit.system')}</span>
                )}
                <span className="text-gray-500 font-normal"> {t(`audit.actions.${entry.action}`)} </span>
                <span className="text-blue-600">
                  {t(`audit.entities.${entry.entity}`, { defaultValue: entry.entity })}
                </span>
              </p>
              
              <span className="text-xs text-gray-500">
                {format(new Date(entry.at), 'MMM d, HH:mm')}
              </span>
            </div>
            
            {entry.matrix && (
              <p className="text-sm text-gray-600 mb-1">
                {t('audit.inMatrix')}: {entry.matrix.name}
              </p>
            )}
            
            {entry.changes && Object.keys(entry.changes).length > 0 && (
              <div className="text-xs text-gray-500">
                {Object.keys(entry.changes).length} {t('audit.fieldsChanged')}
              </div>
            )}
            
            {entry.ip && (
              <div className="text-xs text-gray-400 mt-1">
                IP: {entry.ip}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// Chart Component
export function AuditChart({ entries }: AuditComponentProps) {
  const { t } = useTranslation()

  const chartData = useMemo(() => {
    // Activity by day (last 30 days)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return format(date, 'yyyy-MM-dd')
    }).reverse()

    const activityByDay = last30Days.map(date => {
      const dayEntries = entries.filter(entry => 
        format(new Date(entry.at), 'yyyy-MM-dd') === date
      )
      return {
        date,
        count: dayEntries.length,
        creates: dayEntries.filter(e => e.action === 'create').length,
        updates: dayEntries.filter(e => e.action === 'update').length,
        deletes: dayEntries.filter(e => e.action === 'delete').length,
      }
    })

    // Activity by entity
    const entityCounts: Record<string, number> = {}
    entries.forEach(entry => {
      entityCounts[entry.entity] = (entityCounts[entry.entity] || 0) + 1
    })

    // Activity by action
    const actionCounts = {
      create: entries.filter(e => e.action === 'create').length,
      update: entries.filter(e => e.action === 'update').length,
      delete: entries.filter(e => e.action === 'delete').length,
    }

    // Top users
    const userCounts: Record<string, number> = {}
    entries.forEach(entry => {
      if (entry.user) {
        const key = entry.user.name || entry.user.username
        userCounts[key] = (userCounts[key] || 0) + 1
      }
    })

    return {
      activityByDay,
      entityCounts: Object.entries(entityCounts).sort(([,a], [,b]) => b - a),
      actionCounts,
      userCounts: Object.entries(userCounts).sort(([,a], [,b]) => b - a).slice(0, 10)
    }
  }, [entries])

  const maxDayActivity = Math.max(...chartData.activityByDay.map(d => d.count))

  return (
    <div className="space-y-8">
      {/* Activity Timeline */}
      <div className="bg-white p-6 border border-gray-200 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-4">{t('audit.activityTimeline')} (30 {t('audit.days')})</h4>
        <div className="flex items-end justify-between h-32 space-x-1">
          {chartData.activityByDay.map((day, index) => {
            const height = maxDayActivity > 0 ? (day.count / maxDayActivity) * 100 : 0
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-gray-200 rounded-t relative group" style={{ height: '100px' }}>
                  {height > 0 && (
                    <div
                      className="w-full bg-blue-500 rounded-t absolute bottom-0 group-hover:bg-blue-600 transition-colors"
                      style={{ height: `${height}%` }}
                    ></div>
                  )}
                  
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap transition-opacity">
                    <div>{format(new Date(day.date), 'MMM d')}: {day.count}</div>
                    {day.creates > 0 && <div className="text-green-300">+{day.creates}</div>}
                    {day.updates > 0 && <div className="text-blue-300">~{day.updates}</div>}
                    {day.deletes > 0 && <div className="text-red-300">-{day.deletes}</div>}
                  </div>
                </div>
                
                {index % 5 === 0 && (
                  <div className="text-xs text-gray-500 mt-1 transform rotate-45 origin-left">
                    {format(new Date(day.date), 'M/d')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actions Breakdown */}
        <div className="bg-white p-6 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-4">{t('audit.actionBreakdown')}</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-700">{t('audit.actions.create')}</span>
              </div>
              <span className="text-sm font-medium">{chartData.actionCounts.create}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-sm text-gray-700">{t('audit.actions.update')}</span>
              </div>
              <span className="text-sm font-medium">{chartData.actionCounts.update}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-sm text-gray-700">{t('audit.actions.delete')}</span>
              </div>
              <span className="text-sm font-medium">{chartData.actionCounts.delete}</span>
            </div>
          </div>
        </div>

        {/* Entity Activity */}
        <div className="bg-white p-6 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-4">{t('audit.entityActivity')}</h4>
          <div className="space-y-2">
            {chartData.entityCounts.slice(0, 5).map(([entity, count]) => (
              <div key={entity} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 truncate">
                  {t(`audit.entities.${entity}`, { defaultValue: entity })}
                </span>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Users */}
        <div className="bg-white p-6 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-4">{t('audit.topUsers')}</h4>
          <div className="space-y-2">
            {chartData.userCounts.slice(0, 5).map(([user, count]) => (
              <div key={user} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 truncate">{user}</span>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
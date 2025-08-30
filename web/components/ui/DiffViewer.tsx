'use client'

import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { MatrixDiff, DiffEntry, FieldChange } from '@/lib/matrix-diff'

interface DiffViewerProps {
  diff: MatrixDiff
  compact?: boolean
  showUnchanged?: boolean
  className?: string
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ 
  diff, 
  compact = false, 
  showUnchanged = false,
  className = '' 
}) => {
  const { t } = useTranslation('history')
  const [filter, setFilter] = useState<'all' | 'added' | 'modified' | 'removed'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredEntries = useMemo(() => {
    let entries = diff.entries

    // Apply type filter
    if (filter !== 'all') {
      entries = entries.filter(entry => entry.type === filter)
    }

    // Apply search filter
    if (searchTerm) {
      entries = entries.filter(entry => {
        const entryData = entry.entry || entry.newEntry || entry.oldEntry
        if (!entryData) return false

        const searchLower = searchTerm.toLowerCase()
        return (
          (entryData as any).rule_name?.toLowerCase().includes(searchLower) ||
          (entryData as any).src_name?.toLowerCase().includes(searchLower) ||
          (entryData as any).dst_name?.toLowerCase().includes(searchLower) ||
          (entryData as any).comment?.toLowerCase().includes(searchLower)
        )
      })
    }

    // Hide unchanged if not requested
    if (!showUnchanged) {
      entries = entries.filter(entry => entry.type !== 'unchanged')
    }

    return entries
  }, [diff.entries, filter, searchTerm, showUnchanged])

  const getDiffTypeIcon = (type: string): string => {
    switch (type) {
      case 'added': return '+'
      case 'removed': return '-'
      case 'modified': return '~'
      case 'unchanged': return '='
      default: return '?'
    }
  }

  const getDiffTypeColor = (type: string): string => {
    switch (type) {
      case 'added': return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'removed': return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      case 'modified': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20'
      case 'unchanged': return 'text-gray-600 bg-gray-100 dark:bg-gray-800'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-800'
    }
  }

  const formatFieldName = (field: string): string => {
    return t(`fieldNames.${field}`, field)
  }

  const renderFieldChange = (change: FieldChange) => {
    return (
      <div key={change.field} className="flex items-center gap-2 text-sm">
        <span className="font-medium text-slate-600 dark:text-slate-400 min-w-0 flex-shrink-0">
          {formatFieldName(change.field)}:
        </span>
        <div className="flex items-center gap-2 min-w-0">
          <span className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 px-2 py-1 rounded text-xs font-mono truncate">
            {change.oldValue || '(vide)'}
          </span>
          <span className="text-gray-400">→</span>
          <span className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 px-2 py-1 rounded text-xs font-mono truncate">
            {change.newValue || '(vide)'}
          </span>
        </div>
      </div>
    )
  }

  const renderDiffEntry = (diffEntry: DiffEntry, index: number) => {
    const entry = diffEntry.entry || diffEntry.newEntry || diffEntry.oldEntry
    if (!entry) return null

    return (
      <div key={`${entry.id}-${index}`} className={`
        border rounded-lg p-4 mb-4
        ${diffEntry.type === 'added' ? 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/10' :
          diffEntry.type === 'removed' ? 'border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/10' :
          diffEntry.type === 'modified' ? 'border-orange-200 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/10' :
          'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
        }
      `}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className={`
              inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold
              ${getDiffTypeColor(diffEntry.type)}
            `}>
              {getDiffTypeIcon(diffEntry.type)}
            </span>
            <div>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {(entry as any).rule_name || `Règle #${entry.id}`}
              </span>
              <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
                ({diffEntry.type === 'added' ? 'Ajouté' : 
                  diffEntry.type === 'removed' ? 'Supprimé' :
                  diffEntry.type === 'modified' ? 'Modifié' : 'Inchangé'})
              </span>
            </div>
          </div>
          {!compact && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              ID: {entry.id}
            </div>
          )}
        </div>

        {/* Entry details in compact mode */}
        {compact ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-600 dark:text-slate-400">Source:</span>{' '}
              <span className="font-medium">{(entry as any).src_name || (entry as any).src_cidr}</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Destination:</span>{' '}
              <span className="font-medium">{(entry as any).dst_name || (entry as any).dst_cidr}</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Action:</span>{' '}
              <span className={`font-medium ${(entry as any).action === 'ALLOW' ? 'text-green-600' : 'text-red-600'}`}>
                {(entry as any).action}
              </span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Service:</span>{' '}
              <span className="font-medium">{(entry as any).dst_service || 'N/A'}</span>
            </div>
          </div>
        ) : (
          /* Detailed view */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
            <div>
              <div className="font-medium text-slate-700 dark:text-slate-300 mb-1">Source</div>
              <div className="space-y-1">
                <div><span className="text-slate-500">Zone:</span> {(entry as any).src_zone || '-'}</div>
                <div><span className="text-slate-500">Nom:</span> {(entry as any).src_name || '-'}</div>
                <div><span className="text-slate-500">CIDR:</span> {(entry as any).src_cidr || '-'}</div>
                <div><span className="text-slate-500">Service:</span> {(entry as any).src_service || '-'}</div>
              </div>
            </div>
            
            <div>
              <div className="font-medium text-slate-700 dark:text-slate-300 mb-1">Destination</div>
              <div className="space-y-1">
                <div><span className="text-slate-500">Zone:</span> {(entry as any).dst_zone || '-'}</div>
                <div><span className="text-slate-500">Nom:</span> {(entry as any).dst_name || '-'}</div>
                <div><span className="text-slate-500">CIDR:</span> {(entry as any).dst_cidr || '-'}</div>
                <div><span className="text-slate-500">Service:</span> {(entry as any).dst_service || '-'}</div>
              </div>
            </div>
            
            <div>
              <div className="font-medium text-slate-700 dark:text-slate-300 mb-1">Règle</div>
              <div className="space-y-1">
                <div><span className="text-slate-500">Statut:</span> {(entry as any).rule_status || '-'}</div>
                <div><span className="text-slate-500">Action:</span> 
                  <span className={`ml-1 font-medium ${(entry as any).action === 'ALLOW' ? 'text-green-600' : 'text-red-600'}`}>
                    {(entry as any).action}
                  </span>
                </div>
                <div><span className="text-slate-500">Équipement:</span> {(entry as any).device || '-'}</div>
                <div><span className="text-slate-500">Protocole:</span> {(entry as any).protocol_group || '-'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Changes details for modified entries */}
        {diffEntry.type === 'modified' && diffEntry.changes && diffEntry.changes.length > 0 && (
          <div className="border-t border-orange-200 dark:border-orange-700 pt-3">
            <div className="font-medium text-slate-700 dark:text-slate-300 mb-2">Modifications:</div>
            <div className="space-y-2">
              {diffEntry.changes.map(change => renderFieldChange(change))}
            </div>
          </div>
        )}

        {/* Comment if exists */}
        {(entry as any).comment && !compact && (
          <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
            <div className="text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Commentaire:</span>{' '}
              <span className="text-slate-600 dark:text-slate-400">{(entry as any).comment}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
          {t('diffSummary')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{diff.summary.added}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">{t('added')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{diff.summary.modified}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">{t('modified')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{diff.summary.removed}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">{t('removed')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{diff.summary.unchanged}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">{t('unchanged')}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex gap-2">
          {(['all', 'added', 'modified', 'removed'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`
                px-3 py-1 rounded-md text-sm font-medium transition-colors
                ${filter === type 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' 
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
            >
              {type === 'all' ? 'Tout' : 
               type === 'added' ? 'Ajouté' :
               type === 'modified' ? 'Modifié' : 'Supprimé'} 
              <span className="ml-1">
                ({type === 'all' ? filteredEntries.length :
                  type === 'added' ? diff.summary.added :
                  type === 'modified' ? diff.summary.modified :
                  diff.summary.removed})
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Rechercher dans les règles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showUnchanged}
            onChange={(e) => {/* setShowUnchanged is handled by parent */}}
            className="rounded"
          />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Afficher inchangés
          </span>
        </label>
      </div>

      {/* Entries */}
      <div>
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry, index) => renderDiffEntry(entry, index))
        ) : (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            Aucune différence trouvée avec les filtres actuels.
          </div>
        )}
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { ChevronDownIcon, ChevronRightIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline'
import { DiffViewer } from './DiffViewer'
import { MatrixDiff } from '@/lib/matrix-diff'

interface TimelineEntry {
  version: number
  note?: string
  createdAt: string
  createdBy: string
  changeCount: number
  summary: string
  hasChanges: boolean
}

interface HistoryTimelineProps {
  matrixId: number
  versions: TimelineEntry[]
  className?: string
}

interface TimelineNodeProps {
  entry: TimelineEntry
  isFirst: boolean
  isLast: boolean
  onCompare: (fromVersion: number, toVersion: number) => void
  onViewDetails: (version: number) => void
  isExpanded: boolean
  onToggle: () => void
  diff?: MatrixDiff
  loading?: boolean
}

const getRiskColor = (changeCount: number): string => {
  if (changeCount === 0) return 'bg-gray-100 text-gray-600 border-gray-300'
  if (changeCount <= 5) return 'bg-green-100 text-green-700 border-green-300'
  if (changeCount <= 15) return 'bg-yellow-100 text-yellow-700 border-yellow-300'
  if (changeCount <= 30) return 'bg-orange-100 text-orange-700 border-orange-300'
  return 'bg-red-100 text-red-700 border-red-300'
}

const getChangeIcon = (changeCount: number): string => {
  if (changeCount === 0) return '○'
  if (changeCount <= 5) return '●'
  if (changeCount <= 15) return '◐'
  return '●'
}

const TimelineNode: React.FC<TimelineNodeProps> = ({
  entry,
  isFirst,
  isLast,
  onCompare,
  onViewDetails,
  isExpanded,
  onToggle,
  diff,
  loading = false
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('fr-FR'),
      time: date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
  }

  const { date, time } = formatDate(entry.createdAt)

  return (
    <div className="relative">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-300" />
      )}
      
      <div className="flex items-start space-x-4">
        {/* Timeline marker */}
        <div className={`
          relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2
          ${getRiskColor(entry.changeCount)}
        `}>
          <span className="text-sm font-bold">
            {getChangeIcon(entry.changeCount)}
          </span>
        </div>
        
        {/* Content */}
        <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="text-lg font-semibold text-gray-900">
                    Version {entry.version}
                    {isFirst && (
                      <span className="ml-2 inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        Actuelle
                      </span>
                    )}
                  </h4>
                  
                  {entry.hasChanges && (
                    <button
                      onClick={onToggle}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full" />
                      ) : isExpanded ? (
                        <ChevronDownIcon className="w-5 h-5" />
                      ) : (
                        <ChevronRightIcon className="w-5 h-5" />
                      )}
                    </button>
                  )}
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center space-x-1">
                    <ClockIcon className="w-4 h-4" />
                    <span>{date} à {time}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <UserIcon className="w-4 h-4" />
                    <span>{entry.createdBy}</span>
                  </div>
                </div>
                
                {entry.note && (
                  <p className="text-sm text-gray-700 mb-3 p-3 bg-gray-50 rounded">
                    {entry.note}
                  </p>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    {entry.hasChanges ? (
                      <span className={`
                        inline-flex px-2 py-1 rounded-full text-xs font-medium
                        ${getRiskColor(entry.changeCount)}
                      `}>
                        {entry.summary}
                      </span>
                    ) : (
                      <span className="text-gray-500">Aucun changement détecté</span>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    {!isFirst && entry.hasChanges && (
                      <button
                        onClick={() => onCompare(entry.version, entry.version + 1)}
                        className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md transition-colors"
                      >
                        Comparer avec précédente
                      </button>
                    )}
                    <button
                      onClick={() => onViewDetails(entry.version)}
                      className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      Voir détails
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Expanded diff view */}
          {isExpanded && diff && (
            <div className="border-t bg-gray-50 p-4">
              <DiffViewer 
                diff={diff} 
                compact={true}
                showUnchanged={false}
                className="bg-white rounded border"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const HistoryTimeline: React.FC<HistoryTimelineProps> = ({
  matrixId,
  versions,
  className = ''
}) => {
  const [expandedVersions, setExpandedVersions] = useState<Set<number>>(new Set())
  const [loadingDiffs, setLoadingDiffs] = useState<Set<number>>(new Set())
  const [diffs, setDiffs] = useState<Map<number, MatrixDiff>>(new Map())
  const [filter, setFilter] = useState<'all' | 'changes-only'>('all')

  const filteredVersions = filter === 'changes-only' 
    ? versions.filter(v => v.hasChanges)
    : versions

  const toggleExpanded = async (version: number) => {
    const isExpanded = expandedVersions.has(version)
    const newExpanded = new Set(expandedVersions)
    
    if (isExpanded) {
      newExpanded.delete(version)
      setExpandedVersions(newExpanded)
    } else {
      newExpanded.add(version)
      setExpandedVersions(newExpanded)
      
      // Load diff if not already loaded
      if (!diffs.has(version)) {
        await loadDiff(version)
      }
    }
  }

  const loadDiff = async (toVersion: number) => {
    const fromVersion = toVersion - 1
    if (fromVersion < 1) return

    setLoadingDiffs(prev => new Set(prev).add(toVersion))
    
    try {
      const response = await fetch(
        `/api/matrices/${matrixId}/versions/diff?fromVersion=${fromVersion}&toVersion=${toVersion}&includeImpact=true`
      )
      
      if (response.ok) {
        const data = await response.json()
        setDiffs(prev => new Map(prev).set(toVersion, data.data.diff))
      }
    } catch (error) {
      console.error('Error loading diff:', error)
    } finally {
      setLoadingDiffs(prev => {
        const newSet = new Set(prev)
        newSet.delete(toVersion)
        return newSet
      })
    }
  }

  const handleCompare = (fromVersion: number, toVersion: number) => {
    window.open(`/matrices/${matrixId}/history/compare?from=${fromVersion}&to=${toVersion}`, '_blank')
  }

  const handleViewDetails = (version: number) => {
    window.open(`/matrices/${matrixId}/versions/${version}`, '_blank')
  }

  const totalChanges = versions.reduce((sum, v) => sum + v.changeCount, 0)
  const versionsWithChanges = versions.filter(v => v.hasChanges).length

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary header */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Historique des versions
          </h2>
          
          <div className="flex items-center space-x-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Toutes les versions</option>
              <option value="changes-only">Modifications uniquement</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{versions.length}</div>
            <div className="text-sm text-gray-600">Total versions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{versionsWithChanges}</div>
            <div className="text-sm text-gray-600">Avec modifications</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">{totalChanges}</div>
            <div className="text-sm text-gray-600">Total changements</div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg border p-6">
        <div className="space-y-6">
          {filteredVersions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {filter === 'changes-only' 
                ? 'Aucune version avec modifications trouvée'
                : 'Aucune version disponible'
              }
            </div>
          ) : (
            filteredVersions.map((entry, index) => (
              <TimelineNode
                key={entry.version}
                entry={entry}
                isFirst={index === 0}
                isLast={index === filteredVersions.length - 1}
                onCompare={handleCompare}
                onViewDetails={handleViewDetails}
                isExpanded={expandedVersions.has(entry.version)}
                onToggle={() => toggleExpanded(entry.version)}
                diff={diffs.get(entry.version)}
                loading={loadingDiffs.has(entry.version)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default HistoryTimeline
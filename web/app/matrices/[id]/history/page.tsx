'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeftIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { DiffViewer } from '@/components/ui/DiffViewer'
import HistoryTimeline from '@/components/ui/HistoryTimeline'
import { MatrixDiff } from '@/lib/matrix-diff'

interface Version {
  version: number
  note?: string
  createdAt: string
  createdBy: string
}

interface TimelineEntry extends Version {
  changeCount: number
  summary: string
  hasChanges: boolean
}

export default function HistoryPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const matrixId = parseInt(params.id as string)
  
  const [versions, setVersions] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [compareMode, setCompareMode] = useState(false)
  const [selectedVersions, setSelectedVersions] = useState<number[]>([])
  const [diff, setDiff] = useState<MatrixDiff | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [matrix, setMatrix] = useState<any>(null)
  
  // Check if we're in compare mode from URL params
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')
  
  useEffect(() => {
    if (fromParam && toParam) {
      setCompareMode(true)
      setSelectedVersions([parseInt(fromParam), parseInt(toParam)])
      loadCompare(parseInt(fromParam), parseInt(toParam))
    }
  }, [fromParam, toParam])

  useEffect(() => {
    loadMatrix()
    loadVersionHistory()
  }, [matrixId])

  const loadMatrix = async () => {
    try {
      const response = await fetch(`/api/matrices/${matrixId}`)
      if (response.ok) {
        const data = await response.json()
        setMatrix(data.data)
      }
    } catch (error) {
      console.error('Error loading matrix:', error)
    }
  }

  const loadVersionHistory = async () => {
    setLoading(true)
    try {
      // Get all versions for the matrix
      const response = await fetch(`/api/matrices/${matrixId}/versions`)
      if (response.ok) {
        const data = await response.json()
        const versions = data.data || []
        
        // Get diff stats for each version (compare with previous)
        const timelineEntries: TimelineEntry[] = []
        
        for (let i = 0; i < versions.length; i++) {
          const version = versions[i]
          let changeCount = 0
          let summary = 'Version initiale'
          let hasChanges = false
          
          if (i > 0) {
            // Get diff with previous version
            try {
              const diffResponse = await fetch(
                `/api/matrices/${matrixId}/versions/diff?fromVersion=${version.version - 1}&toVersion=${version.version}`
              )
              
              if (diffResponse.ok) {
                const diffData = await diffResponse.json()
                const versionDiff = diffData.data.diff
                changeCount = versionDiff.summary.added + versionDiff.summary.modified + versionDiff.summary.removed
                hasChanges = changeCount > 0
                
                const parts = []
                if (versionDiff.summary.added > 0) parts.push(`+${versionDiff.summary.added}`)
                if (versionDiff.summary.modified > 0) parts.push(`~${versionDiff.summary.modified}`)
                if (versionDiff.summary.removed > 0) parts.push(`-${versionDiff.summary.removed}`)
                
                summary = parts.length > 0 ? parts.join(', ') : 'Aucun changement'
              }
            } catch (diffError) {
              console.error('Error loading diff for version:', version.version, diffError)
            }
          }
          
          timelineEntries.push({
            version: version.version,
            note: version.note,
            createdAt: version.createdAt,
            createdBy: version.createdBy?.fullName || version.createdBy?.username || 'Unknown',
            changeCount,
            summary,
            hasChanges
          })
        }
        
        setVersions(timelineEntries.sort((a, b) => b.version - a.version))
      }
    } catch (error) {
      console.error('Error loading version history:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCompare = async (fromVersion: number, toVersion: number) => {
    setDiffLoading(true)
    try {
      const response = await fetch(
        `/api/matrices/${matrixId}/versions/diff?fromVersion=${fromVersion}&toVersion=${toVersion}&includeImpact=true`
      )
      
      if (response.ok) {
        const data = await response.json()
        setDiff(data.data.diff)
      }
    } catch (error) {
      console.error('Error loading diff:', error)
    } finally {
      setDiffLoading(false)
    }
  }

  const handleVersionSelect = (version: number) => {
    if (selectedVersions.includes(version)) {
      setSelectedVersions(selectedVersions.filter(v => v !== version))
    } else if (selectedVersions.length < 2) {
      setSelectedVersions([...selectedVersions, version])
    } else {
      // Replace last selection
      setSelectedVersions([selectedVersions[0], version])
    }
  }

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      const [v1, v2] = selectedVersions.sort((a, b) => a - b)
      loadCompare(v1, v2)
      setCompareMode(true)
    }
  }

  const handleExitCompare = () => {
    setCompareMode(false)
    setSelectedVersions([])
    setDiff(null)
    // Update URL to remove compare parameters
    const newUrl = `/matrices/${matrixId}/history`
    window.history.replaceState({}, '', newUrl)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Chargement de l&apos;historique...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href={`/matrices/${matrixId}`}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Retour à la matrice
            </Link>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Historique - {matrix?.name || `Matrice ${matrixId}`}
              </h1>
              <p className="text-gray-600 mt-1">
                Visualisez l&apos;évolution de votre matrice de flux
              </p>
            </div>
            
            {compareMode ? (
              <button
                onClick={handleExitCompare}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Quitter la comparaison
              </button>
            ) : (
              <div className="flex items-center space-x-4">
                {selectedVersions.length > 0 && (
                  <div className="text-sm text-gray-600">
                    {selectedVersions.length} version{selectedVersions.length > 1 ? 's' : ''} sélectionnée{selectedVersions.length > 1 ? 's' : ''}
                  </div>
                )}
                
                {selectedVersions.length === 2 && (
                  <button
                    onClick={handleCompare}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ArrowsRightLeftIcon className="w-5 h-5 mr-2" />
                    Comparer les versions
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {compareMode && diff ? (
          <div className="space-y-6">
            {/* Compare header */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Comparaison des versions
              </h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Version {selectedVersions[0]}</span>
                <span>→</span>
                <span>Version {selectedVersions[1]}</span>
              </div>
            </div>
            
            {/* Diff viewer */}
            {diffLoading ? (
              <div className="bg-white rounded-lg border p-12 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-600">Génération de la comparaison...</p>
              </div>
            ) : (
              <DiffViewer 
                diff={diff} 
                compact={false}
                showUnchanged={false}
              />
            )}
          </div>
        ) : (
          <>
            {/* Version selection mode */}
            {selectedVersions.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-blue-900">Mode comparaison</h3>
                    <p className="text-sm text-blue-700">
                      Sélectionnez {selectedVersions.length === 1 ? 'une seconde' : 'les'} version{selectedVersions.length === 1 ? '' : 's'} à comparer
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedVersions([])}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
            
            {/* Timeline */}
            <HistoryTimeline
              matrixId={matrixId}
              versions={versions}
            />
          </>
        )}
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeftIcon, DocumentArrowDownIcon, ShareIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { DiffViewer } from '@/components/ui/DiffViewer'
import { MatrixDiff, MatrixDiffEngine } from '@/lib/matrix-diff'

interface ImpactAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  impactedZones: string[]
  impactedServices: string[]
  criticalChanges: string[]
  recommendations: string[]
}

interface VersionInfo {
  version: number
  note?: string
  createdAt: string
  createdBy: string
}

function CompareContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const matrixId = parseInt(params.id as string)
  const fromVersion = parseInt(searchParams.get('from') || '0')
  const toVersion = parseInt(searchParams.get('to') || '0')
  
  const [diff, setDiff] = useState<MatrixDiff | null>(null)
  const [impact, setImpact] = useState<ImpactAnalysis | null>(null)
  const [versions, setVersions] = useState<{ from: VersionInfo; to: VersionInfo } | null>(null)
  const [loading, setLoading] = useState(true)
  const [matrix, setMatrix] = useState<any>(null)
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    if (fromVersion && toVersion && fromVersion !== toVersion) {
      loadMatrix()
      loadComparison()
    }
  }, [matrixId, fromVersion, toVersion])

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

  const loadComparison = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/matrices/${matrixId}/versions/diff?fromVersion=${fromVersion}&toVersion=${toVersion}&includeImpact=true`
      )
      
      if (response.ok) {
        const data = await response.json()
        setDiff(data.data.diff)
        setImpact(data.data.impact)
        setVersions(data.data.versions)
      } else {
        console.error('Failed to load comparison')
      }
    } catch (error) {
      console.error('Error loading comparison:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'markdown') => {
    if (!diff) return
    
    setExportLoading(true)
    try {
      const response = await fetch(
        `/api/matrices/${matrixId}/versions/diff?fromVersion=${fromVersion}&toVersion=${toVersion}&format=${format}`,
        { method: 'GET' }
      )
      
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `matrix-${matrixId}-diff-v${fromVersion}-to-v${toVersion}.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting diff:', error)
    } finally {
      setExportLoading(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      // Show a toast notification here if you have one
      alert('Lien copié dans le presse-papiers')
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRiskLevelText = (level: string) => {
    switch (level) {
      case 'low': return 'Faible'
      case 'medium': return 'Moyen'
      case 'high': return 'Élevé'
      case 'critical': return 'Critique'
      default: return 'Inconnu'
    }
  }

  if (!fromVersion || !toVersion || fromVersion === toVersion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Paramètres de comparaison invalides</h2>
          <p className="text-gray-600 mb-6">
            Veuillez spécifier deux versions différentes à comparer.
          </p>
          <Link
            href={`/matrices/${matrixId}/history`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retour à l&apos;historique
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Génération de la comparaison...</p>
        </div>
      </div>
    )
  }

  if (!diff) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Erreur de comparaison</h2>
          <p className="text-gray-600 mb-6">
            Impossible de générer la comparaison entre ces versions.
          </p>
          <Link
            href={`/matrices/${matrixId}/history`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retour à l&apos;historique
          </Link>
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
              href={`/matrices/${matrixId}/history`}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Retour à l&apos;historique
            </Link>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Comparaison de versions
              </h1>
              <p className="text-gray-600 mt-1">
                {matrix?.name || `Matrice ${matrixId}`} - Version {fromVersion} → {toVersion}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleShare}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <ShareIcon className="w-4 h-4 mr-2" />
                Partager
              </button>
              
              <div className="relative">
                <select
                  onChange={(e) => e.target.value && handleExport(e.target.value as 'csv' | 'markdown')}
                  value=""
                  disabled={exportLoading}
                  className="appearance-none inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>
                    {exportLoading ? 'Export...' : 'Exporter'}
                  </option>
                  <option value="csv">CSV</option>
                  <option value="markdown">Markdown</option>
                </select>
                <DocumentArrowDownIcon className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Version info */}
        {versions && (
          <div className="bg-white rounded-lg border p-6 mb-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Version source ({fromVersion})</h3>
                <div className="text-sm space-y-1">
                  <div><span className="text-gray-500">Date:</span> {new Date(versions.from.createdAt).toLocaleString('fr-FR')}</div>
                  <div><span className="text-gray-500">Créé par:</span> {versions.from.createdBy}</div>
                  {versions.from.note && (
                    <div><span className="text-gray-500">Note:</span> {versions.from.note}</div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Version cible ({toVersion})</h3>
                <div className="text-sm space-y-1">
                  <div><span className="text-gray-500">Date:</span> {new Date(versions.to.createdAt).toLocaleString('fr-FR')}</div>
                  <div><span className="text-gray-500">Créé par:</span> {versions.to.createdBy}</div>
                  {versions.to.note && (
                    <div><span className="text-gray-500">Note:</span> {versions.to.note}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Impact analysis */}
        {impact && (
          <div className="bg-white rounded-lg border p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Analyse d&apos;impact</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 border rounded-lg">
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getRiskLevelColor(impact.riskLevel)}`}>
                  Niveau de risque: {getRiskLevelText(impact.riskLevel)}
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{impact.impactedZones.length}</div>
                <div className="text-sm text-gray-600">Zones impactées</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{impact.impactedServices.length}</div>
                <div className="text-sm text-gray-600">Services impactés</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-red-600">{impact.criticalChanges.length}</div>
                <div className="text-sm text-gray-600">Changements critiques</div>
              </div>
            </div>

            {impact.criticalChanges.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-900 mb-2">Changements critiques</h3>
                <div className="space-y-2">
                  {impact.criticalChanges.map((change, index) => (
                    <div key={index} className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                      {change}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {impact.recommendations.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Recommandations</h3>
                <div className="space-y-2">
                  {impact.recommendations.map((rec, index) => (
                    <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Diff viewer */}
        <DiffViewer 
          diff={diff} 
          compact={false}
          showUnchanged={false}
        />
      </div>
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    }>
      <CompareContent />
    </Suspense>
  )
}
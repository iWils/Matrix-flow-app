'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useLocalizedDate } from '@/lib/hooks/useLocalizedDate'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { usePermissions } from '@/hooks/usePermissions'
import { BatchActions } from '@/components/ui/BatchActions'
import { AdvancedSearch, SearchFilters } from '@/components/ui/AdvancedSearch'
import { useToast } from '@/components/ui/Toast'

type FlowEntry = {
  id: number
  request_type?: string
  rule_status?: string
  rule_name?: string
  device?: string
  src_zone?: string
  src_name?: string
  src_cidr?: string
  src_service?: string
  dst_zone?: string
  dst_name?: string
  dst_cidr?: string
  protocol_group?: string
  dst_service?: string
  action?: string
  implementation_date?: string
  requester?: string
  comment?: string
  createdAt: string
  updatedAt: string
}

type Matrix = {
  id: number
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  ownerId?: number
  owner?: {
    username: string
    fullName?: string
  }
  publishedVersion?: {
    version: number
    status: string
  }
  entries: FlowEntry[]
  versions: Array<{
    id: number
    version: number
    status: string
    createdAt: string
  }>
  permissions: Array<{
    role: 'owner' | 'editor' | 'viewer'
    user: {
      username: string
      fullName?: string
    }
  }>
}

export default function EnhancedMatrixDetailPage() {
  const { t } = useTranslation(['common', 'matrices'])
  const { formatShortDate } = useLocalizedDate()
  const { success, error: showError, info } = useToast()
  useSession() // Session used by usePermissions hook internally
  const params = useParams()
  const router = useRouter()
  const matrixId = parseInt(params.id as string)

  const [matrix, setMatrix] = useState<Matrix | null>(null)
  const [filteredEntries, setFilteredEntries] = useState<FlowEntry[]>([])
  const [selectedEntries, setSelectedEntries] = useState<number[]>([])
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({})
  const [isSearching, setIsSearching] = useState(false)
  
  // Permissions RBAC
  const permissions = usePermissions({
    matrixId: matrix?.id,
    matrixOwnerId: matrix?.ownerId,
    matrixPermissions: matrix?.permissions
  })
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // États pour les modales (non utilisés dans cette version de démonstration mais conservés pour extension future)

  // Fonction pour supprimer une entrée individuelle
  const handleDeleteSingle = async (entryId: number) => {
    try {
      const response = await fetch(`/api/matrices/${matrixId}/entries/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          entryIds: [entryId]
        })
      })
      
      if (response.ok) {
        success('Entrée supprimée')
        window.location.reload()
      } else {
        showError('Erreur lors de la suppression')
      }
    } catch {
      showError('Erreur lors de la suppression')
    }
  }

  // États pour nouvelle entrée (conservés pour extension future)

  const loadMatrix = useCallback(async () => {
    try {
      const res = await fetch(`/api/matrices/${matrixId}`)
      if (res.ok) {
        const response = await res.json()
        if (response.success && response.data) {
          setMatrix(response.data)
          setFilteredEntries(response.data.entries)
        }
      } else if (res.status === 404) {
        setError(t('matrices:matrixNotFound'))
      } else {
        setError(t('common:errorOccurred'))
      }
    } catch {
      setError(t('common:connectionError'))
    } finally {
      setLoading(false)
    }
  }, [matrixId, t])

  // Fonction de recherche avancée
  const handleSearch = useCallback(async () => {
    if (!matrix) return

    setIsSearching(true)
    try {
      const queryParams = new URLSearchParams()
      
      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          queryParams.append(key, value)
        }
      })

      const res = await fetch(`/api/matrices/${matrixId}/entries/search?${queryParams}`)
      if (res.ok) {
        const response = await res.json()
        if (response.success) {
          setFilteredEntries(response.data.entries)
          info(
            'Recherche terminée',
            `${response.data.entries.length} résultat(s) trouvé(s)`,
            3000
          )
        }
      } else {
        showError('Erreur de recherche', 'Impossible d\'effectuer la recherche')
      }
    } catch (error) {
      console.error('Search error:', error)
      showError('Erreur de recherche', 'Erreur de connexion lors de la recherche')
    } finally {
      setIsSearching(false)
    }
  }, [matrixId, searchFilters, matrix, info, showError])

  // Réinitialiser la recherche
  const handleResetSearch = useCallback(() => {
    setSearchFilters({})
    setFilteredEntries(matrix?.entries || [])
    setSelectedEntries([])
  }, [matrix])

  // Sélection des entrées
  const handleSelectEntry = (entryId: number, selected: boolean) => {
    if (selected) {
      setSelectedEntries(prev => [...prev, entryId])
    } else {
      setSelectedEntries(prev => prev.filter(id => id !== entryId))
    }
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedEntries(filteredEntries.map(entry => entry.id))
    } else {
      setSelectedEntries([])
    }
  }

  // Opérations en lot
  const handleBatchDelete = async (entryIds: number[]) => {
    try {
      const res = await fetch(`/api/matrices/${matrixId}/entries/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          entryIds
        })
      })

      if (res.ok) {
        const response = await res.json()
        if (response.success) {
          await loadMatrix()
          success(
            'Suppression réussie',
            `${response.data.processed} entrée(s) supprimée(s)`,
            4000
          )
        }
      } else {
        showError('Erreur de suppression', 'Impossible de supprimer les entrées')
      }
    } catch (error) {
      console.error('Batch delete error:', error)
      showError('Erreur de suppression', 'Erreur de connexion')
    }
  }

  const handleBatchUpdate = async (entryIds: number[], updates: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/matrices/${matrixId}/entries/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          entryIds,
          updates
        })
      })

      if (res.ok) {
        const response = await res.json()
        if (response.success) {
          await loadMatrix()
          success(
            'Mise à jour réussie',
            `${response.data.processed} entrée(s) mise(s) à jour`,
            4000
          )
        }
      } else {
        showError('Erreur de mise à jour', 'Impossible de mettre à jour les entrées')
      }
    } catch (error) {
      console.error('Batch update error:', error)
      showError('Erreur de mise à jour', 'Erreur de connexion')
    }
  }

  const handleBatchExport = async (entryIds: number[]) => {
    try {
      const res = await fetch(`/api/matrices/${matrixId}/entries/batch?ids=${entryIds.join(',')}`)
      if (res.ok) {
        const response = await res.json()
        if (response.success) {
          // Créer et télécharger le CSV
          const csvContent = generateCSV(response.data)
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `matrix-${matrix?.name}-selection-${new Date().toISOString().split('T')[0]}.csv`
          a.click()
          window.URL.revokeObjectURL(url)
          
          success(
            'Export réussi',
            `${entryIds.length} entrée(s) exportée(s)`,
            3000
          )
        }
      } else {
        showError('Erreur d\'export', 'Impossible d\'exporter les entrées')
      }
    } catch (error) {
      console.error('Batch export error:', error)
      showError('Erreur d\'export', 'Erreur de connexion')
    }
  }

  // Fonction utilitaire pour générer le CSV
  const generateCSV = (entries: FlowEntry[]) => {
    const headers = [
      'Nom de règle', 'Équipement', 'Zone source', 'CIDR source',
      'Zone destination', 'CIDR destination', 'Service', 'Action',
      'Statut', 'Demandeur', 'Commentaire', 'Date création'
    ]
    
    const rows = entries.map(entry => [
      entry.rule_name || '',
      entry.device || '',
      entry.src_zone || '',
      entry.src_cidr || '',
      entry.dst_zone || '',
      entry.dst_cidr || '',
      entry.dst_service || '',
      entry.action || '',
      entry.rule_status || '',
      entry.requester || '',
      entry.comment || '',
      formatShortDate(entry.createdAt)
    ])

    return [headers, ...rows].map(row => 
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n')
  }

  useEffect(() => {
    if (matrixId) {
      loadMatrix()
    }
  }, [matrixId, loadMatrix])

  // Fonctions existantes (addEntry, updateEntry, deleteEntry, etc.) 
  // ... (reste du code existant)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="error">
        {error}
        <Button 
          variant="outline" 
          className="ml-4" 
          onClick={() => router.push('/matrices')}
        >
          Retour aux matrices
        </Button>
      </Alert>
    )
  }

  if (!matrix) return null

  const isAllSelected = filteredEntries.length > 0 && 
    selectedEntries.length === filteredEntries.length

  const isPartiallySelected = selectedEntries.length > 0 && 
    selectedEntries.length < filteredEntries.length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/matrices')}
              className="p-1"
            >
              ← Retour
            </Button>
            <h1 className="text-3xl font-bold text-gradient mb-2">{matrix.name}</h1>
            {matrix.publishedVersion && (
              <Badge variant="success">v{matrix.publishedVersion.version}</Badge>
            )}
          </div>
          {matrix.description && (
            <p className="text-slate-600 dark:text-slate-400">{matrix.description}</p>
          )}
        </div>

        <div className="flex gap-2">
          {permissions.canViewMatrix && (
            <Button variant="outline" onClick={() => alert('Export fonctionnalité à implémenter')}>
              Export CSV
            </Button>
          )}
          {permissions.canEditMatrix && (
            <>
              <Button variant="outline" onClick={() => alert('Import fonctionnalité à implémenter')}>
                Import CSV
              </Button>
              <Button onClick={() => alert('Ajout entrée fonctionnalité à implémenter')}>
                Nouvelle entrée
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-sm text-slate-500 dark:text-slate-400">Entrées</div>
          <div className="text-2xl font-semibold">{matrix.entries.length}</div>
          <div className="text-xs text-slate-400">
            {filteredEntries.length !== matrix.entries.length && 
              `(${filteredEntries.length} affichées)`
            }
          </div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500 dark:text-slate-400">Sélectionnées</div>
          <div className="text-2xl font-semibold">{selectedEntries.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500 dark:text-slate-400">Propriétaire</div>
          <div className="text-sm">{matrix.owner?.fullName || matrix.owner?.username}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500 dark:text-slate-400">Dernière MAJ</div>
          <div className="text-sm">{formatShortDate(matrix.updatedAt)}</div>
        </Card>
      </div>

      {/* Recherche avancée */}
      <AdvancedSearch
        filters={searchFilters}
        onFiltersChange={setSearchFilters}
        onSearch={handleSearch}
        onReset={handleResetSearch}
        isLoading={isSearching}
      />

      {/* Table avec sélection multiple */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Entrées de flux</h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {filteredEntries.length} entrée(s)
            </div>
            {filteredEntries.length > 0 && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={input => {
                    if (input) input.indeterminate = isPartiallySelected
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />
                <label className="text-sm">
                  {isAllSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                </label>
              </div>
            )}
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            {Object.values(searchFilters).some(v => v) ? 
              'Aucun résultat ne correspond à votre recherche' :
              t('matrices:noFlowEntries')
            }
            {permissions.canEditMatrix && !Object.values(searchFilters).some(v => v) && (
              <Button
                variant="ghost"
                onClick={() => alert('Ajout première entrée à implémenter')}
                className="ml-2"
              >
                Ajouter la première entrée
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={input => {
                        if (input) input.indeterminate = isPartiallySelected
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-blue-600"
                    />
                  </TableHead>
                  <TableHead>Règle</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map(entry => (
                  <TableRow 
                    key={entry.id}
                    className={selectedEntries.includes(entry.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedEntries.includes(entry.id)}
                        onChange={(e) => handleSelectEntry(entry.id, e.target.checked)}
                        className="w-4 h-4 text-blue-600"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{entry.rule_name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{entry.device}</div>
                    </TableCell>
                    <TableCell>
                      <div>{entry.src_zone}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{entry.src_cidr}</div>
                    </TableCell>
                    <TableCell>
                      <div>{entry.dst_zone}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{entry.dst_cidr}</div>
                    </TableCell>
                    <TableCell>{entry.dst_service}</TableCell>
                    <TableCell>
                      <Badge variant={entry.action === 'ALLOW' ? 'success' : 'error'}>
                        {entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell>{entry.rule_status}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {permissions.canEditMatrix && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => alert('Modification entrée à implémenter')}
                          >
                            Modifier
                          </Button>
                        )}
                        {permissions.canEditMatrix && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteSingle(entry.id)}
                          >
                            Suppr
                          </Button>
                        )}
                        {!permissions.canEditMatrix && (
                          <span className="text-sm text-slate-400 dark:text-slate-400 px-2 py-1">
                            Lecture seule
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Actions en lot */}
      <BatchActions
        selectedCount={selectedEntries.length}
        selectedIds={selectedEntries}
        onClearSelection={() => setSelectedEntries([])}
        onBatchDelete={handleBatchDelete}
        onBatchUpdate={handleBatchUpdate}
        onBatchExport={handleBatchExport}
        canEdit={permissions.canEditMatrix}
      />

      {/* Modales existantes... */}
    </div>
  )
}
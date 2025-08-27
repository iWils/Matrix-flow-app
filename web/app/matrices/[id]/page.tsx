'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useLocalizedDate } from '@/lib/hooks/useLocalizedDate'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { usePermissions } from '@/hooks/usePermissions'

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

export default function MatrixDetailPage() {
  const { t } = useTranslation(['common', 'matrices'])
  const { formatShortDate } = useLocalizedDate()
  useSession() // Session used by usePermissions hook internally
  const params = useParams()
  const router = useRouter()
  const matrixId = parseInt(params.id as string)

  const [matrix, setMatrix] = useState<Matrix | null>(null)
  
  // Permissions RBAC
  const permissions = usePermissions({
    matrixId: matrix?.id,
    matrixOwnerId: matrix?.ownerId,
    matrixPermissions: matrix?.permissions
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [showImportCSV, setShowImportCSV] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<FlowEntry | null>(null)
  const [showWorkflowModal, setShowWorkflowModal] = useState(false)
  const [workflowAction, setWorkflowAction] = useState<{
    type: 'create' | 'update' | 'delete'
    entry?: FlowEntry
    data?: Partial<FlowEntry>
  } | null>(null)

  const [newEntry, setNewEntry] = useState<Partial<FlowEntry>>({
    rule_name: '',
    src_zone: '',
    src_cidr: '',
    dst_zone: '',
    dst_cidr: '',
    dst_service: '',
    action: 'ALLOW'
  })

  const loadMatrix = useCallback(async () => {
    try {
      const res = await fetch(`/api/matrices/${matrixId}`)
      if (res.ok) {
        const response = await res.json()
        if (response.success && response.data) {
          setMatrix(response.data)
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

  useEffect(() => {
    if (matrixId) {
      loadMatrix()
    }
  }, [matrixId, loadMatrix])

  async function addEntry() {
    if (!newEntry.rule_name?.trim()) return

    try {
      const res = await fetch(`/api/matrices/${matrixId}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
      })

      if (res.ok) {
        setNewEntry({
          rule_name: '',
          src_zone: '',
          src_cidr: '',
          dst_zone: '',
          dst_cidr: '',
          dst_service: '',
          action: 'ALLOW'
        })
        setShowAddEntry(false)
        loadMatrix()
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error)
    }
  }

  async function updateEntry(entry: FlowEntry) {
    // Si l'utilisateur est admin, modifier directement
    if (permissions.isAdmin) {
      try {
        const res = await fetch(`/api/matrices/${matrixId}/entries/${entry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        })

        if (res.ok) {
          setEditingEntry(null)
          loadMatrix()
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour:', error)
      }
    } else {
      // Sinon, créer une demande de changement
      setWorkflowAction({
        type: 'update',
        entry,
        data: entry
      })
      setEditingEntry(null)
      setShowWorkflowModal(true)
    }
  }

  async function deleteEntry(entryId: number) {
    const entry = matrix?.entries.find(e => e.id === entryId)
    if (!entry) return

    if (!confirm(t('confirmDeleteEntry'))) return

    // Si l'utilisateur est admin, supprimer directement
    if (permissions.isAdmin) {
      try {
        const res = await fetch(`/api/matrices/${matrixId}/entries/${entryId}`, {
          method: 'DELETE'
        })

        if (res.ok) {
          loadMatrix()
        }
      } catch (error) {
        console.error('Erreur lors de la suppression:', error)
      }
    } else {
      // Sinon, créer une demande de changement
      setWorkflowAction({
        type: 'delete',
        entry,
        data: entry
      })
      setShowWorkflowModal(true)
    }
  }

  async function handleAddEntry() {
    // Si l'utilisateur est admin, ajouter directement
    if (permissions.isAdmin) {
      await addEntry()
    } else {
      // Sinon, créer une demande de changement
      setWorkflowAction({
        type: 'create',
        data: newEntry
      })
      setShowAddEntry(false)
      setShowWorkflowModal(true)
    }
  }

  async function submitWorkflowRequest() {
    if (!workflowAction) return

    try {
      let description = ''
      let requestedData = workflowAction.data

      switch (workflowAction.type) {
        case 'create':
          description = `Demande de création d'une nouvelle règle: ${workflowAction.data?.rule_name}`
          break
        case 'update':
          description = `Demande de modification de la règle: ${workflowAction.entry?.rule_name}`
          break
        case 'delete':
          description = `Demande de suppression de la règle: ${workflowAction.entry?.rule_name}`
          requestedData = { rule_name: workflowAction.entry?.rule_name }
          break
      }

      const res = await fetch('/api/workflow/changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matrixId: matrixId.toString(),
          entryId: workflowAction.entry?.id?.toString(),
          requestType: `${workflowAction.type}_entry`,
          description,
          requestedData
        })
      })

      if (res.ok) {
        setShowWorkflowModal(false)
        setWorkflowAction(null)
        if (workflowAction.type === 'create') {
          setNewEntry({
            rule_name: '',
            src_zone: '',
            src_cidr: '',
            dst_zone: '',
            dst_cidr: '',
            dst_service: '',
            action: 'ALLOW'
          })
        }
      } else {
        console.error('Error submitting change request') // Keep as dev message
      }
    } catch (error) {
      console.error('Erreur lors de la soumission:', error)
    }
  }

  async function exportMatrix(format: 'csv' | 'json' | 'excel', includeMetadata = false) {
    try {
      const params = new URLSearchParams({
        format,
        includeMetadata: includeMetadata.toString()
      })
      
      const res = await fetch(`/api/matrices/${matrixId}/export?${params}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        
        // Determine file extension based on format
        let extension: string = format
        if (format === 'excel') extension = 'xlsx'
        
        a.download = `matrix-${matrix?.name}-${new Date().toISOString().split('T')[0]}.${extension}`
        a.click()
        window.URL.revokeObjectURL(url)
        setShowExportModal(false)
      }
    } catch (error) {
      console.error('Erreur export:', error)
    }
  }

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
            <Button variant="outline" onClick={() => setShowExportModal(true)}>
              {t('exportCSV')}
            </Button>
          )}
          {permissions.canEditMatrix && (
            <>
              <Button variant="outline" onClick={() => setShowImportCSV(true)}>
                {t('importFromCSV')}
              </Button>
              <Button onClick={() => setShowAddEntry(true)}>
                {t('newFlowEntry')}
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
        </Card>
        <Card>
          <div className="text-sm text-slate-500 dark:text-slate-400">Versions</div>
          <div className="text-2xl font-semibold">{matrix.versions.length}</div>
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

      {/* Permissions Info */}
      {matrix.permissions && matrix.permissions.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Permissions d&apos;accès</h2>
            <Badge variant={permissions.isMatrixOwner ? 'success' : permissions.isMatrixEditor ? 'warning' : 'default'}>
              {permissions.userMatrixRole || t('matrices:noAccess')}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {matrix.permissions.map((perm, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <div className="font-medium text-sm">{perm.user.fullName || perm.user.username}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">@{perm.user.username}</div>
                </div>
                <Badge variant={perm.role === 'owner' ? 'success' : perm.role === 'editor' ? 'warning' : 'default'}>
                  {perm.role}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Entries Table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Entrées de flux</h2>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {matrix.entries.length} entrée(s)
          </div>
        </div>

        {matrix.entries.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            {t('matrices:noFlowEntries')}
            {permissions.canEditMatrix && (
              <Button
                variant="ghost"
                onClick={() => setShowAddEntry(true)}
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
                {matrix.entries.map(entry => (
                  <TableRow key={entry.id}>
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
                            onClick={() => setEditingEntry(entry)}
                          >
                            Modifier
                          </Button>
                        )}
                        {permissions.canEditMatrix && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => deleteEntry(entry.id)}
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

      {/* Modal nouvelle entrée */}
      <Modal 
        isOpen={showAddEntry} 
        onClose={() => setShowAddEntry(false)}
        title={t('common:newFlowEntry')}
        className="max-w-2xl"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('common:csvRuleName')}</label>
            <Input
              value={newEntry.rule_name || ''}
              onChange={(e) => setNewEntry(prev => ({ ...prev, rule_name: e.target.value }))}
              placeholder="Ex: Allow_DMZ_to_LAN"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Équipement</label>
            <Input
              value={newEntry.device || ''}
              onChange={(e) => setNewEntry(prev => ({ ...prev, device: e.target.value }))}
              placeholder="Ex: FW-DMZ-01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Zone source</label>
            <Input
              value={newEntry.src_zone || ''}
              onChange={(e) => setNewEntry(prev => ({ ...prev, src_zone: e.target.value }))}
              placeholder="Ex: DMZ"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{t('common:csvSrcCidr')}</label>
            <Input
              value={newEntry.src_cidr || ''}
              onChange={(e) => setNewEntry(prev => ({ ...prev, src_cidr: e.target.value }))}
              placeholder="Ex: 192.168.1.0/24"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Zone destination</label>
            <Input
              value={newEntry.dst_zone || ''}
              onChange={(e) => setNewEntry(prev => ({ ...prev, dst_zone: e.target.value }))}
              placeholder="Ex: LAN"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{t('common:csvDstCidr')}</label>
            <Input
              value={newEntry.dst_cidr || ''}
              onChange={(e) => setNewEntry(prev => ({ ...prev, dst_cidr: e.target.value }))}
              placeholder="Ex: 10.0.0.0/8"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Service/Port</label>
            <Input
              value={newEntry.dst_service || ''}
              onChange={(e) => setNewEntry(prev => ({ ...prev, dst_service: e.target.value }))}
              placeholder="Ex: 80/tcp, 443/tcp"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Action</label>
            <select
              value={newEntry.action || 'ALLOW'}
              onChange={(e) => setNewEntry(prev => ({ ...prev, action: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALLOW">ALLOW</option>
              <option value="DENY">DENY</option>
              <option value="DROP">DROP</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Commentaire</label>
            <textarea
              value={newEntry.comment || ''}
              onChange={(e) => setNewEntry(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Commentaire optionnel..."
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-6">
          <Button
            onClick={handleAddEntry}
            disabled={!newEntry.rule_name?.trim()}
            className="flex-1"
          >
            {permissions.isAdmin ? t('matrices:createEntry') : t('matrices:submitRequest')}
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowAddEntry(false)}
            className="flex-1"
          >
            Annuler
          </Button>
        </div>
      </Modal>

      {/* Modal export */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title={t('common:exportMatrix')}
      >
        <ExportForm onExport={exportMatrix} />
      </Modal>

      {/* Modal import CSV */}
      <Modal
        isOpen={showImportCSV}
        onClose={() => setShowImportCSV(false)}
        title={t('common:importFile')}
      >
        <FileImportForm 
          matrixId={matrixId} 
          onSuccess={() => {
            setShowImportCSV(false)
            loadMatrix()
          }} 
        />
      </Modal>

      {/* Modal modification entrée */}
      <Modal
        isOpen={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        title="Modifier l'entrée de flux"
        className="max-w-2xl"
      >
        {editingEntry && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('common:csvRuleName')}</label>
              <Input
                value={editingEntry.rule_name || ''}
                onChange={(e) => setEditingEntry(prev => prev ? ({ ...prev, rule_name: e.target.value }) : null)}
                placeholder="Ex: Allow_DMZ_to_LAN"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Équipement</label>
              <Input
                value={editingEntry.device || ''}
                onChange={(e) => setEditingEntry(prev => prev ? ({ ...prev, device: e.target.value }) : null)}
                placeholder="Ex: FW-DMZ-01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Zone source</label>
              <Input
                value={editingEntry.src_zone || ''}
                onChange={(e) => setEditingEntry(prev => prev ? ({ ...prev, src_zone: e.target.value }) : null)}
                placeholder="Ex: DMZ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t('common:csvSrcCidr')}</label>
              <Input
                value={editingEntry.src_cidr || ''}
                onChange={(e) => setEditingEntry(prev => prev ? ({ ...prev, src_cidr: e.target.value }) : null)}
                placeholder="Ex: 192.168.1.0/24"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Zone destination</label>
              <Input
                value={editingEntry.dst_zone || ''}
                onChange={(e) => setEditingEntry(prev => prev ? ({ ...prev, dst_zone: e.target.value }) : null)}
                placeholder="Ex: LAN"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t('common:csvDstCidr')}</label>
              <Input
                value={editingEntry.dst_cidr || ''}
                onChange={(e) => setEditingEntry(prev => prev ? ({ ...prev, dst_cidr: e.target.value }) : null)}
                placeholder="Ex: 10.0.0.0/8"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Service/Port</label>
              <Input
                value={editingEntry.dst_service || ''}
                onChange={(e) => setEditingEntry(prev => prev ? ({ ...prev, dst_service: e.target.value }) : null)}
                placeholder="Ex: 80/tcp, 443/tcp"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Action</label>
              <select
                value={editingEntry.action || 'ALLOW'}
                onChange={(e) => setEditingEntry(prev => prev ? ({ ...prev, action: e.target.value }) : null)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALLOW">ALLOW</option>
                <option value="DENY">DENY</option>
                <option value="DROP">DROP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t('common:csvRuleStatus')}</label>
              <Input
                value={editingEntry.rule_status || ''}
                onChange={(e) => setEditingEntry(prev => prev ? ({ ...prev, rule_status: e.target.value }) : null)}
                placeholder="Ex: Active, Inactive"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Demandeur</label>
              <Input
                value={editingEntry.requester || ''}
                onChange={(e) => setEditingEntry(prev => prev ? ({ ...prev, requester: e.target.value }) : null)}
                placeholder="Ex: John Doe"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Commentaire</label>
              <textarea
                value={editingEntry.comment || ''}
                onChange={(e) => setEditingEntry(prev => prev ? ({ ...prev, comment: e.target.value }) : null)}
                placeholder="Commentaire optionnel..."
                rows={3}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-6">
          <Button
            onClick={() => editingEntry && updateEntry(editingEntry)}
            disabled={!editingEntry?.rule_name?.trim()}
            className="flex-1"
          >
            {t('common:save')}
          </Button>
          <Button
            variant="outline"
            onClick={() => setEditingEntry(null)}
            className="flex-1"
          >
            Annuler
          </Button>
        </div>
      </Modal>

      {/* Modal de demande de changement workflow */}
      <Modal
        isOpen={showWorkflowModal}
        onClose={() => setShowWorkflowModal(false)}
        title={t('common:changeRequest')}
        className="max-w-lg"
      >
        {workflowAction && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="font-medium text-blue-900">
                  {workflowAction.type === 'create' && 'Création d\'une nouvelle entrée'}
                  {workflowAction.type === 'update' && 'Modification d\'une entrée'}
                  {workflowAction.type === 'delete' && 'Suppression d\'une entrée'}
                </span>
              </div>
              <p className="text-sm text-blue-700">
                Votre demande sera soumise aux administrateurs pour approbation.
              </p>
            </div>

            {workflowAction.data && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Détails de la demande :</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Règle :</strong> {workflowAction.data.rule_name}</div>
                  {workflowAction.data.src_zone && (
                    <div><strong>Source :</strong> {workflowAction.data.src_zone} ({workflowAction.data.src_cidr})</div>
                  )}
                  {workflowAction.data.dst_zone && (
                    <div><strong>Destination :</strong> {workflowAction.data.dst_zone} ({workflowAction.data.dst_cidr})</div>
                  )}
                  {workflowAction.data.dst_service && (
                    <div><strong>Service :</strong> {workflowAction.data.dst_service}</div>
                  )}
                  {workflowAction.data.action && (
                    <div><strong>Action :</strong> {workflowAction.data.action}</div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={submitWorkflowRequest}
                className="flex-1"
              >
                Soumettre la demande
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowWorkflowModal(false)}
                className="flex-1"
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// Composant pour l'export avec sélection de format
function ExportForm({ onExport }: { onExport: (format: 'csv' | 'json' | 'excel', includeMetadata?: boolean) => void }) {
  const { t } = useTranslation(['common', 'matrices'])
  const [format, setFormat] = useState<'csv' | 'json' | 'excel'>('csv')
  const [includeMetadata, setIncludeMetadata] = useState(false)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">{t('exportFormat')}</label>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as 'csv' | 'json' | 'excel')}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="csv">CSV (Comma-Separated Values)</option>
          <option value="excel">XLSX (Microsoft Excel)</option>
          <option value="json">JSON (JavaScript Object Notation)</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="includeMetadata"
          checked={includeMetadata}
          onChange={(e) => setIncludeMetadata(e.target.checked)}
          className="w-4 h-4 text-blue-600"
        />
        <label htmlFor="includeMetadata" className="text-sm">
          {t('includeMetadata')}
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          onClick={() => onExport(format, includeMetadata)}
          className="flex-1"
        >
          Exporter {format.toUpperCase()}
        </Button>
        <Button variant="outline" onClick={() => {}} className="flex-1">
          {t('cancel')}
        </Button>
      </div>
    </div>
  )
}

// Composant pour l'import avec support multi-format
function FileImportForm({ matrixId, onSuccess }: { matrixId: number, onSuccess: () => void }) {
  const { t } = useTranslation(['common', 'matrices'])
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string>('')
  const [overwrite, setOverwrite] = useState(false)
  const [skipValidation, setSkipValidation] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: boolean
    imported: number
    errors: number
    total: number
    errorDetails?: Array<{
      row: number
      error: string
      data: Record<string, unknown>
    }>
  } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setImportResult(null)
    
    const supportedExtensions = ['.csv', '.xlsx', '.xls', '.json']
    const isValidFile = supportedExtensions.some(ext => 
      selectedFile?.name.toLowerCase().endsWith(ext)
    )
    
    if (selectedFile && isValidFile) {
      setFile(selectedFile)
      
      // Preview for text-based files (CSV, JSON)
      if (selectedFile.name.toLowerCase().endsWith('.csv') || selectedFile.name.toLowerCase().endsWith('.json')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const text = e.target?.result as string
          const lines = text.split('\n').slice(0, 5).join('\n')
          setPreview(lines)
        }
        reader.readAsText(selectedFile)
      } else {
        // For Excel files, show basic info
        setPreview(`Fichier Excel sélectionné: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`)
      }
    } else {
      console.error('Unsupported file format') // Keep as dev message
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setImportResult(null)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('overwrite', overwrite.toString())
    formData.append('skipValidation', skipValidation.toString())

    try {
      const res = await fetch(`/api/matrices/${matrixId}/import`, {
        method: 'POST',
        body: formData
      })

      const result = await res.json()

      if (res.ok && result.success) {
        setImportResult(result.data)
        if (result.data.errors === 0) {
          setTimeout(() => onSuccess(), 2000)
        }
      } else {
        setImportResult({
          success: false,
          imported: 0,
          errors: 1,
          total: 1,
          errorDetails: [{ row: 0, error: result.message || 'Erreur lors de l\'import', data: {} }]
        })
      }
    } catch (error) {
      console.error('Erreur upload:', error)
      setImportResult({
        success: false,
        imported: 0,
        errors: 1,
        total: 1,
        errorDetails: [{ row: 0, error: t('common:connectionError'), data: {} }]
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          {t('importFile')}
        </label>
        <input
          type="file"
          accept=".csv,.xlsx,.xls,.json"
          onChange={handleFileChange}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-50 file:text-slate-700 dark:text-slate-400"
        />
        <div className="text-xs text-slate-500 mt-1">
          {t('supportedFormats')}
        </div>
      </div>

      {preview && (
        <div>
          <label className="block text-sm font-medium mb-2">{t('matrices:preview')}</label>
          <pre className="bg-slate-50 p-3 rounded text-xs overflow-x-auto max-h-32">
            {preview}
          </pre>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="overwrite"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
            className="w-4 h-4 text-blue-600"
          />
          <label htmlFor="overwrite" className="text-sm">
            Remplacer les entrées existantes
          </label>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="skipValidation"
            checked={skipValidation}
            onChange={(e) => setSkipValidation(e.target.checked)}
            className="w-4 h-4 text-blue-600"
          />
          <label htmlFor="skipValidation" className="text-sm">
            Ignorer la validation (peut causer des erreurs)
          </label>
        </div>
      </div>

      {importResult && (
        <div className={`p-4 rounded-lg ${importResult.success && importResult.errors === 0 
          ? 'bg-green-50 border border-green-200' 
          : importResult.success 
            ? 'bg-yellow-50 border border-yellow-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-2 h-2 rounded-full ${importResult.success && importResult.errors === 0 
              ? 'bg-green-500' 
              : importResult.success 
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}></div>
            <span className="font-medium text-sm">
              {importResult.success && importResult.errors === 0 
                ? t('common:importSuccess')
                : importResult.success 
                  ? t('matrices:importWithErrors')
                  : 'Échec de l\'import'
              }
            </span>
          </div>
          
          <div className="text-sm space-y-1">
            <div>Total: {importResult.total} lignes</div>
            <div className="text-green-600">Importées: {importResult.imported}</div>
            {importResult.errors > 0 && (
              <div className="text-red-600">Erreurs: {importResult.errors}</div>
            )}
          </div>

          {importResult.errorDetails && importResult.errorDetails.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium mb-2">Détails des erreurs:</div>
              <div className="max-h-32 overflow-y-auto text-xs">
                {importResult.errorDetails.map((error, index) => (
                  <div key={index} className="mb-1 p-2 bg-white rounded border">
                    <div className="font-medium">Ligne {error.row}: {error.error}</div>
                    {error.data && Object.keys(error.data).length > 0 && (
                      <div className="text-gray-600 mt-1">
                        Données: {JSON.stringify(error.data, null, 2).substring(0, 100)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="flex-1"
        >
          {uploading ? <LoadingSpinner size="sm" /> : t('matrices:import')}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setFile(null)
            setPreview('')
            setImportResult(null)
          }}
          disabled={uploading}
        >
          Réinitialiser
        </Button>
      </div>
    </div>
  )
}
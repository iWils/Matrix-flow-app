'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { useGlobalPermissions } from '@/hooks/usePermissions'

type ChangeRequest = {
  id: number
  matrixId: number
  matrixName: string
  requestType: 'create' | 'update' | 'delete'
  status: 'pending' | 'approved' | 'rejected'
  requestedBy: {
    username: string
    fullName?: string
  }
  requestedAt: string
  reviewedBy?: {
    username: string
    fullName?: string
  }
  reviewedAt?: string
  description: string
  changes?: any
}

export default function WorkflowPage() {
  const { data: session } = useSession()
  const permissions = useGlobalPermissions()
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  useEffect(() => {
    loadChangeRequests()
  }, [])

  async function loadChangeRequests() {
    try {
      const res = await fetch('/api/workflow/changes')
      if (res.ok) {
        const response = await res.json()
        if (response.success && response.data) {
          setChangeRequests(response.data)
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des demandes:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleApproval(requestId: number, action: 'approve' | 'reject') {
    try {
      const res = await fetch(`/api/workflow/changes/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (res.ok) {
        loadChangeRequests()
      }
    } catch (error) {
      console.error('Erreur lors de la validation:', error)
    }
  }

  const filteredRequests = changeRequests.filter(request => {
    if (filter === 'all') return true
    return request.status === filter
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">En attente</Badge>
      case 'approved':
        return <Badge variant="success">Approuvé</Badge>
      case 'rejected':
        return <Badge variant="error">Rejeté</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  const getRequestTypeBadge = (type: string) => {
    switch (type) {
      case 'create':
        return <Badge variant="success">Création</Badge>
      case 'update':
        return <Badge variant="warning">Modification</Badge>
      case 'delete':
        return <Badge variant="error">Suppression</Badge>
      default:
        return <Badge variant="default">{type}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-slate-500">Chargement...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Workflow de changement</h1>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            onClick={() => setFilter('all')}
          >
            Toutes ({changeRequests.length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'primary' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            En attente ({changeRequests.filter(r => r.status === 'pending').length})
          </Button>
          <Button
            variant={filter === 'approved' ? 'primary' : 'outline'}
            onClick={() => setFilter('approved')}
          >
            Approuvées ({changeRequests.filter(r => r.status === 'approved').length})
          </Button>
          <Button
            variant={filter === 'rejected' ? 'primary' : 'outline'}
            onClick={() => setFilter('rejected')}
          >
            Rejetées ({changeRequests.filter(r => r.status === 'rejected').length})
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-sm text-slate-500">Total</div>
          <div className="text-2xl font-semibold">{changeRequests.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">En attente</div>
          <div className="text-2xl font-semibold text-orange-600">
            {changeRequests.filter(r => r.status === 'pending').length}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Approuvées</div>
          <div className="text-2xl font-semibold text-green-600">
            {changeRequests.filter(r => r.status === 'approved').length}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Rejetées</div>
          <div className="text-2xl font-semibold text-red-600">
            {changeRequests.filter(r => r.status === 'rejected').length}
          </div>
        </Card>
      </div>

      {/* Table des demandes */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Demandes de changement</h2>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            {filter === 'all' 
              ? 'Aucune demande de changement trouvée'
              : `Aucune demande ${filter === 'pending' ? 'en attente' : filter === 'approved' ? 'approuvée' : 'rejetée'}`
            }
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matrice</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Demandeur</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Réviseur</TableHead>
                  {permissions.isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map(request => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="font-medium">{request.matrixName}</div>
                      <div className="text-xs text-slate-500">ID: {request.matrixId}</div>
                    </TableCell>
                    <TableCell>
                      {getRequestTypeBadge(request.requestType)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={request.description}>
                        {request.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {request.requestedBy.fullName || request.requestedBy.username}
                      </div>
                      <div className="text-xs text-slate-500">
                        @{request.requestedBy.username}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(request.requestedAt).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(request.requestedAt).toLocaleTimeString('fr-FR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell>
                      {request.reviewedBy ? (
                        <div>
                          <div className="text-sm">
                            {request.reviewedBy.fullName || request.reviewedBy.username}
                          </div>
                          <div className="text-xs text-slate-500">
                            {request.reviewedAt && new Date(request.reviewedAt).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    {permissions.isAdmin && (
                      <TableCell>
                        {request.status === 'pending' ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleApproval(request.id, 'approve')}
                            >
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleApproval(request.id, 'reject')}
                            >
                              Rejeter
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">
                            {request.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                          </span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  )
}
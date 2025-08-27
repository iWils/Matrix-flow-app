'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslation } from 'react-i18next'
import { useLocalizedDate } from '@/lib/hooks/useLocalizedDate'
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
  changes?: Record<string, unknown>
}

export default function WorkflowPage() {
  const { t } = useTranslation(['common', 'workflow'])
  const { formatShortDate, formatTime } = useLocalizedDate()
  useSession() // Session used by permissions hook internally
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
        return <Badge variant="warning">{t('workflow:pending')}</Badge>
      case 'approved':
        return <Badge variant="success">{t('workflow:approved')}</Badge>
      case 'rejected':
        return <Badge variant="error">{t('workflow:rejected')}</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  const getRequestTypeBadge = (type: string) => {
    switch (type) {
      case 'create':
        return <Badge variant="success">{t('workflow:creation')}</Badge>
      case 'update':
        return <Badge variant="warning">{t('workflow:modification')}</Badge>
      case 'delete':
        return <Badge variant="error">{t('workflow:deletion')}</Badge>
      default:
        return <Badge variant="default">{type}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-slate-500 dark:text-slate-400">{t('common:loading')}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gradient mb-2">{t('workflow:title')}</h1>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            onClick={() => setFilter('all')}
          >
            {t('workflow:allRequests')} ({changeRequests.length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'primary' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            {t('workflow:pendingRequests')} ({changeRequests.filter(r => r.status === 'pending').length})
          </Button>
          <Button
            variant={filter === 'approved' ? 'primary' : 'outline'}
            onClick={() => setFilter('approved')}
          >
            {t('workflow:approvedRequests')} ({changeRequests.filter(r => r.status === 'approved').length})
          </Button>
          <Button
            variant={filter === 'rejected' ? 'primary' : 'outline'}
            onClick={() => setFilter('rejected')}
          >
            {t('workflow:rejectedRequests')} ({changeRequests.filter(r => r.status === 'rejected').length})
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-sm text-slate-500 dark:text-slate-400">{t('common:total')}</div>
          <div className="text-2xl font-semibold">{changeRequests.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500 dark:text-slate-400">{t('workflow:pending')}</div>
          <div className="text-2xl font-semibold text-orange-600">
            {changeRequests.filter(r => r.status === 'pending').length}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500 dark:text-slate-400">{t('workflow:approved')}</div>
          <div className="text-2xl font-semibold text-green-600">
            {changeRequests.filter(r => r.status === 'approved').length}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500 dark:text-slate-400">{t('workflow:rejected')}</div>
          <div className="text-2xl font-semibold text-red-600">
            {changeRequests.filter(r => r.status === 'rejected').length}
          </div>
        </Card>
      </div>

      {/* Table des demandes */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('workflow:changeRequests')}</h2>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            {filter === 'all' 
              ? t('workflow:noChangeRequests')
              : t(`workflow:no${filter.charAt(0).toUpperCase() + filter.slice(1)}Requests`)
            }
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('workflow:matrix')}</TableHead>
                  <TableHead>{t('workflow:type')}</TableHead>
                  <TableHead>{t('workflow:description')}</TableHead>
                  <TableHead>{t('workflow:requester')}</TableHead>
                  <TableHead>{t('workflow:date')}</TableHead>
                  <TableHead>{t('workflow:status')}</TableHead>
                  <TableHead>{t('workflow:reviewer')}</TableHead>
                  {permissions.isAdmin && <TableHead>{t('workflow:actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map(request => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="font-medium">{request.matrixName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">ID: {request.matrixId}</div>
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
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        @{request.requestedBy.username}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatShortDate(request.requestedAt)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatTime(request.requestedAt)}
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
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {request.reviewedAt && formatShortDate(request.reviewedAt)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-400">-</span>
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
                              {t('workflow:approve')}
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleApproval(request.id, 'reject')}
                            >
                              {t('workflow:reject')}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 dark:text-slate-400">
                            {request.status === 'approved' ? t('workflow:approved') : t('workflow:rejected')}
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
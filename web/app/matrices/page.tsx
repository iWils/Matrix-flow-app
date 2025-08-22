'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { useGlobalPermissions } from '@/hooks/usePermissions'

type Matrix = {
  id: number
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  owner?: {
    fullName?: string
    username: string
  }
  _count?: {
    entries: number
    versions: number
  }
  publishedVersion?: {
    version: number
    status: string
  }
}

export default function MatricesPage() {
  const { t } = useTranslation(['common', 'matrices'])
  useSession() // Session used by permissions hook internally
  const permissions = useGlobalPermissions()
  const [matrices, setMatrices] = useState<Matrix[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newMatrix, setNewMatrix] = useState({
    name: '',
    description: ''
  })

  useEffect(() => {
    loadMatrices()
  }, [])

  async function loadMatrices() {
    try {
      const res = await fetch('/api/matrices')
      if (res.ok) {
        const response = await res.json()
        if (response.success && response.data && response.data.matrices) {
          setMatrices(response.data.matrices)
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des matrices:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createMatrix() {
    if (!newMatrix.name.trim()) return

    try {
      const res = await fetch('/api/matrices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMatrix)
      })

      if (res.ok) {
        setNewMatrix({ name: '', description: '' })
        setShowCreateModal(false)
        loadMatrices()
      }
    } catch (error) {
      console.error('Erreur lors de la création:', error)
    }
  }

  async function deleteMatrix(id: number) {
    if (!confirm(t('confirmDelete'))) return

    try {
      const res = await fetch(`/api/matrices/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadMatrices()
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-slate-500 dark:text-slate-400">Chargement...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gradient mb-2">Matrices de flux</h1>
        {permissions.canCreateMatrix && (
          <Button onClick={() => setShowCreateModal(true)}>
            Nouvelle matrice
          </Button>
        )}
      </div>

      {matrices.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-slate-500 dark:text-slate-400 mb-4">{t('matrices:noMatricesFound')}</div>
          {permissions.canCreateMatrix && (
            <Button onClick={() => setShowCreateModal(true)}>
              Créer votre première matrice
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matrices.map(matrix => (
            <Card key={matrix.id} className="relative">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg mb-1">
                    <Link 
                      href={`/matrices/${matrix.id}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {matrix.name}
                    </Link>
                  </h3>
                  {matrix.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {matrix.description}
                    </p>
                  )}
                </div>
                {permissions.isAdmin && (
                  <button
                    onClick={() => deleteMatrix(matrix.id)}
                    className="text-slate-400 dark:text-slate-400 hover:text-red-500 text-sm p-1"
                    title={t('common:delete')}
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {matrix.publishedVersion ? (
                  <Badge variant="success">
                    v{matrix.publishedVersion.version}
                  </Badge>
                ) : (
                  <Badge variant="warning">Brouillon</Badge>
                )}
                
                {matrix._count && (
                  <>
                    <Badge variant="outline">
                      {matrix._count.entries} entrées
                    </Badge>
                    <Badge variant="outline">
                      {matrix._count.versions} versions
                    </Badge>
                  </>
                )}
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 border-t pt-3">
                <div>
                  {t('matrices:createdBy')} {matrix.owner?.fullName || matrix.owner?.username || t('matrices:unknown')}
                </div>
                <div>
                  Modifié {new Date(matrix.updatedAt).toLocaleDateString('fr-FR')}
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <Link
                  href={`/matrices/${matrix.id}`}
                  className="btn-outline flex-1 text-center"
                >
                  Ouvrir
                </Link>
                {permissions.isAuthenticated && (
                  <Link
                    href={`/matrices/${matrix.id}/export`}
                    className="btn-outline px-3"
                    title="Exporter CSV"
                  >
                    ↓
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        title={t('common:newMatrix')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Nom de la matrice *
            </label>
            <Input
              value={newMatrix.name}
              onChange={(e) => setNewMatrix(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Matrice Firewall DMZ"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={newMatrix.description}
              onChange={(e) => setNewMatrix(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description optionnelle..."
              rows={3}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={createMatrix}
              disabled={!newMatrix.name.trim()}
              className="flex-1"
            >
              Créer
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="flex-1"
            >
              Annuler
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
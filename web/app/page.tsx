'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

type DashboardStats = {
  totalMatrices: number
  totalEntries: number
  totalUsers: number
  recentActivity: Array<{
    id: number
    entity: string
    action: string
    at: string
    user: {
      username: string
      fullName?: string
    } | null
    changes: any
  }>
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const res = await fetch('/api/dashboard/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Tableau de bord</h1>
          <p className="text-slate-600">
            Bienvenue, {session?.user?.name || session?.user?.email}
          </p>
        </div>
        <div className="text-sm text-slate-500">
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <div className="text-slate-500 text-sm">Matrices</div>
              <div className="text-2xl font-semibold">{stats?.totalMatrices || 0}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <div className="text-slate-500 text-sm">Entrées de flux</div>
              <div className="text-2xl font-semibold">{stats?.totalEntries || 0}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <div className="text-slate-500 text-sm">Utilisateurs</div>
              <div className="text-2xl font-semibold">{stats?.totalUsers || 0}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="ml-4">
              <div className="text-slate-500 text-sm">Sécurité RBAC</div>
              <div className="text-lg font-semibold">Actif</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
          <div className="space-y-3">
            <Link 
              href="/matrices?action=new" 
              className="block p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="font-medium">Créer une matrice</div>
              <div className="text-sm text-slate-600">Nouvelle matrice de flux réseau</div>
            </Link>
            
            {session?.user?.role === 'admin' && (
              <Link 
                href="/users?action=new" 
                className="block p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="font-medium">Ajouter un utilisateur</div>
                <div className="text-sm text-slate-600">Créer un nouveau compte</div>
              </Link>
            )}
            
            <Link 
              href="/matrices" 
              className="block p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="font-medium">Parcourir les matrices</div>
              <div className="text-sm text-slate-600">Voir toutes les matrices</div>
            </Link>
          </div>
        </Card>

        {/* Features Overview */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Fonctionnalités</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="success">✓</Badge>
              <div>
                <div className="font-medium">Contrôle d'accès (RBAC)</div>
                <div className="text-sm text-slate-600">Permissions par matrice</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="success">✓</Badge>
              <div>
                <div className="font-medium">Import/Export CSV</div>
                <div className="text-sm text-slate-600">Gestion des données en masse</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="success">✓</Badge>
              <div>
                <div className="font-medium">Versioning & Audit</div>
                <div className="text-sm text-slate-600">Suivi des modifications</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="success">✓</Badge>
              <div>
                <div className="font-medium">Workflow d'approbation</div>
                <div className="text-sm text-slate-600">Validation des changements</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Activité récente</h2>
          <div className="space-y-3">
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.slice(0, 5).map(activity => (
                <div key={activity.id} className="flex items-start gap-3 text-sm">
                  <Badge 
                    variant={
                      activity.action === 'create' ? 'success' : 
                      activity.action === 'delete' ? 'error' : 'default'
                    }
                  >
                    {activity.action === 'create' ? '+' : 
                     activity.action === 'delete' ? '×' : '↻'}
                  </Badge>
                  <div className="flex-1">
                    <div>
                      <span className="font-medium">
                        {activity.user?.fullName || activity.user?.username || 'Système'}
                      </span>
                      {' '}
                      {activity.action === 'create' && 'a créé'}
                      {activity.action === 'update' && 'a modifié'}
                      {activity.action === 'delete' && 'a supprimé'}
                      {' '}
                      <span className="text-slate-600">
                        {activity.entity === 'Matrix' && 'une matrice'}
                        {activity.entity === 'FlowEntry' && 'une entrée'}
                        {activity.entity === 'User' && 'un utilisateur'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(activity.at).toLocaleString('fr-FR')}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500 text-center py-4">
                Aucune activité récente
              </div>
            )}
          </div>
          
          {session?.user?.role === 'admin' && (
            <div className="mt-4 pt-4 border-t">
              <Link 
                href="/admin/audit" 
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Voir tous les logs d'audit →
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Help & Documentation */}
      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-1">Besoin d'aide ?</h2>
            <p className="text-slate-600 text-sm">
              Consultez la documentation ou contactez l'équipe support
            </p>
          </div>
          <div className="flex gap-3">
            <button className="btn-outline">
              Documentation
            </button>
            <button className="btn-outline">
              Support
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
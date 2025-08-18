'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'

type UserGroup = {
  id: number
  name: string
  description: string
  permissions: any
  isActive: boolean
  memberCount: number
  createdAt: string
}

type RolePermission = {
  resource: string
  actions: string[]
}

export default function RBACPage() {
  const { data: session } = useSession()
  const [userGroups, setUserGroups] = useState<UserGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showEditGroup, setShowEditGroup] = useState<UserGroup | null>(null)
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    permissions: {}
  })

  const availablePermissions: RolePermission[] = [
    {
      resource: 'matrices',
      actions: ['create', 'read', 'update', 'delete', 'manage_permissions']
    },
    {
      resource: 'users',
      actions: ['create', 'read', 'update', 'delete', 'manage_roles']
    },
    {
      resource: 'audit',
      actions: ['read', 'export', 'configure']
    },
    {
      resource: 'system',
      actions: ['read', 'configure', 'backup', 'restore']
    }
  ]

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      loadUserGroups()
    }
  }, [session])

  async function loadUserGroups() {
    try {
      const res = await fetch('/api/admin/rbac/groups')
      if (res.ok) {
        const response = await res.json()
        if (response.success && response.data) {
          setUserGroups(response.data)
        }
      }
    } catch (error) {
      console.error('Error loading user groups:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createGroup() {
    try {
      const res = await fetch('/api/admin/rbac/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup)
      })
      
      if (res.ok) {
        setShowCreateGroup(false)
        setNewGroup({ name: '', description: '', permissions: {} })
        loadUserGroups()
      }
    } catch (error) {
      console.error('Error creating group:', error)
    }
  }

  async function updateGroup(group: UserGroup) {
    try {
      const res = await fetch(`/api/admin/rbac/groups/${group.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: group.name,
          description: group.description,
          permissions: group.permissions,
          isActive: group.isActive
        })
      })
      
      if (res.ok) {
        setShowEditGroup(null)
        loadUserGroups()
      }
    } catch (error) {
      console.error('Error updating group:', error)
    }
  }

  async function deleteGroup(groupId: number) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce groupe ?')) return
    
    try {
      const res = await fetch(`/api/admin/rbac/groups/${groupId}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        loadUserGroups()
      }
    } catch (error) {
      console.error('Error deleting group:', error)
    }
  }

  function handlePermissionChange(resource: string, action: string, checked: boolean) {
    const permissions = { ...newGroup.permissions } as Record<string, string[]>
    if (!permissions[resource]) {
      permissions[resource] = []
    }
    
    if (checked) {
      if (!permissions[resource].includes(action)) {
        permissions[resource].push(action)
      }
    } else {
      permissions[resource] = permissions[resource].filter((a: string) => a !== action)
      if (permissions[resource].length === 0) {
        delete permissions[resource]
      }
    }
    
    setNewGroup({ ...newGroup, permissions })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Vérification des permissions admin
  if (!session?.user || session.user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Accès refusé
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            Vous devez avoir le rôle administrateur pour accéder à cette page.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Rôle actuel: {session?.user?.role || 'Non connecté'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Gestion RBAC</h1>
          <p className="text-slate-600 dark:text-slate-300">
            Configuration des rôles et permissions utilisateur
          </p>
        </div>
        <Button onClick={() => setShowCreateGroup(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Créer un groupe
        </Button>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {userGroups.map(group => (
          <Card key={group.id}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{group.name}</h3>
                    <Badge variant={group.isActive ? 'success' : 'error'}>
                      {group.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{group.description}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {group.memberCount} membre{group.memberCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEditGroup(group)}
                    className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteGroup(group.id)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200">Permissions</h4>
                <div className="space-y-2">
                  {Object.entries(group.permissions || {}).map(([resource, actions]) => (
                    <div key={resource} className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 capitalize">{resource}</span>
                      <div className="flex gap-1">
                        {(actions as string[]).map(action => (
                          <Badge key={action} variant="default" className="text-xs">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                  {Object.keys(group.permissions || {}).length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">Aucune permission définie</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Group Modal */}
      <Modal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        title="Créer un nouveau groupe"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Nom du groupe
            </label>
            <Input
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              placeholder="Ex: Éditeurs de matrices"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Description
            </label>
            <Input
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              placeholder="Description du rôle de ce groupe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">
              Permissions
            </label>
            <div className="space-y-4">
              {availablePermissions.map(perm => (
                <div key={perm.resource} className="border border-slate-600 rounded-lg p-3">
                  <h4 className="font-medium text-slate-900 dark:text-white mb-2 capitalize">{perm.resource}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {perm.actions.map(action => (
                      <label key={action} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={(newGroup.permissions as Record<string, string[]>)[perm.resource]?.includes(action) || false}
                          onChange={(e) => handlePermissionChange(perm.resource, action, e.target.checked)}
                          className="rounded border-slate-600 bg-slate-700"
                        />
                        {action}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateGroup(false)}>
              Annuler
            </Button>
            <Button onClick={createGroup} disabled={!newGroup.name.trim()}>
              Créer le groupe
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Group Modal */}
      {showEditGroup && (
        <Modal
          isOpen={!!showEditGroup}
          onClose={() => setShowEditGroup(null)}
          title={`Modifier le groupe: ${showEditGroup.name}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Nom du groupe
              </label>
              <Input
                value={showEditGroup.name}
                onChange={(e) => setShowEditGroup({ ...showEditGroup, name: e.target.value })}
                placeholder="Ex: Éditeurs de matrices"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Description
              </label>
              <Input
                value={showEditGroup.description}
                onChange={(e) => setShowEditGroup({ ...showEditGroup, description: e.target.value })}
                placeholder="Description du rôle de ce groupe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Statut
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={showEditGroup.isActive}
                  onChange={(e) => setShowEditGroup({ ...showEditGroup, isActive: e.target.checked })}
                  className="rounded border-slate-300 dark:border-slate-600"
                />
                Groupe actif
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">
                Permissions
              </label>
              <div className="space-y-4">
                {availablePermissions.map(perm => (
                  <div key={perm.resource} className="border border-slate-300 dark:border-slate-600 rounded-lg p-3">
                    <h4 className="font-medium text-slate-900 dark:text-white mb-2 capitalize">{perm.resource}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {perm.actions.map(action => (
                        <label key={action} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={(showEditGroup.permissions as Record<string, string[]>)[perm.resource]?.includes(action) || false}
                            onChange={(e) => {
                              const permissions = { ...showEditGroup.permissions } as Record<string, string[]>
                              if (!permissions[perm.resource]) {
                                permissions[perm.resource] = []
                              }
                              
                              if (e.target.checked) {
                                if (!permissions[perm.resource].includes(action)) {
                                  permissions[perm.resource].push(action)
                                }
                              } else {
                                permissions[perm.resource] = permissions[perm.resource].filter((a: string) => a !== action)
                                if (permissions[perm.resource].length === 0) {
                                  delete permissions[perm.resource]
                                }
                              }
                              
                              setShowEditGroup({ ...showEditGroup, permissions })
                            }}
                            className="rounded border-slate-300 dark:border-slate-600"
                          />
                          {action}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowEditGroup(null)}>
                Annuler
              </Button>
              <Button onClick={() => updateGroup(showEditGroup)} disabled={!showEditGroup.name.trim()}>
                Sauvegarder
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
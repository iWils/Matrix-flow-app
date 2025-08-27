'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useLocalizedDate } from '@/lib/hooks/useLocalizedDate'
import { ResetPasswordModal } from '@/components/ui/ResetPasswordModal'
import { ToggleUserStatusModal } from '@/components/ui/ToggleUserStatusModal'
import { ManageGroupsModal } from '@/components/ui/ManageGroupsModal'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useGlobalPermissions } from '@/hooks/usePermissions'
import { Avatar } from '@/components/ui/Avatar'

import { User, UserGroupData } from '@/types'

export default function AdminUsersPage(){
  const { t } = useTranslation(['common', 'admin'])
  const { formatDateTime } = useLocalizedDate()
  const { data: session } = useSession()
  const router = useRouter()
  const permissions = useGlobalPermissions()
  const [users, setUsers] = useState<User[]>([])
  const [availableGroups, setAvailableGroups] = useState<UserGroupData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin'|'user'|'viewer'>('viewer')
  const [selectedGroups, setSelectedGroups] = useState<number[]>([])
  
  // Modals state
  const [resetPasswordModal, setResetPasswordModal] = useState<{ isOpen: boolean; user: User | null }>({
    isOpen: false,
    user: null
  })
  const [toggleStatusModal, setToggleStatusModal] = useState<{ isOpen: boolean; user: User | null }>({
    isOpen: false,
    user: null
  })
  const [showManageGroups, setShowManageGroups] = useState<User | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const response = await res.json()
        if (response.success && response.data && response.data.users) {
          setUsers(response.data.users)
        }
        setError('')
      } else if (res.status === 401) {
        setError(t('accessDenied'))
      } else {
        setError(t('errorLoadingUsers'))
      }
    } catch {
      setError(t('connectionError'))
    } finally {
      setLoading(false)
    }
  }, [t, setUsers, setError, setLoading])

  async function loadAvailableGroups() {
    try {
      const res = await fetch('/api/admin/rbac/groups')
      if (res.ok) {
        const response = await res.json()
        if (response.success && response.data) {
          const groups = Array.isArray(response.data) ? response.data : response.data.groups || []
          setAvailableGroups(groups.filter((group: UserGroupData) => group.isActive))
        }
      }
    } catch (error) {
      console.error('Error loading groups:', error)
    }
  }

  async function assignUserToGroup(userId: number, groupId: number) {
    try {
      const res = await fetch(`/api/users/${userId}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId })
      })
      
      if (res.ok) {
        load() // Recharger pour voir les changements
      }
    } catch (error) {
      console.error('Error assigning user to group:', error)
    }
  }

  // Unused function - commented out to fix linting
  // async function removeUserFromGroup(userId: number, groupId: number) {
  //   try {
  //     const res = await fetch(`/api/users/${userId}/groups?groupId=${groupId}`, {
  //       method: 'DELETE'
  //     })
  //     
  //     if (res.ok) {
  //       load() // Recharger pour voir les changements
  //     }
  //   } catch (error) {
  //     console.error('Error removing user from group:', error)
  //     }
  // }

  useEffect(() => {
    if (session === null) {
      return
    }
    if (!permissions.isAuthenticated) {
      router.push('/login')
      return
    }
    if (!permissions.canManageUsers) {
      setError(t('accessDenied'))
      setLoading(false)
      return
    }
    load()
    loadAvailableGroups()
  }, [session, permissions.isAuthenticated, permissions.canManageUsers, router, load, t])

  async function create(){
    if (!permissions.canManageUsers) return
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ username, email, fullName, password, role })
      })
      if(res.ok){
        const newUser = await res.json()
        
        // Assigner les groupes sélectionnés
        for (const groupId of selectedGroups) {
          await assignUserToGroup(newUser.id, groupId)
        }
        
        setUsername('');
        setEmail('');
        setFullName('');
        setPassword('');
        setRole('viewer');
        setSelectedGroups([]);
        load()
      } else {
        setError(t('errorCreatingUser'))
      }
    } catch {
      setError(t('admin:errorCreatingUser'))
    }
  }



  const openResetPasswordModal = (user: User) => {
    setResetPasswordModal({ isOpen: true, user })
  }

  const openToggleStatusModal = (user: User) => {
    setToggleStatusModal({ isOpen: true, user })
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
      <div className="animate-fade-in">
        <Alert variant="error">
          {error}
          {!permissions.canManageUsers && (
            <Button
              variant="outline"
              className="ml-4"
              onClick={() => router.push('/')}
            >
              Retour au dashboard
            </Button>
          )}
        </Alert>
      </div>
    )
  }

  if (!permissions.canManageUsers) {
    return (
      <div className="animate-fade-in">
        <Alert variant="error">
          {t('admin:accessDeniedAdmin')}
          <Button
            variant="outline"
            className="ml-4"
            onClick={() => router.push('/')}
          >
            Retour au dashboard
          </Button>
        </Alert>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gradient mb-2">{t('userManagement')}</h1>
          <p className="text-slate-600 dark:text-slate-300">
            {t('manageUserAccountsDescription', { count: users.length })}
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {t('newUser')}
        </button>
      </div>

      {/* Create User Form */}
      {permissions.canManageUsers && (
        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('createNewUser')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <input 
                value={username} 
                onChange={e=>setUsername(e.target.value)} 
                placeholder={t('username')}
                className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
              <input 
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
                placeholder={t('optionalEmail')} 
                className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
              <input 
                value={fullName} 
                onChange={e=>setFullName(e.target.value)} 
                placeholder={t('fullName')} 
                className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
              <input 
                type="password" 
                value={password} 
                onChange={e=>setPassword(e.target.value)} 
                placeholder={t('password')} 
                className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
              <select 
                value={role} 
                onChange={e=>setRole(e.target.value as 'admin'|'user'|'viewer')}
                className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="admin">{t('administrator')}</option>
                <option value="user">{t('user')}</option>
                <option value="viewer">{t('viewer')}</option>
              </select>
              
              {/* Sélection des groupes */}
              <div className="col-span-full">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('optionalGroups')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableGroups.map(group => (
                    <label key={group.id} className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm">
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(group.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGroups([...selectedGroups, group.id])
                          } else {
                            setSelectedGroups(selectedGroups.filter(id => id !== group.id))
                          }
                        }}
                        className="rounded border-slate-300 dark:border-slate-600"
                      />
                      <span className="text-slate-700 dark:text-slate-300">{group.name}</span>
                    </label>
                  ))}
                  {availableGroups.length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                      {t('noGroupAvailable')}
                    </p>
                  )}
                </div>
              </div>
              
              <Button onClick={create} className="bg-blue-600 hover:bg-blue-700 text-white">
                {t('create')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Users Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {users.map(user => (
          <Card key={user.id}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar 
                    email={user.email} 
                    name={user.fullName || user.username} 
                    size={48} 
                    showTooltip={true}
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{user.fullName || user.username}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">@{user.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={user.isActive ? 'success' : 'error'}>
                    {user.isActive ? t('common:active') : t('common:inactive')}
                  </Badge>
                  <Badge variant={user.role === 'admin' ? 'warning' : 'default'}>
                    {user.role === 'admin' ? t('common:administrator') : user.role === 'user' ? t('common:user') : t('common:viewer')}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                  {user.email || t('admin:noEmailProvided')}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0l-1 12a2 2 0 002 2h6a2 2 0 002-2L16 7" />
                  </svg>
                  {t('admin:createdOn')}: {formatDateTime(user.createdAt)}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('admin:lastPasswordChange')}: {user.lastPasswordChange ? formatDateTime(user.lastPasswordChange) : t('admin:notDefined')}
                </div>
                
                {/* Groupes assignés */}
                {user.groupMemberships && user.groupMemberships.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {t('admin:groups')}: {user.groupMemberships.map(gm => gm.group.name).join(', ')}
                  </div>
                )}
              </div>

              {permissions.canManageUsers && (
                <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openResetPasswordModal(user)}
                    className="flex-1 text-xs"
                  >
                    {t('admin:resetPassword')}
                  </Button>
                  <Button
                    size="sm"
                    variant={user.isActive ? "danger" : "primary"}
                    onClick={() => openToggleStatusModal(user)}
                    className="flex-1 text-xs"
                  >
                    {user.isActive ? t('common:deactivateCapital') : t('common:activateCapital')}
                  </Button>
                  <button
                    onClick={() => setShowManageGroups(user)}
                    className="px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                    title={t('common:manageGroups')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {users.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">{t('admin:noUsers')}</h3>
          <p className="text-slate-500 dark:text-slate-400">{t('admin:startByCreatingFirstUser')}</p>
        </div>
      )}

      {/* Stats Summary */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t('admin:totalUsers')}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{users.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t('common:activeUsers')}</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{users.filter(u => u.isActive).length}</p>
              </div>
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t('admin:administrators')}</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{users.filter(u => u.role === 'admin').length}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t('admin:inactive')}</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{users.filter(u => !u.isActive).length}</p>
              </div>
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Modals */}
      {resetPasswordModal.user && (
        <ResetPasswordModal
          isOpen={resetPasswordModal.isOpen}
          onClose={() => setResetPasswordModal({ isOpen: false, user: null })}
          user={resetPasswordModal.user}
          onSuccess={load}
        />
      )}

      {toggleStatusModal.user && (
        <ToggleUserStatusModal
          isOpen={toggleStatusModal.isOpen}
          onClose={() => setToggleStatusModal({ isOpen: false, user: null })}
          user={toggleStatusModal.user}
          onSuccess={load}
        />
      )}

      {showManageGroups && (
        <ManageGroupsModal
          isOpen={!!showManageGroups}
          onClose={() => setShowManageGroups(null)}
          user={showManageGroups}
          onSuccess={load}
        />
      )}
    </div>
  )
}
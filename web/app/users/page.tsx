
'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ResetPasswordModal } from '@/components/ui/ResetPasswordModal'
import { ToggleUserStatusModal } from '@/components/ui/ToggleUserStatusModal'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useGlobalPermissions } from '@/hooks/usePermissions'

type User = {
  id: number
  username: string
  email?: string
  fullName?: string
  role: 'admin'|'user'|'viewer'
  isActive: boolean
  createdAt: string
  lastPasswordChange: string
}

export default function Users(){
  const { data: session } = useSession()
  const router = useRouter()
  const permissions = useGlobalPermissions()
  const [items, setItems] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin'|'user'|'viewer'>('viewer')
  
  // Modals state
  const [resetPasswordModal, setResetPasswordModal] = useState<{ isOpen: boolean; user: User | null }>({
    isOpen: false,
    user: null
  })
  const [toggleStatusModal, setToggleStatusModal] = useState<{ isOpen: boolean; user: User | null }>({
    isOpen: false,
    user: null
  })

  async function load(){
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const response = await res.json()
        if (response.success && response.data) {
          setItems(response.data)
        }
        setError('')
      } else if (res.status === 401) {
        setError('Accès non autorisé. Seuls les administrateurs peuvent voir cette page.')
      } else {
        setError('Erreur lors du chargement des utilisateurs')
      }
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session === null) {
      // Session non chargée encore
      return
    }
    if (!permissions.isAuthenticated) {
      router.push('/login')
      return
    }
    if (!permissions.canManageUsers) {
      setError('Accès refusé. Seuls les administrateurs peuvent accéder à cette page.')
      setLoading(false)
      return
    }
    load()
  }, [session, permissions, router])

  async function create(){
    if (!permissions.canManageUsers) return
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ username, email, fullName, password, role })
      })
      if(res.ok){
        setUsername('');
        setEmail('');
        setFullName('');
        setPassword('');
        setRole('viewer');
        load()
      } else {
        setError('Erreur lors de la création de l\'utilisateur')
      }
    } catch (err) {
      setError('Erreur lors de la création de l\'utilisateur')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
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
      <Alert variant="error">
        {error}
        {!permissions.canManageUsers && (
          <Button
            variant="outline"
            className="ml-4"
            onClick={() => router.push('/')}
          >
            Retour à l'accueil
          </Button>
        )}
      </Alert>
    )
  }

  if (!permissions.canManageUsers) {
    return (
      <Alert variant="error">
        Accès refusé. Seuls les administrateurs peuvent accéder à cette page.
        <Button
          variant="outline"
          className="ml-4"
          onClick={() => router.push('/')}
        >
          Retour à l'accueil
        </Button>
      </Alert>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Gestion des utilisateurs</h1>
        <div className="text-sm text-slate-500">
          {items.length} utilisateur(s)
        </div>
      </div>
      
      {permissions.canManageUsers && (
        <div className="card mb-6">
          <h2 className="text-lg font-medium mb-4">Créer un nouvel utilisateur</h2>
          <div className="grid md:grid-cols-6 gap-2">
            <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Nom d'utilisateur" className="input" />
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email (optionnel)" className="input" />
            <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Nom complet" className="input" />
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" className="input" />
            <select value={role} onChange={e=>setRole(e.target.value as any)} className="input">
              <option value="admin">Administrateur</option><option value="user">Utilisateur</option><option value="viewer">Visionneur</option>
            </select>
            <button onClick={create} className="btn">Créer</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2">Utilisateur</th>
                <th>Email</th>
                <th>Nom</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Créé le</th>
                <th>Dernier changement MDP</th>
                {permissions.canManageUsers && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map(u => (
                <tr key={u.id} className="border-t">
                  <td className="py-2 font-mono">{u.username}</td>
                  <td>{u.email || '-'}</td>
                  <td>{u.fullName || '-'}</td>
                  <td>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      u.role === 'admin' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                      u.role === 'user' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                      'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                    }`}>
                      {u.role === 'admin' ? 'Administrateur' :
                       u.role === 'user' ? 'Utilisateur' : 'Visionneur'}
                    </span>
                  </td>
                  <td>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      u.isActive ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                    }`}>
                      {u.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="text-xs text-gray-500 dark:text-gray-400">{formatDate(u.createdAt)}</td>
                  <td className="text-xs text-gray-500 dark:text-gray-400">{formatDate(u.lastPasswordChange)}</td>
                  {permissions.canManageUsers && (
                    <td>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openResetPasswordModal(u)}
                          className="text-xs"
                        >
                          Réinitialiser MDP
                        </Button>
                        <Button
                          size="sm"
                          variant={u.isActive ? "danger" : "primary"}
                          onClick={() => openToggleStatusModal(u)}
                          className="text-xs"
                        >
                          {u.isActive ? 'Désactiver' : 'Activer'}
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    </div>
  )
}

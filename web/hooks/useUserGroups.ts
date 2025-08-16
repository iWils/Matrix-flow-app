import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

type UserGroup = {
  id: number
  name: string
  description: string | null
  permissions: Record<string, string[]>
  isActive: boolean
}

export function useUserGroups() {
  const { data: session } = useSession()
  const [userGroups, setUserGroups] = useState<UserGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id) {
      loadUserGroups()
    } else {
      setUserGroups([])
      setLoading(false)
    }
  }, [session?.user?.id])

  async function loadUserGroups() {
    if (!session?.user?.id) return

    try {
      const res = await fetch(`/api/users/${session.user.id}/groups`)
      if (res.ok) {
        const groups = await res.json()
        setUserGroups(groups)
      }
    } catch (error) {
      console.error('Error loading user groups:', error)
      setUserGroups([])
    } finally {
      setLoading(false)
    }
  }

  // Calculer les permissions combinées de tous les groupes
  const combinedPermissions = userGroups.reduce((acc, group) => {
    if (!group.isActive) return acc

    Object.entries(group.permissions).forEach(([resource, actions]) => {
      if (!acc[resource]) {
        acc[resource] = new Set<string>()
      }
      actions.forEach(action => acc[resource].add(action))
    })

    return acc
  }, {} as Record<string, Set<string>>)

  // Convertir les Sets en arrays pour faciliter l'utilisation
  const permissions = Object.entries(combinedPermissions).reduce((acc, [resource, actionsSet]) => {
    acc[resource] = Array.from(actionsSet)
    return acc
  }, {} as Record<string, string[]>)

  return {
    userGroups,
    loading,
    permissions,
    hasPermission: (resource: string, action: string) => {
      return permissions[resource]?.includes(action) || false
    },
    hasAnyPermission: (resource: string, actions: string[]) => {
      return actions.some(action => permissions[resource]?.includes(action))
    },
    reload: loadUserGroups
  }
}
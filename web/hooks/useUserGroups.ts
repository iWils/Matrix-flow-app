import { useSession } from 'next-auth/react'
import { useState, useEffect, useMemo } from 'react'
import { UserGroupData, GroupPermissions } from '@/types'

export function useUserGroups() {
  const { data: session } = useSession()
  const [userGroups, setUserGroups] = useState<UserGroupData[]>([])
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

  // Calculer les permissions combinées de tous les groupes avec useMemo pour éviter les re-calculs
  const { permissions, hasPermission, hasAnyPermission } = useMemo(() => {
    const combinedPermissions = userGroups.reduce((acc: Record<string, Set<string>>, group: UserGroupData) => {
      if (!group.isActive) return acc

      Object.entries(group.permissions).forEach(([resource, actions]) => {
        if (!acc[resource]) {
          acc[resource] = new Set<string>()
        }
        if (Array.isArray(actions)) {
          actions.forEach((action: string) => acc[resource].add(action))
        }
      })

      return acc
    }, {} as Record<string, Set<string>>)

    // Convertir les Sets en arrays pour faciliter l'utilisation
    const permissions: GroupPermissions = {}
    Object.entries(combinedPermissions).forEach(([resource, actionsSet]) => {
      permissions[resource] = Array.from(actionsSet as Set<string>)
    })

    return {
      permissions,
      hasPermission: (resource: string, action: string) => {
        return permissions[resource]?.includes(action) || false
      },
      hasAnyPermission: (resource: string, actions: string[]) => {
        return actions.some(action => permissions[resource]?.includes(action))
      }
    }
  }, [userGroups])

  return {
    userGroups,
    loading,
    permissions,
    hasPermission,
    hasAnyPermission,
    reload: loadUserGroups
  }
}
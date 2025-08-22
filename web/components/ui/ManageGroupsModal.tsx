'use client'
import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { User, UserGroupData } from '@/types'

interface ManageGroupsModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
  onSuccess: () => void
}

export function ManageGroupsModal({ isOpen, onClose, user, onSuccess }: ManageGroupsModalProps) {
  const { t } = useTranslation('common')
  const [availableGroups, setAvailableGroups] = useState<UserGroupData[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && user) {
      loadAvailableGroups()
    }
  }, [isOpen, user])

  async function loadAvailableGroups() {
    try {
      const res = await fetch('/api/admin/rbac/groups')
      if (res.ok) {
        const response = await res.json()
        if (response.success && response.data) {
          setAvailableGroups(response.data.filter((group: UserGroupData) => group.isActive))
        }
      }
    } catch (error) {
      console.error('Error loading groups:', error)
    }
  }

  async function assignUserToGroup(groupId: number) {
    if (!user) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${user.id}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId })
      })
      
      if (res.ok) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error assigning user to group:', error)
    } finally {
      setLoading(false)
    }
  }

  async function removeUserFromGroup(groupId: number) {
    if (!user) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${user.id}/groups?groupId=${groupId}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error removing user from group:', error)
    } finally {
      setLoading(false)
    }
  }

  const isUserInGroup = (groupId: number) => {
    return user?.groupMemberships?.some(gm => gm.group.id === groupId) || false
  }

  if (!user) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('manageGroups')} - ${user.fullName || user.username}`}
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            {t('availableGroups')}
          </h3>
          
          {availableGroups.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">
              {t('noGroupDefined')}
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableGroups.map(group => (
                <div key={group.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-slate-900 dark:text-white">{group.name}</h4>
                      {isUserInGroup(group.id) && (
                        <Badge variant="success" className="text-xs">{t('assigned')}</Badge>
                      )}
                    </div>
                    {group.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300">{group.description}</p>
                    )}
                  </div>
                  <div className="ml-4">
                    {isUserInGroup(group.id) ? (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => removeUserFromGroup(group.id)}
                        disabled={loading}
                      >
                        {t('remove')}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => assignUserToGroup(group.id)}
                        disabled={loading}
                      >
                        {t('assign')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            {t('close')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
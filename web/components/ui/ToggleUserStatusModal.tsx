'use client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from './Modal'
import { Button } from './Button'
import { User } from '@/types'

interface ToggleUserStatusModalProps {
  isOpen: boolean
  onClose: () => void
  user: User
  onSuccess: () => void
}

export function ToggleUserStatusModal({ isOpen, onClose, user, onSuccess }: ToggleUserStatusModalProps) {
  const { t } = useTranslation('common')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const newStatus = !user.isActive
  const actionText = newStatus ? t('activate') : t('deactivate')
  const actionTextCapitalized = newStatus ? t('activateCapital') : t('deactivateCapital')

  const handleSubmit = async () => {
    setError('')
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/users/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          isActive: newStatus
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText)
      }

      onSuccess()
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : t('errorModifyingStatus'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setError('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`${actionTextCapitalized} ${t('theUser')}`}>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('confirmUserAction', { action: actionText, username: user.fullName || user.username })}
          </p>
          {!newStatus && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
              ⚠️ {t('deactivateWarning')}
            </p>
          )}
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            variant={newStatus ? "primary" : "danger"}
          >
            {isLoading ? t('modifying') : actionTextCapitalized}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
'use client'
import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

interface ToggleUserStatusModalProps {
  isOpen: boolean
  onClose: () => void
  user: { id: number; username: string; fullName?: string; isActive: boolean }
  onSuccess: () => void
}

export function ToggleUserStatusModal({ isOpen, onClose, user, onSuccess }: ToggleUserStatusModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const newStatus = !user.isActive
  const actionText = newStatus ? 'activer' : 'désactiver'
  const actionTextCapitalized = newStatus ? 'Activer' : 'Désactiver'

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
      setError(error instanceof Error ? error.message : 'Erreur lors de la modification du statut')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setError('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`${actionTextCapitalized} l'utilisateur`}>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Êtes-vous sûr de vouloir {actionText} l'utilisateur <strong>{user.fullName || user.username}</strong> ?
          </p>
          {!newStatus && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
              ⚠️ L'utilisateur ne pourra plus se connecter une fois désactivé.
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
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            variant={newStatus ? "primary" : "danger"}
          >
            {isLoading ? 'Modification...' : actionTextCapitalized}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
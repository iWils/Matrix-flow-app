'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Modal } from './Modal'
import { Input } from './Input'
import { Button } from './Button'

interface ChangeNameModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ChangeNameModal({ isOpen, onClose }: ChangeNameModalProps) {
  const { data: session, update } = useSession()
  const [name, setName] = useState(session?.user?.name || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!name.trim()) {
      setError('Le nom ne peut pas être vide')
      return
    }

    if (name.trim().length < 2) {
      setError('Le nom doit contenir au moins 2 caractères')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/users/change-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la modification du nom')
      }

      // Mettre à jour la session avec le nouveau nom
      await update({
        ...session,
        user: {
          ...session?.user,
          name: name.trim(),
        },
      })

      setSuccess(true)
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setName(session?.user?.name || '')
    setError('')
    setSuccess(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Modifier le nom">
      {success ? (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-green-600 font-medium">Nom modifié avec succès !</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Nom d'utilisateur
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
              placeholder="Entrez votre nom"
              minLength={2}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim() || name.trim() === session?.user?.name}
              className="flex-1"
            >
              {isLoading ? 'Modification...' : 'Modifier le nom'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
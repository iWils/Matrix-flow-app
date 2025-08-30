'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { Modal } from './Modal'
import { Alert } from './Alert'
import { LoadingSpinner } from './LoadingSpinner'

export type BatchActionType = 'delete' | 'update' | 'export'

interface BatchActionsProps {
  selectedCount: number
  selectedIds: number[]
  onClearSelection: () => void
  onBatchDelete: (ids: number[]) => Promise<void>
  onBatchUpdate: (ids: number[], updates: Record<string, unknown>) => Promise<void>
  onBatchExport: (ids: number[]) => Promise<void>
  canEdit: boolean
}

export function BatchActions({
  selectedCount,
  selectedIds,
  onClearSelection,
  onBatchDelete,
  onBatchUpdate,
  onBatchExport,
  canEdit = false
}: BatchActionsProps) {
  const { t } = useTranslation(['common', 'matrices'])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [updateFields, setUpdateFields] = useState({
    rule_status: '',
    action: '',
    requester: '',
    comment: ''
  })

  if (selectedCount === 0) return null

  const handleBatchDelete = async () => {
    try {
      setIsLoading(true)
      setError('')
      await onBatchDelete(selectedIds)
      setShowDeleteModal(false)
      onClearSelection()
    } catch {
      setError(t('common:errorOccurred'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleBatchUpdate = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      // Filtrer les champs vides
      const updates = Object.fromEntries(
        Object.entries(updateFields).filter(([, value]) => value.trim() !== '')
      )
      
      if (Object.keys(updates).length === 0) {
        setError('Veuillez sélectionner au moins un champ à mettre à jour')
        return
      }

      await onBatchUpdate(selectedIds, updates)
      setShowUpdateModal(false)
      onClearSelection()
      setUpdateFields({ rule_status: '', action: '', requester: '', comment: '' })
    } catch {
      setError(t('common:errorOccurred'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleBatchExport = async () => {
    try {
      setIsLoading(true)
      setError('')
      await onBatchExport(selectedIds)
    } catch {
      setError(t('common:errorOccurred'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Barre d'actions flottante */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-slate-800 shadow-lg rounded-lg p-4 border border-slate-200 dark:border-slate-700 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium">
              {t('matrices:batch.selectedCount', { count: selectedCount })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onClearSelection}
              disabled={isLoading}
            >
{t('matrices:batch.deselectAll')}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleBatchExport}
              disabled={isLoading}
            >
{isLoading ? <LoadingSpinner size="sm" /> : t('matrices:batch.export')}
            </Button>

            {canEdit && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowUpdateModal(true)}
                  disabled={isLoading}
                >
{t('matrices:batch.modify')}
                </Button>

                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isLoading}
                >
{isLoading ? <LoadingSpinner size="sm" /> : t('matrices:batch.delete')}
                </Button>
              </>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="error" className="mt-3">
            {error}
          </Alert>
        )}
      </div>

      {/* Modal de confirmation suppression */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
title={t('matrices:batch.deleteConfirmTitle')}
      >
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
<p className="text-sm text-red-800 dark:text-red-200" dangerouslySetInnerHTML={{
              __html: t('matrices:batch.deleteConfirmMessage', { count: selectedCount })
            }} />
          </div>

          <div className="flex gap-3">
            <Button
              variant="danger"
              onClick={handleBatchDelete}
              disabled={isLoading}
              className="flex-1"
            >
{isLoading ? <LoadingSpinner size="sm" /> : t('matrices:batch.confirmDelete')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={isLoading}
              className="flex-1"
            >
{t('common:cancel')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de mise à jour en lot */}
      <Modal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        title="Mise à jour en lot"
        className="max-w-lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Mise à jour de <strong>{selectedCount}</strong> entrée(s).
              Seuls les champs renseignés seront modifiés.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Statut</label>
              <select
                value={updateFields.rule_status}
                onChange={(e) => setUpdateFields(prev => ({ ...prev, rule_status: e.target.value }))}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700"
              >
                <option value="">-- Ne pas modifier --</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Pending">En attente</option>
                <option value="Disabled">Désactivée</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Action</label>
              <select
                value={updateFields.action}
                onChange={(e) => setUpdateFields(prev => ({ ...prev, action: e.target.value }))}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700"
              >
                <option value="">-- Ne pas modifier --</option>
                <option value="ALLOW">ALLOW</option>
                <option value="DENY">DENY</option>
                <option value="DROP">DROP</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Demandeur</label>
              <input
                type="text"
                value={updateFields.requester}
                onChange={(e) => setUpdateFields(prev => ({ ...prev, requester: e.target.value }))}
                placeholder="Nom du demandeur (optionnel)"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Commentaire</label>
              <textarea
                value={updateFields.comment}
                onChange={(e) => setUpdateFields(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Commentaire de mise à jour (optionnel)"
                rows={3}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700"
              />
            </div>
          </div>

          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleBatchUpdate}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : 'Appliquer les modifications'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowUpdateModal(false)
                setUpdateFields({ rule_status: '', action: '', requester: '', comment: '' })
                setError('')
              }}
              disabled={isLoading}
              className="flex-1"
            >
{t('common:cancel')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
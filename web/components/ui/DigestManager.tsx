'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'

interface DigestData {
  date: string
  totalChanges: number
  pendingApprovals: number
  recentChanges: Array<{
    matrixName: string
    actionType: string
    userName: string
    timestamp: string
  }>
}

interface DigestManagerProps {
  className?: string
}

export function DigestManager({ className = '' }: DigestManagerProps) {
  const { success, error } = useToast()
  const [preview, setPreview] = useState<DigestData | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  const generatePreview = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/digest?action=preview')
      const result = await response.json()
      
      if (result.success) {
        setPreview(result.data)
        success('Aperçu généré', 'Données du digest récupérées')
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      error('Erreur', 'Impossible de générer l\'aperçu')
    }
    setLoading(false)
  }

  const sendDigest = async () => {
    setSending(true)
    try {
      const response = await fetch('/api/admin/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          type: 'daily'
        })
      })

      const result = await response.json()
      
      if (result.success) {
        success('Digest envoyé', `Envoyé à ${result.result.sent} destinataires`)
        if (result.result.failed > 0) {
          error('Envois partiels', `${result.result.failed} échecs`)
        }
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      error('Erreur', 'Impossible d\'envoyer le digest')
    }
    setSending(false)
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">📊 Digest Manager</h3>
        <p className="text-sm text-gray-600">Gestion des résumés quotidiens</p>
      </div>
      
      <div className="p-6">
        <div className="flex gap-3 mb-6">
          <button
            onClick={generatePreview}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-medium"
          >
            {loading ? '⏳ Génération...' : '👁️ Aperçu'}
          </button>
          
          <button
            onClick={sendDigest}
            disabled={sending}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-lg font-medium"
          >
            {sending ? '⏳ Envoi...' : '📧 Envoyer maintenant'}
          </button>
        </div>

        {preview && (
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Aperçu du digest - {preview.date}</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Modifications</div>
                <div className="text-2xl font-bold text-blue-600">{preview.totalChanges}</div>
              </div>
              
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">En attente</div>
                <div className="text-2xl font-bold text-orange-600">{preview.pendingApprovals}</div>
              </div>
            </div>

            {preview.recentChanges.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Activités récentes</h5>
                <div className="space-y-2">
                  {preview.recentChanges.slice(0, 5).map((change, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{change.matrixName}</span>
                        <span className="text-gray-600 ml-2">- {change.actionType}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {change.userName}
                      </div>
                    </div>
                  ))}
                  {preview.recentChanges.length > 5 && (
                    <div className="text-center text-gray-500 text-sm">
                      ... et {preview.recentChanges.length - 5} autres
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-sm text-gray-500">
          <p>💡 Le digest est automatiquement envoyé chaque jour à 9h00</p>
          <p>📧 Les destinataires sont configurés dans les paramètres email</p>
        </div>
      </div>
    </div>
  )
}
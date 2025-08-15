'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useLanguage } from '@/components/providers/LanguageProvider'

type AuditLog = {
  id: number
  entity: string
  action: string
  at: string
  user: {
    username: string
    fullName?: string
  } | null
  changes: any
}

export default function AuditPage() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const router = useRouter()
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Vérifier si l'utilisateur est admin
    if (session && session.user?.role !== 'admin') {
      router.push('/')
      return
    }
    
    if (session) {
      loadAuditLogs()
    }
  }, [session, router])

  async function loadAuditLogs() {
    try {
      const res = await fetch('/api/audit')
      if (res.ok) {
        const data = await res.json()
        setAuditLogs(data)
      }
    } catch (error) {
      console.error('Error loading audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return <LoadingSpinner size="lg" />
  }

  if (session.user?.role !== 'admin') {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Logs d'audit</h1>
          <p className="text-slate-300">
            Historique complet des actions effectuées dans l'application
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {auditLogs.length} entrées
        </div>
      </div>

      {/* Audit Logs */}
      <Card>
        <div className="space-y-4">
          {auditLogs.length > 0 ? (
            auditLogs.map(log => (
              <div key={log.id} className="flex items-start gap-4 p-4 bg-slate-700 rounded-xl border border-slate-600 hover:bg-slate-600 transition-colors">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  log.action === 'create' ? 'bg-green-600 text-green-100' :
                  log.action === 'delete' ? 'bg-red-600 text-red-100' : 'bg-blue-600 text-blue-100'
                }`}>
                  {log.action === 'create' ? '+' :
                   log.action === 'delete' ? '×' : '↻'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm">
                      <span className="font-medium text-white">
                        {log.user?.fullName || log.user?.username || t('system')}
                      </span>
                      <span className="text-slate-300">
                        {' '}
                        {log.action === 'create' && t('created')}
                        {log.action === 'update' && t('updated')}
                        {log.action === 'delete' && t('deleted')}
                        {' '}
                        {log.entity === 'Matrix' && t('matrixEntity')}
                        {log.entity === 'FlowEntry' && t('entryEntity')}
                        {log.entity === 'User' && t('userEntity')}
                      </span>
                    </div>
                    <Badge variant={
                      log.action === 'create' ? 'success' :
                      log.action === 'delete' ? 'error' : 'default'
                    }>
                      {log.action}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-400 mb-2">
                    {new Date(log.at).toLocaleString('fr-FR')}
                  </div>
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <div className="text-xs bg-slate-800 p-2 rounded border border-slate-600">
                      <pre className="text-slate-300 whitespace-pre-wrap">
                        {JSON.stringify(log.changes, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-lg font-medium text-white mb-2">Aucun log d'audit</div>
              <div className="text-slate-400">Les actions effectuées dans l'application apparaîtront ici</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
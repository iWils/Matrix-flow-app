'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

type EmailSettings = {
  smtp: {
    host: string
    port: number
    secure: boolean
    username: string
    password: string
  }
  from: {
    name: string
    email: string
  }
  enabled: boolean
}

type EmailTemplate = {
  id: number
  name: string
  subject: string
  htmlContent: string
  textContent: string
  variables: string[]
  isActive: boolean
}

export default function EmailConfigPage() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState<EmailSettings>({
    smtp: {
      host: '',
      port: 587,
      secure: false,
      username: '',
      password: ''
    },
    from: {
      name: '',
      email: ''
    },
    enabled: false
  })
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      loadEmailSettings()
      loadEmailTemplates()
    }
  }, [session])

  async function loadEmailSettings() {
    try {
      const res = await fetch('/api/admin/email/settings')
      if (res.ok) {
        const response = await res.json()
        if (response.success && response.data) {
          setSettings(response.data)
        }
      }
    } catch (error) {
      console.error('Error loading email settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadEmailTemplates() {
    try {
      const res = await fetch('/api/admin/email/templates')
      if (res.ok) {
        const response = await res.json()
        if (response.success && response.data) {
          setTemplates(response.data)
        }
      }
    } catch (error) {
      console.error('Error loading email templates:', error)
    }
  }

  async function saveSettings() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/email/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (res.ok) {
        alert('Paramètres sauvegardés avec succès')
      } else {
        alert('Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  async function testConnection() {
    setTesting(true)
    try {
      const res = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      const result = await res.json()
      if (res.ok) {
        alert('Test de connexion réussi !')
      } else {
        alert(`Erreur de connexion: ${result.error}`)
      }
    } catch (error) {
      console.error('Error testing connection:', error)
      alert('Erreur lors du test de connexion')
    } finally {
      setTesting(false)
    }
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Configuration Messagerie</h1>
        <p className="text-slate-300">
          Paramètres SMTP et gestion des templates d'emails
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SMTP Settings */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Paramètres SMTP</h3>
              <Badge variant={settings.enabled ? 'success' : 'error'}>
                {settings.enabled ? 'Activé' : 'Désactivé'}
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="emailEnabled"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    enabled: e.target.checked
                  })}
                  className="rounded border-slate-300"
                />
                <label htmlFor="emailEnabled" className="text-sm font-medium text-slate-200">
                  Activer l'envoi d'emails
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Serveur SMTP
                </label>
                <Input
                  value={settings.smtp.host}
                  onChange={(e) => setSettings({
                    ...settings,
                    smtp: { ...settings.smtp, host: e.target.value }
                  })}
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Port
                  </label>
                  <Input
                    type="number"
                    value={settings.smtp.port}
                    onChange={(e) => setSettings({
                      ...settings,
                      smtp: { ...settings.smtp, port: parseInt(e.target.value) || 587 }
                    })}
                  />
                </div>
                <div className="flex items-end">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="smtpSecure"
                      checked={settings.smtp.secure}
                      onChange={(e) => setSettings({
                        ...settings,
                        smtp: { ...settings.smtp, secure: e.target.checked }
                      })}
                      className="rounded border-slate-300"
                    />
                    <label htmlFor="smtpSecure" className="text-sm text-slate-200">
                      SSL/TLS
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Nom d'utilisateur
                </label>
                <Input
                  value={settings.smtp.username}
                  onChange={(e) => setSettings({
                    ...settings,
                    smtp: { ...settings.smtp, username: e.target.value }
                  })}
                  placeholder="votre-email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Mot de passe
                </label>
                <Input
                  type="password"
                  value={settings.smtp.password}
                  onChange={(e) => setSettings({
                    ...settings,
                    smtp: { ...settings.smtp, password: e.target.value }
                  })}
                  placeholder="••••••••"
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-slate-200 mb-3">Expéditeur par défaut</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Nom
                    </label>
                    <Input
                      value={settings.from.name}
                      onChange={(e) => setSettings({
                        ...settings,
                        from: { ...settings.from, name: e.target.value }
                      })}
                      placeholder="Matrix Flow"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={settings.from.email}
                      onChange={(e) => setSettings({
                        ...settings,
                        from: { ...settings.from, email: e.target.value }
                      })}
                      placeholder="noreply@example.com"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={testConnection}
                  variant="outline"
                  disabled={testing || !settings.smtp.host}
                >
                  {testing ? 'Test en cours...' : 'Tester la connexion'}
                </Button>
                <Button
                  onClick={saveSettings}
                  disabled={saving}
                >
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Email Templates */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Templates d'emails</h3>
              <Button onClick={() => setShowTemplateModal(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Nouveau template
              </Button>
            </div>

            <div className="space-y-3">
              {templates.map(template => (
                <div key={template.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-white">{template.name}</h4>
                      <Badge variant={template.isActive ? 'success' : 'error'}>
                        {template.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-300">{template.subject}</p>
                    <p className="text-xs text-slate-400">
                      Variables: {template.variables.join(', ') || 'Aucune'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingTemplate(template)}
                      className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-600 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {templates.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-400">Aucun template configuré</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
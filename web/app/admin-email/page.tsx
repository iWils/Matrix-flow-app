'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
// import { Modal } from '@/components/ui/Modal'

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
  isDefault?: boolean
}

export default function EmailConfigPage() {
  const { t } = useTranslation(['common', 'admin'])
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
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [testTemplateType, setTestTemplateType] = useState('test')
  // const [showTemplateModal, setShowTemplateModal] = useState(false)
  // const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)

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
        } else if (res.ok && Array.isArray(response)) {
          // Fallback pour l'ancienne format de réponse
          setTemplates(response)
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
        setSuccessMessage(t('admin:settingsSavedSuccess'))
        setErrorMessage('')
      } else {
        setErrorMessage(t('admin:savingError'))
        setSuccessMessage('')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setErrorMessage(t('admin:savingError'))
      setSuccessMessage('')
    } finally {
      setSaving(false)
    }
  }

  async function testConnection() {
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      setErrorMessage('Veuillez saisir une adresse email valide pour le test')
      setSuccessMessage('')
      return
    }

    setTesting(true)
    try {
      const res = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          testEmail,
          templateType: testTemplateType
        })
      })
      
      const result = await res.json()
      if (res.ok && result.success) {
        setSuccessMessage(result.message || 'Email de test envoyé avec succès')
        setErrorMessage('')
      } else {
        setErrorMessage(result.message || 'Échec du test d\'email')
        setSuccessMessage('')
      }
    } catch (error) {
      console.error('Error testing email:', error)
      setErrorMessage('Erreur lors du test d\'email')
      setSuccessMessage('')
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
        <h1 className="text-3xl font-bold text-gradient mb-2">{t('admin:emailConfiguration')}</h1>
        <p className="text-slate-600 dark:text-slate-300">
          {t('admin:smtpSettingsDescription')}
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert variant="success" className="mb-6">
          {successMessage}
        </Alert>
      )}
      {errorMessage && (
        <Alert variant="error" className="mb-6">
          {errorMessage}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SMTP Settings */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('admin:smtpSettings')}</h3>
              <Badge variant={settings.enabled ? 'success' : 'error'}>
                {settings.enabled ? t('common:active') : t('common:inactive')}
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
                  className="rounded border-slate-300 dark:border-slate-700"
                />
                <label htmlFor="emailEnabled" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t('admin:enableEmailSending')}
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  {t('admin:smtpServer')}
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
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                    {t('admin:port')}
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
                      className="rounded border-slate-300 dark:border-slate-700"
                    />
                    <label htmlFor="smtpSecure" className="text-sm text-slate-700 dark:text-slate-200">
                      SSL/TLS
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  {t('admin:username')}
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
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  {t('admin:password')}
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
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">{t('admin:defaultSender')}</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                      {t('admin:name')}
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
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                      {t('admin:email')}
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

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">{t('admin:testEmailSection')}</h4>
                
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                      {t('admin:testEmail')}
                    </label>
                    <Input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder={t('admin:testEmailPlaceholder')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                      {t('admin:templateType')}
                    </label>
                    <select
                      value={testTemplateType}
                      onChange={(e) => setTestTemplateType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="test">{t('admin:testBasic')}</option>
                      <option value="change_approval">{t('admin:testChangeApproval')}</option>
                      <option value="change_notification">{t('admin:testChangeNotification')}</option>
                      <option value="security_alert">{t('admin:testSecurityAlert')}</option>
                      <option value="daily_digest">{t('admin:testDailyDigest')}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={testConnection}
                  variant="outline"
                  disabled={testing || !settings.smtp.host || !testEmail}
                >
                  {testing ? t('admin:testInProgress') : t('admin:testEmailButton')}
                </Button>
                <Button
                  onClick={saveSettings}
                  disabled={saving}
                >
                  {saving ? t('admin:saving') : t('common:save')}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Email Templates */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('admin:emailTemplates')}</h3>
              <Button onClick={() => {}}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t('admin:newTemplate')}
              </Button>
            </div>

            <div className="space-y-3">
              {templates.map(template => (
                <div key={template.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-slate-900 dark:text-white">{template.name}</h4>
                      <Badge variant={template.isActive ? 'success' : 'error'}>
                        {template.isActive ? t('common:active') : t('common:inactive')}
                      </Badge>
                      {template.isDefault && (
                        <Badge variant="default" className="text-xs">
                          {t('admin:defaultTemplate')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">{template.subject}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('admin:variables')}: {Array.isArray(template.variables) ? template.variables.join(', ') : t('admin:none')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!template.isDefault && (
                      <button
                        onClick={() => {}}
                        className="p-2 text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        title={t('admin:editTemplate')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => {}}
                      className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors"
                      title={t('admin:previewTemplate')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {templates.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-400 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-400 dark:text-slate-400">{t('admin:noTemplatesConfigured')}</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
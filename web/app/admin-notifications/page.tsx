'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/Toast'
import { DigestManager } from '@/components/ui/DigestManager'

interface NotificationSettings {
  emailEnabled: boolean
  digestFrequency: 'daily' | 'weekly' | 'disabled'
  securityAlerts: boolean
  changeNotifications: boolean
  approvalRequests: boolean
}

interface EmailServiceStatus {
  enabled: boolean
  configured: boolean
  lastTest?: string
  error?: string
}

interface NotificationStats {
  todayCount: number
  recentNotifications: Array<{
    id: number
    recipient: string
    subject: string
    status: string
    createdAt: string
    templateType: string
  }>
  emailService: EmailServiceStatus
}

export default function AdminNotificationsPage() {
  const { t } = useTranslation(['common', 'admin'])
  const { success, error } = useToast()
  
  const [settings, setSettings] = useState<NotificationSettings>({
    emailEnabled: false,
    digestFrequency: 'daily',
    securityAlerts: true,
    changeNotifications: true,
    approvalRequests: true
  })
  
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)

  // Charger les paramètres et statistiques
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/notifications?action=settings'),
      fetch('/api/admin/notifications?action=stats')
    ])
    .then(async ([settingsRes, statsRes]) => {
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        setSettings(settingsData)
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
    })
    .catch((err) => {
      console.error('Failed to load notification settings:', err)
      error(t('common:error'), t('admin:loading'))
    })
    .finally(() => setLoading(false))
  }, [error, t])

  // Sauvegarder les paramètres
  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateSettings',
          settings
        })
      })

      if (response.ok) {
        success(t('common:success'), t('admin:settingsSavedSuccess'))
      } else {
        throw new Error(t('admin:savingError'))
      }
    } catch (err) {
      console.error('Failed to save notification settings:', err)
      error(t('common:error'), t('admin:savingError'))
    }
    setSaving(false)
  }

  // Envoyer un email de test
  const sendTestEmail = async () => {
    if (!testEmail) return
    
    setSendingTest(true)
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          recipient: testEmail
        })
      })

      const result = await response.json()
      if (result.success) {
        success(t('admin:testEmail'), t('admin:testEmailDescription'))
      } else {
        throw new Error(result.message || t('admin:connectionError'))
      }
    } catch (err) {
      console.error('Failed to send test notification:', err)
      error(t('common:error'), t('admin:connectionError'))
    }
    setSendingTest(false)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🔔 {t('admin:notifications')}</h1>
          <p className="text-gray-600 mt-1">{t('admin:notificationsDescription')}</p>
        </div>
        
        {stats?.emailService && (
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            stats.emailService.enabled && stats.emailService.configured 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {stats.emailService.enabled && stats.emailService.configured ? `✅ ${t('admin:configured')}` : `❌ ${t('admin:notConfigured')}`}
          </div>
        )}
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                📊
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('admin:today')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                ✉️
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('admin:emailService')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {stats.emailService.configured ? t('admin:configured') : t('admin:notConfigured')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                📝
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('admin:templates')}</p>
                <p className="text-2xl font-bold text-gray-900">5</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paramètres de notifications */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">⚙️ {t('admin:settings')}</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{t('admin:emailNotifications')}</h3>
              <p className="text-sm text-gray-600">{t('admin:enableEmailNotifications')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.emailEnabled}
                onChange={(e) => setSettings(prev => ({ ...prev, emailEnabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin:digestFrequency')}
            </label>
            <select
              value={settings.digestFrequency}
              onChange={(e) => setSettings(prev => ({ ...prev, digestFrequency: e.target.value as 'daily' | 'weekly' | 'disabled' }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="daily">{t('admin:daily')}</option>
              <option value="weekly">{t('admin:weekly')}</option>
              <option value="disabled">{t('admin:disabled')}</option>
            </select>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">{t('admin:notificationTypes')}</h4>
            
            <div className="space-y-3">
              {[
                { key: 'securityAlerts', label: `🚨 ${t('admin:securityAlerts')}`, desc: t('admin:securityAlertsDesc') },
                { key: 'changeNotifications', label: `📝 ${t('admin:changeNotifications')}`, desc: t('admin:changeNotificationsDesc') },
                { key: 'approvalRequests', label: `✋ ${t('admin:approvalRequests')}`, desc: t('admin:approvalRequestsDesc') }
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{label}</div>
                    <div className="text-sm text-gray-600">{desc}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings[key as keyof NotificationSettings] as boolean}
                      onChange={(e) => setSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-medium"
            >
              {saving ? `⏳ ${t('admin:savingInProgress')}` : `💾 ${t('admin:save')}`}
            </button>
          </div>
        </div>
      </div>

      {/* Test email */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">🧪 {t('admin:testEmail')}</h2>
        </div>
        <div className="p-6">
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="admin@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={sendTestEmail}
              disabled={!testEmail || sendingTest}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium"
            >
              {sendingTest ? `⏳ ${t('admin:sending')}` : `📧 ${t('admin:testEmailBtn')}`}
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {t('admin:testEmailDescription')}
          </p>
        </div>
      </div>

      {/* Historique des notifications */}
      {stats?.recentNotifications && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">📋 {t('admin:recentNotifications')}</h2>
          </div>
          <div className="p-6">
            {stats.recentNotifications.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t('admin:noRecentNotifications')}</p>
            ) : (
              <div className="space-y-3">
                {stats.recentNotifications.map((notification) => (
                  <div key={notification.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{notification.subject}</div>
                      <div className="text-sm text-gray-600">
                        {t('common:to')}: {notification.recipient} • {new Date(notification.createdAt).toLocaleString('fr-FR')}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                        {notification.templateType}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        notification.status === 'sent' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {notification.status === 'sent' ? `✅ ${t('admin:sent')}` : `❌ ${t('admin:failed')}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Templates disponibles */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">📧 {t('admin:emailTemplatesAvailable')}</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { id: 'CHANGE_APPROVAL', name: t('admin:approvalRequired'), icon: '✋', desc: t('admin:approvalRequiredDesc') },
              { id: 'CHANGE_NOTIFICATION', name: t('admin:changeApproved'), icon: '✅', desc: t('admin:changeApprovedDesc') },
              { id: 'CHANGE_REJECTION', name: t('admin:changeRejected'), icon: '❌', desc: t('admin:changeRejectedDesc') },
              { id: 'DAILY_DIGEST', name: t('admin:dailyDigest'), icon: '📊', desc: t('admin:dailyDigestDesc') },
              { id: 'SECURITY_ALERT', name: t('admin:securityAlert'), icon: '🚨', desc: t('admin:securityAlertDesc') }
            ].map((template) => (
              <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start">
                  <div className="text-2xl mr-3">{template.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{template.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Digest Manager */}
      <DigestManager />

      {/* Status du service email */}
      {stats?.emailService && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">⚙️ {t('admin:emailServiceStatus')}</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{t('admin:configuration')}</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${stats.emailService.enabled ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-sm">{t('admin:serviceEnabled')}: {stats.emailService.enabled ? t('common:yes') : t('common:no')}</span>
                  </div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${stats.emailService.configured ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-sm">{t('admin:smtpConfigured')}: {stats.emailService.configured ? t('common:yes') : t('common:no')}</span>
                  </div>
                  {stats.emailService.lastTest && (
                    <div className="flex items-center">
                      <span className="w-2 h-2 rounded-full mr-2 bg-blue-500"></span>
                      <span className="text-sm">{t('admin:lastTest')}: {new Date(stats.emailService.lastTest).toLocaleString('fr-FR')}</span>
                    </div>
                  )}
                </div>
              </div>

              {stats.emailService.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">⚠️ {t('admin:error')}</h4>
                  <p className="text-sm text-red-700">{stats.emailService.error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
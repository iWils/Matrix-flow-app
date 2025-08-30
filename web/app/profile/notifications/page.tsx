'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { useToast } from '@/components/ui'
import { PushNotificationManager } from '@/components/ui/PushNotificationManager'
import { NotificationPreference } from '@prisma/client'

interface NotificationSectionProps {
  title: string
  description: string
  children: React.ReactNode
}

const NotificationSection: React.FC<NotificationSectionProps> = ({ title, description, children }) => (
  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-6">
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
)

interface ToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

const Toggle: React.FC<ToggleProps> = ({ label, description, checked, onChange, disabled = false }) => (
  <div className="flex items-start justify-between">
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</div>
      {description && (
        <div className="text-sm text-slate-500 dark:text-slate-400">{description}</div>
      )}
    </div>
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${checked 
          ? 'bg-blue-600' 
          : 'bg-slate-200 dark:bg-slate-600'
        }
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
          transition duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  </div>
)

interface TimeInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const TimeInput: React.FC<TimeInputProps> = ({ label, value, onChange, disabled = false }) => (
  <div className="flex items-center justify-between">
    <label className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</label>
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="
        px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md 
        bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
      "
    />
  </div>
)

export default function NotificationsPage() {
  const { t } = useTranslation('notifications')
  const { success, error } = useToast()
  
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/user/notifications')
      const result = await response.json()
      
      if (result.success) {
        setPreferences(result.data)
      } else {
        error('Erreur', t('messages.errorLoading'))
      }
    } catch (err) {
      error('Erreur', t('messages.errorConnection'))
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    if (!preferences) return

    setSaving(true)
    try {
      const response = await fetch('/api/user/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      })

      const result = await response.json()
      
      if (result.success) {
        success(t('messages.preferencesSaved'), result.message)
        setPreferences(result.data)
      } else {
        error('Erreur', result.error || t('messages.errorSaving'))
      }
    } catch (err) {
      error('Erreur', t('messages.errorConnection'))
    } finally {
      setSaving(false)
    }
  }

  const testNotification = async (type: 'email' | 'webhook') => {
    setTesting(type)
    try {
      const response = await fetch('/api/user/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })

      const result = await response.json()
      
      if (result.success) {
        success(t(`messages.test${type === 'email' ? 'Email' : 'Webhook'}Sent`), result.message)
      } else {
        error(t(`messages.test${type === 'email' ? 'Email' : 'Webhook'}Failed`), result.error)
      }
    } catch (err) {
      error('Erreur', t('messages.errorConnection'))
    } finally {
      setTesting(null)
    }
  }

  const resetToDefaults = async () => {
    if (!confirm(t('messages.resetConfirm'))) {
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/user/notifications', {
        method: 'DELETE'
      })

      const result = await response.json()
      
      if (result.success) {
        success(t('messages.preferencesReset'), result.message)
        setPreferences(result.data)
      } else {
        error('Erreur', result.error || t('messages.errorSaving'))
      }
    } catch (err) {
      error('Erreur', t('messages.errorConnection'))
    } finally {
      setSaving(false)
    }
  }

  const updatePreference = (key: keyof NotificationPreference, value: any) => {
    if (!preferences) return
    setPreferences(prev => ({ ...prev!, [key]: value }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!preferences) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="error">
          {t('messages.errorLoading')}
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          {t('title')}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          {t('description')}
        </p>
      </div>

      <div className="space-y-8">
        {/* Email Notifications */}
        <NotificationSection
          title={t('sections.email.title')}
          description={t('sections.email.description')}
        >
          <Toggle
            label={t('toggles.emailEnabled.label')}
            description={t('toggles.emailEnabled.description')}
            checked={preferences.emailEnabled}
            onChange={(checked) => updatePreference('emailEnabled', checked)}
          />
          
          <div className={`space-y-3 ${!preferences.emailEnabled ? 'opacity-50' : ''}`}>
            <Toggle
              label={t('toggles.emailChangeRequests.label')}
              description={t('toggles.emailChangeRequests.description')}
              checked={preferences.emailChangeRequests}
              onChange={(checked) => updatePreference('emailChangeRequests', checked)}
              disabled={!preferences.emailEnabled}
            />
            <Toggle
              label={t('toggles.emailChangeApprovals.label')}
              description={t('toggles.emailChangeApprovals.description')}
              checked={preferences.emailChangeApprovals}
              onChange={(checked) => updatePreference('emailChangeApprovals', checked)}
              disabled={!preferences.emailEnabled}
            />
            <Toggle
              label={t('toggles.emailSecurityAlerts.label')}
              description={t('toggles.emailSecurityAlerts.description')}
              checked={preferences.emailSecurityAlerts}
              onChange={(checked) => updatePreference('emailSecurityAlerts', checked)}
              disabled={!preferences.emailEnabled}
            />
            <Toggle
              label={t('toggles.emailSystemAlerts.label')}
              description={t('toggles.emailSystemAlerts.description')}
              checked={preferences.emailSystemAlerts}
              onChange={(checked) => updatePreference('emailSystemAlerts', checked)}
              disabled={!preferences.emailEnabled}
            />
            <Toggle
              label={t('toggles.emailDailyDigest.label')}
              description={t('toggles.emailDailyDigest.description')}
              checked={preferences.emailDailyDigest}
              onChange={(checked) => updatePreference('emailDailyDigest', checked)}
              disabled={!preferences.emailEnabled}
            />
            <Toggle
              label={t('toggles.emailWeeklyReport.label')}
              description={t('toggles.emailWeeklyReport.description')}
              checked={preferences.emailWeeklyReport}
              onChange={(checked) => updatePreference('emailWeeklyReport', checked)}
              disabled={!preferences.emailEnabled}
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="secondary"
              onClick={() => testNotification('email')}
              disabled={!preferences.emailEnabled || testing === 'email'}
            >
              {testing === 'email' ? (
                <>
                  <LoadingSpinner size="sm" />
                  {t('actions.testEmailSending')}
                </>
              ) : (
                t('actions.testEmail')
              )}
            </Button>
          </div>
        </NotificationSection>

        {/* Push Notifications */}
        <NotificationSection
          title={t('sections.push.title')}
          description={t('sections.push.description')}
        >
          <Toggle
            label={t('toggles.pushEnabled.label')}
            description={t('toggles.pushEnabled.description')}
            checked={preferences.pushEnabled}
            onChange={(checked) => updatePreference('pushEnabled', checked)}
          />
          
          <div className={`space-y-3 ${!preferences.pushEnabled ? 'opacity-50' : ''}`}>
            <Toggle
              label={t('toggles.pushChangeRequests.label')}
              checked={preferences.pushChangeRequests}
              onChange={(checked) => updatePreference('pushChangeRequests', checked)}
              disabled={!preferences.pushEnabled}
            />
            <Toggle
              label={t('toggles.pushChangeApprovals.label')}
              checked={preferences.pushChangeApprovals}
              onChange={(checked) => updatePreference('pushChangeApprovals', checked)}
              disabled={!preferences.pushEnabled}
            />
            <Toggle
              label={t('toggles.pushSecurityAlerts.label')}
              checked={preferences.pushSecurityAlerts}
              onChange={(checked) => updatePreference('pushSecurityAlerts', checked)}
              disabled={!preferences.pushEnabled}
            />
            <Toggle
              label={t('toggles.pushSystemAlerts.label')}
              checked={preferences.pushSystemAlerts}
              onChange={(checked) => updatePreference('pushSystemAlerts', checked)}
              disabled={!preferences.pushEnabled}
            />
            <Toggle
              label={t('toggles.pushInstantAlerts.label')}
              description={t('toggles.pushInstantAlerts.description')}
              checked={preferences.pushInstantAlerts}
              onChange={(checked) => updatePreference('pushInstantAlerts', checked)}
              disabled={!preferences.pushEnabled}
            />
          </div>

          {/* PWA Push Notification Manager */}
          {preferences.pushEnabled && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <PushNotificationManager className="w-full" />
            </div>
          )}
        </NotificationSection>

        {/* In-App Notifications */}
        <NotificationSection
          title={t('sections.inApp.title')}
          description={t('sections.inApp.description')}
        >
          <Toggle
            label={t('toggles.inAppEnabled.label')}
            description={t('toggles.inAppEnabled.description')}
            checked={preferences.inAppEnabled}
            onChange={(checked) => updatePreference('inAppEnabled', checked)}
          />
          
          <div className={`space-y-3 ${!preferences.inAppEnabled ? 'opacity-50' : ''}`}>
            <Toggle
              label={t('toggles.inAppChangeRequests.label')}
              checked={preferences.inAppChangeRequests}
              onChange={(checked) => updatePreference('inAppChangeRequests', checked)}
              disabled={!preferences.inAppEnabled}
            />
            <Toggle
              label={t('toggles.inAppChangeApprovals.label')}
              checked={preferences.inAppChangeApprovals}
              onChange={(checked) => updatePreference('inAppChangeApprovals', checked)}
              disabled={!preferences.inAppEnabled}
            />
            <Toggle
              label={t('toggles.inAppSecurityAlerts.label')}
              checked={preferences.inAppSecurityAlerts}
              onChange={(checked) => updatePreference('inAppSecurityAlerts', checked)}
              disabled={!preferences.inAppEnabled}
            />
            <Toggle
              label={t('toggles.inAppSystemAlerts.label')}
              checked={preferences.inAppSystemAlerts}
              onChange={(checked) => updatePreference('inAppSystemAlerts', checked)}
              disabled={!preferences.inAppEnabled}
            />
          </div>
        </NotificationSection>

        {/* Timing Preferences */}
        <NotificationSection
          title={t('sections.timing.title')}
          description={t('sections.timing.description')}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {t('timing.digestFrequency')}
              </label>
              <select
                value={preferences.digestFrequency}
                onChange={(e) => updatePreference('digestFrequency', e.target.value)}
                className="
                  px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md 
                  bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                "
              >
                <option value="daily">{t('timing.frequencies.daily')}</option>
                <option value="weekly">{t('timing.frequencies.weekly')}</option>
                <option value="never">{t('timing.frequencies.never')}</option>
              </select>
            </div>

            <TimeInput
              label={t('timing.digestTime')}
              value={preferences.digestTime}
              onChange={(value) => updatePreference('digestTime', value)}
              disabled={preferences.digestFrequency === 'never'}
            />

            <Toggle
              label={t('toggles.quietHoursEnabled.label')}
              description={t('toggles.quietHoursEnabled.description')}
              checked={preferences.quietHoursEnabled}
              onChange={(checked) => updatePreference('quietHoursEnabled', checked)}
            />

            {preferences.quietHoursEnabled && (
              <div className="ml-4 space-y-3 border-l-4 border-slate-200 dark:border-slate-700 pl-4">
                <TimeInput
                  label={t('timing.quietHoursStart')}
                  value={preferences.quietHoursStart || '22:00'}
                  onChange={(value) => updatePreference('quietHoursStart', value)}
                />
                <TimeInput
                  label={t('timing.quietHoursEnd')}
                  value={preferences.quietHoursEnd || '08:00'}
                  onChange={(value) => updatePreference('quietHoursEnd', value)}
                />
              </div>
            )}
          </div>
        </NotificationSection>

        {/* Webhooks */}
        <NotificationSection
          title={t('sections.webhooks.title')}
          description={t('sections.webhooks.description')}
        >
          <Toggle
            label={t('toggles.webhookEnabled.label')}
            description={t('toggles.webhookEnabled.description')}
            checked={preferences.webhookEnabled}
            onChange={(checked) => updatePreference('webhookEnabled', checked)}
          />
          
          {preferences.webhookEnabled && (
            <div className="ml-4 space-y-4 border-l-4 border-slate-200 dark:border-slate-700 pl-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  {t('webhooks.urlLabel')}
                </label>
                <input
                  type="url"
                  value={preferences.webhookUrl || ''}
                  onChange={(e) => updatePreference('webhookUrl', e.target.value)}
                  placeholder={t('webhooks.urlPlaceholder')}
                  className="
                    w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md 
                    bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  "
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  {t('webhooks.secretLabel')}
                </label>
                <input
                  type="password"
                  value={preferences.webhookSecret || ''}
                  onChange={(e) => updatePreference('webhookSecret', e.target.value)}
                  placeholder={t('webhooks.secretPlaceholder')}
                  className="
                    w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md 
                    bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  "
                />
              </div>

              <div className="pt-2">
                <Button
                  variant="secondary"
                  onClick={() => testNotification('webhook')}
                  disabled={!preferences.webhookUrl || testing === 'webhook'}
                >
                  {testing === 'webhook' ? (
                    <>
                      <LoadingSpinner size="sm" />
                      {t('actions.testWebhookSending')}
                    </>
                  ) : (
                    t('actions.testWebhook')
                  )}
                </Button>
              </div>
            </div>
          )}
        </NotificationSection>

        {/* Actions */}
        <div className="flex gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
          <Button
            onClick={savePreferences}
            disabled={saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" />
                {t('actions.saving')}
              </>
            ) : (
              t('actions.save')
            )}
          </Button>
          
          <Button
            variant="secondary"
            onClick={resetToDefaults}
            disabled={saving}
          >
            {t('actions.reset')}
          </Button>
        </div>
      </div>
    </div>
  )
}
'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslation } from 'react-i18next'
import { useLocalizedDate } from '@/lib/hooks/useLocalizedDate'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { WebhookManager } from '@/components/ui/WebhookManager'
import { Alert } from '@/components/ui/Alert'

type SystemSettings = {
  general: {
    appName: string
    appDescription: string
    defaultLanguage: string
    timezone: string
    maintenanceMode: boolean
  }
  security: {
    sessionTimeout: number
    passwordMinLength: number
    passwordRequireSpecialChars: boolean
    maxLoginAttempts: number
    lockoutDuration: number
  }
  audit: {
    retentionDays: number
    logLevel: 'error' | 'warn' | 'info' | 'debug'
    enableFileLogging: boolean
    maxLogFileSize: number
  }
  backup: {
    autoBackup: boolean
    backupFrequency: 'daily' | 'weekly' | 'monthly'
    retentionCount: number
    backupLocation: string
  }
}

export default function SystemPage() {
  const { t } = useTranslation(['common', 'admin'])
  const { formatDateTime } = useLocalizedDate()
  const { data: session } = useSession()
  const [settings, setSettings] = useState<SystemSettings>({
    general: {
      appName: 'Matrix Flow',
      appDescription: t('admin:appDescription'),
      defaultLanguage: 'fr',
      timezone: 'Europe/Paris',
      maintenanceMode: false
    },
    security: {
      sessionTimeout: 720, // 12 heures en minutes
      passwordMinLength: 8,
      passwordRequireSpecialChars: true,
      maxLoginAttempts: 5,
      lockoutDuration: 15 // en minutes
    },
    audit: {
      retentionDays: 90,
      logLevel: 'info',
      enableFileLogging: true,
      maxLogFileSize: 100 // en MB
    },
    backup: {
      autoBackup: false,
      backupFrequency: 'daily',
      retentionCount: 7,
      backupLocation: '/backups'
    }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [schedulerStatus, setSchedulerStatus] = useState<{
    isEnabled: boolean
    backupCount: number
    nextBackup?: string
  } | null>(null)
  const [backupList, setBackupList] = useState<{
    name: string
    size: number
    createdAt: string
    path: string
  }[]>([])
  const [selectedBackup, setSelectedBackup] = useState<string>('')
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'auth-providers' | 'audit' | 'backup' | 'webhooks' | '2fa'>('general')
  // États pour 2FA
  const [users2FA, setUsers2FA] = useState<{
    id: number
    name: string
    email: string
    role: string
    twoFactorEnabled: boolean
    backupCodesCount?: number
    lastTwoFactorAt?: string
    createdAt: string
  }[]>([])
  const [stats2FA, setStats2FA] = useState<{
    totalUsers: number
    users2FAEnabled: number
    users2FADisabled: number
    percentage: number
  } | null>(null)
  const [loading2FA, setLoading2FA] = useState(false)
  const [error2FA, setError2FA] = useState<string>()
  
  // États pour les fournisseurs d'authentification
  const [authProviders, setAuthProviders] = useState<{
    id: number
    name: string
    type: 'ldap' | 'oidc' | 'saml'
    config: Record<string, unknown>
    isActive: boolean
    priority: number
  }[]>([])
  const [ldapConfig, setLdapConfig] = useState<{
    server: string
    port: number
    bindDN: string
    bindPassword: string
    searchBase: string
    searchFilter: string
    useTLS: boolean
    userAttributes: {
      username: string
      email: string
      fullName: string
    }
  }>({
    server: '',
    port: 389,
    bindDN: '',
    bindPassword: '',
    searchBase: '',
    searchFilter: '(uid={username})',
    useTLS: false,
    userAttributes: {
      username: 'uid',
      email: 'mail',
      fullName: 'cn'
    }
  })
  const [oidcConfig, setOidcConfig] = useState<{
    issuer: string
    clientId: string
    clientSecret: string
    scopes: string[]
    usernameClaim: string
    emailClaim: string
    fullNameClaim: string
  }>({
    issuer: '',
    clientId: '',
    clientSecret: '',
    scopes: ['openid', 'profile', 'email'],
    usernameClaim: 'preferred_username',
    emailClaim: 'email',
    fullNameClaim: 'name'
  })
  const [authTab, setAuthTab] = useState<'ldap' | 'oidc'>('ldap')

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      loadSystemSettings()
      loadSchedulerStatus()
      loadBackupList()
      if (activeTab === '2fa') {
        loadUsers2FA()
      } else if (activeTab === 'auth-providers') {
        loadAuthProviders()
      }
    }
  }, [session, activeTab])

  async function loadSystemSettings() {
    try {
      const res = await fetch('/api/admin/system/settings')
      if (res.ok) {
        const response = await res.json()
        if (response.success && response.data) {
          setSettings(response.data)
        }
      }
    } catch (error) {
      console.error('Error loading system settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (res.ok) {
        const response = await res.json()
        setMessage({ type: 'success', text: response.message || t('admin:settingsSavedSuccess') })
        
        // Restart scheduler if backup settings changed
        if (settings.backup) {
          await controlScheduler('restart')
          await loadSchedulerStatus()
        }
      } else {
        const response = await res.json()
        setMessage({ type: 'error', text: response.message || t('admin:savingError') })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: t('admin:connectionErrorSaving') })
    } finally {
      setSaving(false)
    }
  }

  async function createBackup() {
    setCreating(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/system/backup', {
        method: 'POST'
      })
      
      if (res.ok) {
        const response = await res.json()
        setMessage({
          type: 'success',
          text: response.message || t('admin:backupCreatedSuccess')
        })
      } else {
        const response = await res.json()
        setMessage({
          type: 'error',
          text: response.message || t('admin:backupCreationError')
        })
      }
    } catch (error) {
      console.error('Error creating backup:', error)
      setMessage({
        type: 'error',
        text: t('admin:connectionErrorBackup')
      })
    } finally {
      setCreating(false)
    }
  }

  async function loadSchedulerStatus() {
    try {
      const res = await fetch('/api/admin/system/backup/scheduler')
      if (res.ok) {
        const response = await res.json()
        if (response.success) {
          setSchedulerStatus(response.data)
        }
      }
    } catch (error) {
      console.error('Error loading scheduler status:', error)
    }
  }

  async function loadBackupList() {
    try {
      const res = await fetch('/api/admin/system/backup')
      if (res.ok) {
        const response = await res.json()
        if (response.success) {
          setBackupList(response.data || [])
        }
      }
    } catch (error) {
      console.error('Error loading backup list:', error)
    }
  }

  async function controlScheduler(action: 'start' | 'stop' | 'restart') {
    try {
      const res = await fetch('/api/admin/system/backup/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      
      if (res.ok) {
        const response = await res.json()
        if (response.success) {
          setSchedulerStatus(response.data)
          // Utiliser le message personnalisé du serveur
          setMessage({ type: 'success', text: response.message || `Scheduler ${action} completed successfully` })
        }
      }
    } catch (error) {
      console.error(`Error ${action} scheduler:`, error)
      const errorMessage = action === 'start' ? t('admin:schedulerActionError') 
        : action === 'stop' ? t('admin:schedulerActionError')
        : t('admin:schedulerActionError')
      setMessage({ type: 'error', text: errorMessage })
    }
  }

  async function restoreBackup() {
    if (!selectedBackup) return
    
    setRestoring(true)
    setMessage(null)
    
    try {
      const res = await fetch('/api/admin/system/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupPath: selectedBackup,
          confirmRestore: true
        })
      })
      
      const response = await res.json()
      if (res.ok && response.success) {
        setMessage({ 
          type: 'success', 
          text: 'Database restored successfully. Please refresh the page.' 
        })
        setShowRestoreConfirm(false)
        setSelectedBackup('')
      } else {
        setMessage({ 
          type: 'error', 
          text: response.message || 'Error restoring database' 
        })
      }
    } catch (error) {
      console.error('Error restoring backup:', error)
      setMessage({ type: 'error', text: 'Connection error while restoring' })
    } finally {
      setRestoring(false)
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Fonctions pour 2FA
  async function loadUsers2FA() {
    setLoading2FA(true)
    try {
      const response = await fetch('/api/admin/2fa')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load 2FA data')
      }

      setUsers2FA(data.users)
      setStats2FA(data.stats)
      setError2FA(undefined)
    } catch (err) {
      setError2FA(err instanceof Error ? err.message : 'Failed to load 2FA data')
    } finally {
      setLoading2FA(false)
    }
  }

  async function force2FADisable(userId: number) {
    if (!confirm('Confirmer la désactivation de 2FA pour cet utilisateur ?')) {
      return
    }

    try {
      const response = await fetch('/api/admin/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disable',
          userId
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disable 2FA')
      }

      await loadUsers2FA()
      setMessage({ type: 'success', text: '2FA désactivé avec succès' })
    } catch (err) {
      setError2FA(err instanceof Error ? err.message : 'Failed to disable 2FA')
    }
  }

  async function regenerateBackupCodes(userId: number) {
    if (!confirm('Confirmer la régénération des codes de sauvegarde ?')) {
      return
    }

    try {
      const response = await fetch('/api/admin/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate-backup-codes',
          userId
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to regenerate backup codes')
      }

      const result = await response.json()
      setMessage({ type: 'success', text: `Codes de sauvegarde régénérés (${result.codesCount} codes)` })
      await loadUsers2FA()
    } catch (err) {
      setError2FA(err instanceof Error ? err.message : 'Failed to regenerate backup codes')
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('fr-FR')
  }

  // Fonctions pour les fournisseurs d'authentification
  async function loadAuthProviders() {
    try {
      const res = await fetch('/api/admin/auth/providers')
      if (res.ok) {
        const response = await res.json()
        if (response.success && response.data) {
          setAuthProviders(response.data)
          
          // Charger les configurations existantes
          const ldapProvider = response.data.find((p: any) => p.type === 'ldap')
          if (ldapProvider) {
            setLdapConfig(ldapProvider.config)
          }
          
          const oidcProvider = response.data.find((p: any) => p.type === 'oidc')
          if (oidcProvider) {
            setOidcConfig(oidcProvider.config)
          }
        }
      }
    } catch (error) {
      console.error('Error loading auth providers:', error)
    }
  }

  async function saveLDAPConfig() {
    try {
      const res = await fetch('/api/admin/auth/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'LDAP/Active Directory',
          type: 'ldap',
          config: ldapConfig,
          isActive: true
        })
      })
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Configuration LDAP sauvegardée' })
        loadAuthProviders()
      } else {
        const response = await res.json()
        setMessage({ type: 'error', text: response.message || 'Erreur lors de la sauvegarde LDAP' })
      }
    } catch (error) {
      console.error('Error saving LDAP config:', error)
      setMessage({ type: 'error', text: 'Erreur de connexion lors de la sauvegarde LDAP' })
    }
  }

  async function saveOIDCConfig() {
    try {
      const res = await fetch('/api/admin/auth/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'OIDC Provider',
          type: 'oidc',
          config: oidcConfig,
          isActive: true
        })
      })
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Configuration OIDC sauvegardée' })
        loadAuthProviders()
      } else {
        const response = await res.json()
        setMessage({ type: 'error', text: response.message || 'Erreur lors de la sauvegarde OIDC' })
      }
    } catch (error) {
      console.error('Error saving OIDC config:', error)
      setMessage({ type: 'error', text: 'Erreur de connexion lors de la sauvegarde OIDC' })
    }
  }

  async function testAuthConnection(type: 'ldap' | 'oidc') {
    try {
      const config = type === 'ldap' ? ldapConfig : oidcConfig
      const res = await fetch(`/api/admin/auth/test/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      
      const result = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: 'Test de connexion réussi !' })
      } else {
        setMessage({ type: 'error', text: `Erreur de connexion: ${result.error}` })
      }
    } catch (error) {
      console.error('Error testing connection:', error)
      setMessage({ type: 'error', text: 'Erreur lors du test de connexion' })
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
        <h1 className="text-3xl font-bold text-gradient mb-2">{t('common:systemSettings')}</h1>
        <p className="text-slate-600 dark:text-slate-300">
          {t('admin:systemDescription')}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-slate-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'general', label: t('admin:general') },
              { key: 'security', label: t('admin:security') },
              { key: 'auth-providers', label: t('admin:authProviders') },
              { key: 'audit', label: t('admin:audit') },
              { key: 'backup', label: t('admin:backup') },
              { key: 'webhooks', label: t('admin:webhooks') },
              { key: '2fa', label: t('admin:twoFactorManagement') }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'general' | 'security' | 'auth-providers' | 'audit' | 'backup' | 'webhooks' | '2fa')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 dark:text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg border ${
          message.type === 'success'
            ? 'bg-green-900/20 border-green-700 text-green-200'
            : 'bg-red-900/20 border-red-700 text-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {/* General Settings */}
      {activeTab === 'general' && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Paramètres généraux</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Nom de l&apos;application
                </label>
                <Input
                  value={settings.general.appName}
                  onChange={(e) => setSettings({
                    ...settings,
                    general: { ...settings.general, appName: e.target.value }
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Description
                </label>
                <Input
                  value={settings.general.appDescription}
                  onChange={(e) => setSettings({
                    ...settings,
                    general: { ...settings.general, appDescription: e.target.value }
                  })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                    Langue par défaut
                  </label>
                  <select
                    value={settings.general.defaultLanguage}
                    onChange={(e) => setSettings({
                      ...settings,
                      general: { ...settings.general, defaultLanguage: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                    Fuseau horaire
                  </label>
                  <select
                    value={settings.general.timezone}
                    onChange={(e) => setSettings({
                      ...settings,
                      general: { ...settings.general, timezone: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Europe/Paris">Europe/Paris</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-orange-900/20 border border-orange-700 rounded-lg">
                <input
                  type="checkbox"
                  id="maintenanceMode"
                  checked={settings.general.maintenanceMode}
                  onChange={(e) => setSettings({
                    ...settings,
                    general: { ...settings.general, maintenanceMode: e.target.checked }
                  })}
                  className="rounded border-slate-300 dark:border-slate-700"
                />
                <div>
                  <label htmlFor="maintenanceMode" className="text-sm font-medium text-orange-700 dark:text-orange-200">
                    Mode maintenance
                  </label>
                  <p className="text-xs text-orange-600 dark:text-orange-300">
                    Empêche les utilisateurs non-admin d&apos;accéder à l&apos;application
                  </p>
                </div>
                {settings.general.maintenanceMode && (
                  <Badge variant="warning">{t('common:active')}</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Paramètres de sécurité</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Timeout de session (minutes)
                </label>
                <Input
                  type="number"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, sessionTimeout: parseInt(e.target.value) || 720 }
                  })}
                />
                <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">
                  Durée avant déconnexion automatique (défaut: 720 minutes = 12h)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                    Longueur minimale du mot de passe
                  </label>
                  <Input
                    type="number"
                    min="6"
                    max="32"
                    value={settings.security.passwordMinLength}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: { ...settings.security, passwordMinLength: parseInt(e.target.value) || 8 }
                    })}
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="requireSpecialChars"
                    checked={settings.security.passwordRequireSpecialChars}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: { ...settings.security, passwordRequireSpecialChars: e.target.checked }
                    })}
                    className="rounded border-slate-300 dark:border-slate-700"
                  />
                  <label htmlFor="requireSpecialChars" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Exiger des caractères spéciaux
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                    Tentatives de connexion max
                  </label>
                  <Input
                    type="number"
                    min="3"
                    max="10"
                    value={settings.security.maxLoginAttempts}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: { ...settings.security, maxLoginAttempts: parseInt(e.target.value) || 5 }
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                    Durée de verrouillage (minutes)
                  </label>
                  <Input
                    type="number"
                    min="5"
                    max="60"
                    value={settings.security.lockoutDuration}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: { ...settings.security, lockoutDuration: parseInt(e.target.value) || 15 }
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Auth Providers Settings */}
      {activeTab === 'auth-providers' && (
        <div className="space-y-6">
          {/* Providers Status */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('admin:authProviders')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {authProviders.map(provider => (
                  <div key={provider.id} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-slate-900 dark:text-white">{provider.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">{provider.type}</p>
                    </div>
                    <Badge variant={provider.isActive ? 'success' : 'warning'}>
                      {provider.isActive ? t('common:active') : t('common:inactive')}
                    </Badge>
                  </div>
                ))}
                {authProviders.length === 0 && (
                  <div className="col-span-3 text-center py-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Aucun fournisseur configuré</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Configuration Tabs */}
          <div className="mb-6">
            <div className="border-b border-slate-600">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setAuthTab('ldap')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    authTab === 'ldap'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  LDAP / Active Directory
                </button>
                <button
                  onClick={() => setAuthTab('oidc')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    authTab === 'oidc'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  OIDC
                </button>
              </nav>
            </div>
          </div>

          {/* LDAP Configuration */}
          {authTab === 'ldap' && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">{t('admin:ldapConfiguration')}</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                        Serveur LDAP
                      </label>
                      <Input
                        value={ldapConfig.server}
                        onChange={(e) => setLdapConfig({
                          ...ldapConfig,
                          server: e.target.value
                        })}
                        placeholder="ldap://dc.example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                        Port
                      </label>
                      <Input
                        type="number"
                        value={ldapConfig.port}
                        onChange={(e) => setLdapConfig({
                          ...ldapConfig,
                          port: parseInt(e.target.value) || 389
                        })}
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="useTLS"
                        checked={ldapConfig.useTLS}
                        onChange={(e) => setLdapConfig({
                          ...ldapConfig,
                          useTLS: e.target.checked
                        })}
                        className="rounded border-slate-300 dark:border-slate-700"
                      />
                      <label htmlFor="useTLS" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Utiliser TLS/SSL
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                        Bind DN
                      </label>
                      <Input
                        value={ldapConfig.bindDN}
                        onChange={(e) => setLdapConfig({
                          ...ldapConfig,
                          bindDN: e.target.value
                        })}
                        placeholder="cn=admin,dc=example,dc=com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                        Mot de passe Bind
                      </label>
                      <Input
                        type="password"
                        value={ldapConfig.bindPassword}
                        onChange={(e) => setLdapConfig({
                          ...ldapConfig,
                          bindPassword: e.target.value
                        })}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                        Base de recherche
                      </label>
                      <Input
                        value={ldapConfig.searchBase}
                        onChange={(e) => setLdapConfig({
                          ...ldapConfig,
                          searchBase: e.target.value
                        })}
                        placeholder="ou=users,dc=example,dc=com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                        Filtre de recherche
                      </label>
                      <Input
                        value={ldapConfig.searchFilter}
                        onChange={(e) => setLdapConfig({
                          ...ldapConfig,
                          searchFilter: e.target.value
                        })}
                        placeholder="(uid={username})"
                      />
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">Mapping des attributs</h4>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                            Nom d&apos;utilisateur
                          </label>
                          <Input
                            value={ldapConfig.userAttributes.username}
                            onChange={(e) => setLdapConfig({
                              ...ldapConfig,
                              userAttributes: {
                                ...ldapConfig.userAttributes,
                                username: e.target.value
                              }
                            })}
                            placeholder="uid"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                            Email
                          </label>
                          <Input
                            value={ldapConfig.userAttributes.email}
                            onChange={(e) => setLdapConfig({
                              ...ldapConfig,
                              userAttributes: {
                                ...ldapConfig.userAttributes,
                                email: e.target.value
                              }
                            })}
                            placeholder="mail"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                            Nom complet
                          </label>
                          <Input
                            value={ldapConfig.userAttributes.fullName}
                            onChange={(e) => setLdapConfig({
                              ...ldapConfig,
                              userAttributes: {
                                ...ldapConfig.userAttributes,
                                fullName: e.target.value
                              }
                            })}
                            placeholder="cn"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t">
                  <Button
                    onClick={() => testAuthConnection('ldap')}
                    variant="outline"
                    disabled={!ldapConfig.server}
                  >
                    Tester la connexion
                  </Button>
                  <Button onClick={saveLDAPConfig}>
                    Sauvegarder la configuration
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* OIDC Configuration */}
          {authTab === 'oidc' && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">{t('admin:oidcConfiguration')}</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                        Issuer URL
                      </label>
                      <Input
                        value={oidcConfig.issuer}
                        onChange={(e) => setOidcConfig({
                          ...oidcConfig,
                          issuer: e.target.value
                        })}
                        placeholder="https://auth.example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                        Client ID
                      </label>
                      <Input
                        value={oidcConfig.clientId}
                        onChange={(e) => setOidcConfig({
                          ...oidcConfig,
                          clientId: e.target.value
                        })}
                        placeholder="matrix-flow-client"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                        Client Secret
                      </label>
                      <Input
                        type="password"
                        value={oidcConfig.clientSecret}
                        onChange={(e) => setOidcConfig({
                          ...oidcConfig,
                          clientSecret: e.target.value
                        })}
                        placeholder="••••••••"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                        Scopes (séparés par des espaces)
                      </label>
                      <Input
                        value={oidcConfig.scopes.join(' ')}
                        onChange={(e) => setOidcConfig({
                          ...oidcConfig,
                          scopes: e.target.value.split(' ').filter(s => s.trim())
                        })}
                        placeholder="openid profile email"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="border-t lg:border-t-0 pt-4 lg:pt-0">
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">Mapping des claims</h4>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                            Nom d&apos;utilisateur
                          </label>
                          <Input
                            value={oidcConfig.usernameClaim}
                            onChange={(e) => setOidcConfig({
                              ...oidcConfig,
                              usernameClaim: e.target.value
                            })}
                            placeholder="preferred_username"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                            Email
                          </label>
                          <Input
                            value={oidcConfig.emailClaim}
                            onChange={(e) => setOidcConfig({
                              ...oidcConfig,
                              emailClaim: e.target.value
                            })}
                            placeholder="email"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                            Nom complet
                          </label>
                          <Input
                            value={oidcConfig.fullNameClaim}
                            onChange={(e) => setOidcConfig({
                              ...oidcConfig,
                              fullNameClaim: e.target.value
                            })}
                            placeholder="name"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t">
                  <Button
                    onClick={() => testAuthConnection('oidc')}
                    variant="outline"
                    disabled={!oidcConfig.issuer || !oidcConfig.clientId}
                  >
                    Tester la configuration
                  </Button>
                  <Button onClick={saveOIDCConfig}>
                    Sauvegarder la configuration
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Audit Settings */}
      {activeTab === 'audit' && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Paramètres d&apos;audit</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Rétention des logs (jours)
                </label>
                <Input
                  type="number"
                  min="7"
                  max="365"
                  value={settings.audit.retentionDays}
                  onChange={(e) => setSettings({
                    ...settings,
                    audit: { ...settings.audit, retentionDays: parseInt(e.target.value) || 90 }
                  })}
                />
                <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">
                  Les logs plus anciens seront automatiquement supprimés
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Niveau de log
                </label>
                <select
                  value={settings.audit.logLevel}
                  onChange={(e) => setSettings({
                    ...settings,
                    audit: { ...settings.audit, logLevel: e.target.value as 'error' | 'warn' | 'info' | 'debug' }
                  })}
                  className="w-full px-3 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-700 text-white"
                >
                  <option value="error">Error</option>
                  <option value="warn">Warning</option>
                  <option value="info">Info</option>
                  <option value="debug">Debug</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enableFileLogging"
                  checked={settings.audit.enableFileLogging}
                  onChange={(e) => setSettings({
                    ...settings,
                    audit: { ...settings.audit, enableFileLogging: e.target.checked }
                  })}
                  className="rounded border-slate-300 dark:border-slate-700"
                />
                <label htmlFor="enableFileLogging" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Activer les logs fichier
                </label>
              </div>

              {settings.audit.enableFileLogging && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                    Taille max des fichiers de log (MB)
                  </label>
                  <Input
                    type="number"
                    min="10"
                    max="1000"
                    value={settings.audit.maxLogFileSize}
                    onChange={(e) => setSettings({
                      ...settings,
                      audit: { ...settings.audit, maxLogFileSize: parseInt(e.target.value) || 100 }
                    })}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Backup Settings */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Configuration de sauvegarde */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">{t('admin:backupConfiguration')}</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="autoBackup"
                    checked={settings.backup.autoBackup}
                    onChange={(e) => setSettings({
                      ...settings,
                      backup: { ...settings.backup, autoBackup: e.target.checked }
                    })}
                    className="rounded border-slate-300 dark:border-slate-700"
                  />
                  <label htmlFor="autoBackup" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t('admin:automaticBackup')}
                  </label>
                </div>

                {settings.backup.autoBackup && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                        {t('admin:frequency')}
                      </label>
                      <select
                        value={settings.backup.backupFrequency}
                        onChange={(e) => setSettings({
                          ...settings,
                          backup: { ...settings.backup, backupFrequency: e.target.value as 'daily' | 'weekly' | 'monthly' }
                        })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="daily">{t('common:daily')}</option>
                        <option value="weekly">{t('common:weekly')}</option>
                        <option value="monthly">{t('common:monthly')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                        {t('admin:retentionCount')}
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        value={settings.backup.retentionCount}
                        onChange={(e) => setSettings({
                          ...settings,
                          backup: { ...settings.backup, retentionCount: parseInt(e.target.value) || 7 }
                        })}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                    {t('admin:backupLocation')}
                  </label>
                  <Input
                    value={settings.backup.backupLocation}
                    onChange={(e) => setSettings({
                      ...settings,
                      backup: { ...settings.backup, backupLocation: e.target.value }
                    })}
                    placeholder="/backups"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Statut du scheduler */}
          {schedulerStatus && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">{t('admin:schedulerStatus')}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {schedulerStatus.isEnabled ? (
                        <span className="text-green-600">{t('admin:enabled')}</span>
                      ) : (
                        <span className="text-red-600">{t('admin:disabled')}</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{t('admin:autoBackup')}</div>
                  </div>
                  
                  <div className="text-center p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{schedulerStatus.backupCount}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{t('admin:totalBackups')}</div>
                  </div>
                  
                  <div className="text-center p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {schedulerStatus.nextBackup ? 
                        formatDateTime(schedulerStatus.nextBackup) : 
                        t('admin:notScheduled')}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{t('admin:nextBackup')}</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => controlScheduler('start')}
                    variant="outline"
                    disabled={schedulerStatus.isEnabled}
                  >
                    {t('admin:startScheduler')}
                  </Button>
                  <Button
                    onClick={() => controlScheduler('stop')}
                    variant="outline"
                    disabled={!schedulerStatus.isEnabled}
                  >
                    {t('admin:stopScheduler')}
                  </Button>
                  <Button
                    onClick={() => controlScheduler('restart')}
                    variant="outline"
                  >
                    {t('admin:restartScheduler')}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Actions manuelles */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">{t('admin:manualActions')}</h3>
              
              <div className="flex gap-3 mb-6">
                <Button
                  onClick={createBackup}
                  variant="outline"
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {t('admin:creatingBackup')}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      {t('admin:createBackupNow')}
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => {
                    loadBackupList()
                    loadSchedulerStatus()
                  }}
                  variant="ghost"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {t('admin:refresh')}
                </Button>
              </div>
            </div>
          </Card>

          {/* Liste des sauvegardes */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">{t('admin:availableBackups')}</h3>
              
              {backupList.length > 0 ? (
                <div className="space-y-3">
                  {backupList.map((backup, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">{backup.name}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          {formatFileSize(backup.size)} • {formatDateTime(backup.createdAt)}
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedBackup(backup.path)
                          setShowRestoreConfirm(true)
                        }}
                        variant="outline"
                        size="sm"
                      >
                        {t('admin:restore')}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">{t('admin:noBackupsFound')}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Modal de confirmation de restauration */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t('admin:confirmRestore')}
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              {t('admin:restoreWarning')}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => {
                  setShowRestoreConfirm(false)
                  setSelectedBackup('')
                }}
                variant="outline"
                disabled={restoring}
              >
                {t('common:cancel')}
              </Button>
              <Button
                onClick={restoreBackup}
                variant="danger"
                disabled={restoring}
              >
                {restoring ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {t('admin:restoring')}
                  </>
                ) : (
                  t('admin:confirmRestoreAction')
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Webhooks Settings */}
      {activeTab === 'webhooks' && (
        <div>
          <WebhookManager />
        </div>
      )}

      {/* 2FA Settings */}
      {activeTab === '2fa' && (
        <div className="space-y-6">
          {error2FA && (
            <Alert variant="error">
              {error2FA}
            </Alert>
          )}

          {/* Statistiques 2FA */}
          {stats2FA && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Total utilisateurs
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {stats2FA.totalUsers}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <span className="text-2xl">👥</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      2FA Activé
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {stats2FA.users2FAEnabled}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <span className="text-2xl">✅</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      2FA Désactivé
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {stats2FA.users2FADisabled}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                    <span className="text-2xl">❌</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Taux d&apos;adoption
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {stats2FA.percentage}%
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <span className="text-2xl">📊</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Actions rapides 2FA */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Actions rapides 2FA
              </h2>
              <Button
                variant="secondary"
                onClick={loadUsers2FA}
                disabled={loading2FA}
              >
                {loading2FA ? <LoadingSpinner size="sm" /> : `🔄 Actualiser`}
              </Button>
            </div>
          </Card>

          {/* Liste des utilisateurs 2FA */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              État 2FA des utilisateurs ({users2FA.length})
            </h2>

            {loading2FA ? (
              <div className="flex items-center justify-center min-h-64">
                <LoadingSpinner size="lg" />
                <span className="ml-3 text-slate-600 dark:text-slate-400">
                  Chargement des données 2FA...
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                {users2FA.map((user) => (
                  <div
                    key={user.id}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            <span className="text-lg">
                              {user.twoFactorEnabled ? '🔐' : '🔓'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-slate-900 dark:text-slate-100">
                                {user.name} ({user.email})
                              </h3>
                              <Badge variant={user.role === 'admin' ? 'success' : 'default'}>
                                {user.role}
                              </Badge>
                              <Badge variant={user.twoFactorEnabled ? 'success' : 'warning'}>
                                {user.twoFactorEnabled ? 'Activé' : 'Désactivé'}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Membre depuis {formatDate(user.createdAt)}
                              {user.lastTwoFactorAt && 
                                ` • Dernière auth 2FA ${formatDate(user.lastTwoFactorAt)}`
                              }
                              {user.twoFactorEnabled && user.backupCodesCount !== undefined && 
                                ` • ${user.backupCodesCount} codes de sauvegarde`
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="ml-4 flex gap-2">
                        {user.twoFactorEnabled && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => regenerateBackupCodes(user.id)}
                            >
                              🔄 Régénérer codes
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => force2FADisable(user.id)}
                            >
                              ❌ Désactiver
                            </Button>
                          </>
                        )}
                        {!user.twoFactorEnabled && (
                          <Badge variant="warning">
                            L&apos;utilisateur doit activer 2FA
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {users2FA.length === 0 && !loading2FA && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">👤</div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Aucun utilisateur trouvé
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Informations de sécurité 2FA */}
          <Card className="p-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                💡 Informations de sécurité
              </h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Les utilisateurs peuvent uniquement activer 2FA eux-mêmes</li>
                <li>• Les administrateurs peuvent désactiver 2FA en cas d&apos;urgence</li>
                <li>• Les codes de sauvegarde sont chiffrés en base de données</li>
                <li>• Chaque utilisateur dispose de 10 codes de sauvegarde</li>
                <li>• La régénération des codes invalide les anciens codes</li>
              </ul>
            </div>
          </Card>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end mt-6">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <>
              <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('admin:savingInProgress')}
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {t('admin:saveSettings')}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
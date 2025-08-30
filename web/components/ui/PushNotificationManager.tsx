'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { Alert } from './Alert'
import { LoadingSpinner } from './LoadingSpinner'

interface PushNotificationManagerProps {
  className?: string
}

interface PushSubscription {
  id: number
  deviceName?: string
  userAgent?: string
  ipAddress?: string
  createdAt: string
  lastUsed: string
}

interface PushPermissionState {
  supported: boolean
  permission: NotificationPermission | 'unsupported'
  subscribed: boolean
  subscription: any
  loading: boolean
  error?: string
}

export const PushNotificationManager: React.FC<PushNotificationManagerProps> = ({ className = '' }) => {
  const { t } = useTranslation('notifications')
  const [state, setState] = useState<PushPermissionState>({
    supported: false,
    permission: 'default',
    subscribed: false,
    subscription: null,
    loading: true
  })
  
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([])
  const [testing, setTesting] = useState(false)
  const [deviceName, setDeviceName] = useState('')

  useEffect(() => {
    checkPushSupport()
    loadSubscriptions()
  }, [])

  const checkPushSupport = async () => {
    setState(prev => ({ ...prev, loading: true }))

    try {
      // Check if Push API is supported
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setState(prev => ({
          ...prev,
          supported: false,
          permission: 'unsupported',
          loading: false
        }))
        return
      }

      // Check current notification permission
      const permission = Notification.permission
      
      // Check if already subscribed
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      setState(prev => ({
        ...prev,
        supported: true,
        permission,
        subscribed: !!subscription,
        subscription,
        loading: false
      }))

    } catch (error) {
      console.error('Error checking push support:', error)
      setState(prev => ({
        ...prev,
        supported: false,
        permission: 'unsupported',
        loading: false,
        error: 'Erreur lors de la vérification du support push'
      }))
    }
  }

  const loadSubscriptions = async () => {
    try {
      const response = await fetch('/api/push/subscribe')
      const result = await response.json()
      
      if (result.success) {
        setSubscriptions(result.data)
      }
    } catch (error) {
      console.error('Error loading push subscriptions:', error)
    }
  }

  const requestPermission = async () => {
    if (!state.supported) return

    setState(prev => ({ ...prev, loading: true, error: undefined }))

    try {
      // Request notification permission
      const permission = await Notification.requestPermission()
      
      if (permission !== 'granted') {
        setState(prev => ({
          ...prev,
          permission,
          loading: false,
          error: permission === 'denied' 
            ? 'Permission refusée. Veuillez activer les notifications dans les paramètres de votre navigateur.'
            : 'Permission requise pour envoyer des notifications push.'
        }))
        return
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Get VAPID public key
      const vapidResponse = await fetch('/api/push/send')
      const vapidResult = await vapidResponse.json()
      const publicKey = vapidResult.data.vapidPublicKey

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource
      })

      // Send subscription to server
      const subscribeResponse = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: arrayBufferToBase64(subscription.getKey('auth')!)
          },
          deviceName: deviceName || generateDeviceName(),
          userAgent: navigator.userAgent
        })
      })

      const subscribeResult = await subscribeResponse.json()
      
      if (subscribeResult.success) {
        setState(prev => ({
          ...prev,
          permission: 'granted',
          subscribed: true,
          subscription,
          loading: false
        }))
        
        // Reload subscriptions list
        loadSubscriptions()
      } else {
        throw new Error(subscribeResult.error || 'Échec de la souscription')
      }

    } catch (error: any) {
      console.error('Error requesting push permission:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Erreur lors de la demande de permission'
      }))
    }
  }

  const unsubscribe = async (subscriptionId?: number) => {
    setState(prev => ({ ...prev, loading: true, error: undefined }))

    try {
      let endpoint: string | undefined

      if (state.subscription) {
        endpoint = state.subscription.endpoint
        await state.subscription.unsubscribe()
      }

      // Remove from server
      const params = new URLSearchParams()
      if (subscriptionId) {
        params.append('id', subscriptionId.toString())
      } else if (endpoint) {
        params.append('endpoint', endpoint)
      }

      const response = await fetch(`/api/push/subscribe?${params}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          subscribed: false,
          subscription: null,
          loading: false
        }))
        
        // Reload subscriptions list
        loadSubscriptions()
      } else {
        throw new Error(result.error || 'Échec de la désinscription')
      }

    } catch (error: any) {
      console.error('Error unsubscribing from push:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Erreur lors de la désinscription'
      }))
    }
  }

  const testPushNotification = async () => {
    if (!state.subscribed) return

    setTesting(true)
    try {
      const response = await fetch('/api/user/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: 'push' })
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Échec du test')
      }

    } catch (error: any) {
      console.error('Error testing push notification:', error)
      setState(prev => ({
        ...prev,
        error: error.message || 'Erreur lors du test'
      }))
    } finally {
      setTesting(false)
    }
  }

  const generateDeviceName = (): string => {
    const platform = navigator.platform || 'Unknown'
    const browser = getBrowserName()
    return `${platform} - ${browser}`
  }

  const getBrowserName = (): string => {
    const userAgent = navigator.userAgent
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    return 'Browser'
  }

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Render different states
  if (state.loading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <LoadingSpinner size="sm" />
        <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
          Vérification du support push...
        </span>
      </div>
    )
  }

  if (!state.supported) {
    return (
      <div className={className}>
        <Alert variant="warning">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Notifications push non supportées par votre navigateur
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div className={className}>
      {state.error && (
        <Alert variant="error" className="mb-4">
          {state.error}
        </Alert>
      )}

      <div className="space-y-4">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-slate-100">
              Status des notifications push
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {state.permission === 'granted' && state.subscribed && 'Activées'}
              {state.permission === 'granted' && !state.subscribed && 'Permission accordée, non souscrit'}
              {state.permission === 'denied' && 'Permission refusée'}
              {state.permission === 'default' && 'Permission non demandée'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {state.permission === 'granted' && state.subscribed ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                ✓ Actif
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                ⚪ Inactif
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {!state.subscribed && (
            <>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Nom de l'appareil (optionnel)"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                />
              </div>
              <Button
                onClick={requestPermission}
                disabled={state.loading}
              >
                {state.loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Activation...
                  </>
                ) : (
                  'Activer les notifications push'
                )}
              </Button>
            </>
          )}

          {state.subscribed && (
            <>
              <Button
                variant="secondary"
                onClick={testPushNotification}
                disabled={testing}
              >
                {testing ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Test...
                  </>
                ) : (
                  'Tester'
                )}
              </Button>

              <Button
                variant="secondary"
                onClick={() => unsubscribe()}
                disabled={state.loading}
              >
                Désactiver
              </Button>
            </>
          )}
        </div>

        {/* Subscriptions List */}
        {subscriptions.length > 0 && (
          <div>
            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">
              Appareils enregistrés ({subscriptions.length})
            </h4>
            <div className="space-y-2">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {sub.deviceName || 'Appareil sans nom'}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Enregistré: {formatDate(sub.createdAt)}
                      {sub.lastUsed !== sub.createdAt && (
                        <span> • Dernière utilisation: {formatDate(sub.lastUsed)}</span>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => unsubscribe(sub.id)}
                    disabled={state.loading}
                  >
                    Supprimer
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p>💡 Les notifications push fonctionnent même lorsque l&apos;application est fermée.</p>
          <p>⚙️ Vous pouvez gérer les permissions dans les paramètres de votre navigateur.</p>
          <p>🔋 Les notifications respectent vos préférences d&apos;heures silencieuses.</p>
        </div>
      </div>
    </div>
  )
}

// Utility functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}
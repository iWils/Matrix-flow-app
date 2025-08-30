// Matrix Flow Service Worker for Push Notifications
const CACHE_NAME = 'matrix-flow-v1'
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Install event')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened cache')
        return cache.addAll(urlsToCache)
      })
      .catch((err) => {
        console.error('[SW] Cache installation failed:', err)
      })
  )
  // Force the waiting service worker to become the active service worker
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  // Ensure the service worker takes control of all clients immediately
  self.clients.claim()
})

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request).catch(() => {
          // Fallback for navigation requests when offline
          if (event.request.mode === 'navigate') {
            return caches.match('/')
          }
        })
      })
  )
})

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event)

  let notificationData = {
    title: 'Matrix Flow',
    body: 'Vous avez une nouvelle notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'matrix-flow-notification',
    renotify: true,
    requireInteraction: false,
    actions: [],
    data: {
      url: '/',
      timestamp: Date.now()
    }
  }

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json()
      console.log('[SW] Push data received:', pushData)

      // Update notification data with push payload
      notificationData = {
        ...notificationData,
        title: pushData.title || notificationData.title,
        body: pushData.body || pushData.message || notificationData.body,
        icon: pushData.icon || notificationData.icon,
        badge: pushData.badge || notificationData.badge,
        tag: pushData.tag || notificationData.tag,
        requireInteraction: pushData.requireInteraction || false,
        data: {
          url: pushData.url || pushData.clickTarget || '/',
          timestamp: pushData.timestamp || Date.now(),
          type: pushData.type || 'general',
          id: pushData.id,
          ...pushData.data
        }
      }

      // Add action buttons based on notification type
      if (pushData.type === 'change_request') {
        notificationData.actions = [
          {
            action: 'approve',
            title: 'Approuver',
            icon: '/icons/action-approve.png'
          },
          {
            action: 'view',
            title: 'Voir',
            icon: '/icons/action-view.png'
          }
        ]
        notificationData.requireInteraction = true
      } else if (pushData.type === 'security_alert') {
        notificationData.actions = [
          {
            action: 'view',
            title: 'Vérifier',
            icon: '/icons/action-security.png'
          }
        ]
        notificationData.requireInteraction = true
        notificationData.tag = 'security-alert'
      }

    } catch (error) {
      console.error('[SW] Error parsing push data:', error)
    }
  }

  // Show the notification
  const showNotification = self.registration.showNotification(
    notificationData.title,
    notificationData
  )

  event.waitUntil(showNotification)
})

// Notification click event - handle user interactions
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received:', event)

  const notification = event.notification
  const action = event.action
  const data = notification.data || {}

  // Close the notification
  notification.close()

  // Handle different actions
  let targetUrl = data.url || '/'

  if (action === 'approve' && data.type === 'change_request' && data.id) {
    targetUrl = `/admin/workflow/${data.id}?action=approve`
  } else if (action === 'view') {
    if (data.type === 'change_request' && data.id) {
      targetUrl = `/admin/workflow/${data.id}`
    } else if (data.type === 'security_alert') {
      targetUrl = '/admin/audit'
    }
  }

  // Focus or open the app window
  const openWindow = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((clientList) => {
    // Check if there's already a window open
    for (let i = 0; i < clientList.length; i++) {
      const client = clientList[i]
      if (client.url === targetUrl && 'focus' in client) {
        return client.focus()
      }
    }

    // If no window is open, open a new one
    if (clients.openWindow) {
      return clients.openWindow(targetUrl)
    }
  })

  event.waitUntil(openWindow)
})

// Notification close event - track dismissals
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag)
  
  const data = event.notification.data || {}
  
  // Send analytics data about notification dismissal
  if (data.id && data.type) {
    // Could send to analytics endpoint
    fetch('/api/analytics/notification-dismissed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        notificationId: data.id,
        type: data.type,
        timestamp: Date.now()
      })
    }).catch(() => {
      // Ignore errors for analytics
    })
  }
})

// Background sync event - handle offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  try {
    // Sync offline actions when connection is restored
    console.log('[SW] Performing background sync')
    
    // Could implement offline queue here
    // For now, just notify the client that connection is restored
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        timestamp: Date.now()
      })
    })
  } catch (error) {
    console.error('[SW] Background sync failed:', error)
  }
}

// Message event - handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION',
      version: CACHE_NAME
    })
  }
})

// Error handling
self.addEventListener('error', (event) => {
  console.error('[SW] Service Worker error:', event.error)
})

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason)
  event.preventDefault()
})

console.log('[SW] Service Worker loaded successfully')
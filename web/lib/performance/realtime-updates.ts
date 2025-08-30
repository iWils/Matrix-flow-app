import { EventEmitter } from 'events'
import { cache } from '@/lib/cache'

/**
 * Types d'événements temps réel pour l'historique des matrices
 */
export enum HistoryEventType {
  VERSION_CREATED = 'version_created',
  VERSION_APPROVED = 'version_approved',
  VERSION_PUBLISHED = 'version_published',
  DIFF_GENERATED = 'diff_generated',
  CACHE_INVALIDATED = 'cache_invalidated',
  BULK_OPERATION = 'bulk_operation',
  MATRIX_ARCHIVED = 'matrix_archived'
}

/**
 * Interface pour les événements d'historique
 */
export interface HistoryEvent {
  type: HistoryEventType
  matrixId: number
  userId?: number
  timestamp: Date
  data: any
  metadata?: {
    userAgent?: string
    ip?: string
    sessionId?: string
  }
}

/**
 * Manager pour les événements temps réel de l'historique
 * Utilise EventEmitter pour une gestion efficace des événements
 */
export class RealtimeHistoryManager extends EventEmitter {
  private static instance: RealtimeHistoryManager
  private connections = new Map<string, WebSocket>()
  private subscriptions = new Map<string, Set<number>>() // clientId -> Set<matrixId>
  private rateLimits = new Map<string, { count: number; resetAt: number }>()
  
  // Configuration de rate limiting
  private readonly RATE_LIMIT_WINDOW = 60000 // 1 minute
  private readonly RATE_LIMIT_MAX = 100 // 100 events per minute per client

  constructor() {
    super()
    this.setMaxListeners(1000) // Support for many concurrent connections
  }

  static getInstance(): RealtimeHistoryManager {
    if (!RealtimeHistoryManager.instance) {
      RealtimeHistoryManager.instance = new RealtimeHistoryManager()
    }
    return RealtimeHistoryManager.instance
  }

  /**
   * Ajoute une connexion WebSocket
   */
  addConnection(clientId: string, ws: WebSocket, userId?: number): void {
    this.connections.set(clientId, ws)
    this.subscriptions.set(clientId, new Set())

    ws.on('close', () => {
      this.removeConnection(clientId)
    })

    ws.on('message', (message: string) => {
      this.handleMessage(clientId, message, userId)
    })

    // Envoyer un message de bienvenue
    this.sendToClient(clientId, {
      type: 'connected',
      timestamp: new Date(),
      data: { clientId, userId }
    })
  }

  /**
   * Supprime une connexion WebSocket
   */
  removeConnection(clientId: string): void {
    this.connections.delete(clientId)
    this.subscriptions.delete(clientId)
    this.rateLimits.delete(clientId)
  }

  /**
   * Gère les messages entrants des clients
   */
  private handleMessage(clientId: string, message: string, userId?: number): void {
    try {
      const data = JSON.parse(message)
      
      switch (data.action) {
        case 'subscribe':
          this.subscribeToMatrix(clientId, data.matrixId, userId)
          break
        case 'unsubscribe':
          this.unsubscribeFromMatrix(clientId, data.matrixId)
          break
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: new Date() })
          break
        default:
          this.sendToClient(clientId, { 
            type: 'error', 
            message: 'Unknown action',
            timestamp: new Date()
          })
      }
    } catch (error) {
      this.sendToClient(clientId, { 
        type: 'error', 
        message: 'Invalid message format',
        timestamp: new Date()
      })
    }
  }

  /**
   * Abonne un client aux événements d'une matrice
   */
  async subscribeToMatrix(clientId: string, matrixId: number, userId?: number): Promise<void> {
    // Vérifier les permissions (simplified - à améliorer avec RBAC complet)
    if (userId && !await this.canAccessMatrix(userId, matrixId)) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Permission denied',
        timestamp: new Date()
      })
      return
    }

    const subscriptions = this.subscriptions.get(clientId)
    if (subscriptions) {
      subscriptions.add(matrixId)
      
      this.sendToClient(clientId, {
        type: 'subscribed',
        data: { matrixId },
        timestamp: new Date()
      })

      // Envoyer l'état actuel de la matrice
      await this.sendCurrentState(clientId, matrixId)
    }
  }

  /**
   * Désabonne un client des événements d'une matrice
   */
  unsubscribeFromMatrix(clientId: string, matrixId: number): void {
    const subscriptions = this.subscriptions.get(clientId)
    if (subscriptions) {
      subscriptions.delete(matrixId)
      
      this.sendToClient(clientId, {
        type: 'unsubscribed',
        data: { matrixId },
        timestamp: new Date()
      })
    }
  }

  /**
   * Diffuse un événement d'historique à tous les clients concernés
   */
  broadcast(event: HistoryEvent): void {
    const message = {
      type: event.type,
      matrixId: event.matrixId,
      data: event.data,
      timestamp: event.timestamp,
      metadata: event.metadata
    }

    // Trouver tous les clients abonnés à cette matrice
    const interestedClients: string[] = []
    
    for (const [clientId, subscriptions] of this.subscriptions) {
      if (subscriptions.has(event.matrixId)) {
        // Vérifier le rate limiting
        if (this.isRateLimited(clientId)) {
          continue
        }
        
        interestedClients.push(clientId)
        this.updateRateLimit(clientId)
      }
    }

    // Envoyer le message à tous les clients intéressés
    interestedClients.forEach(clientId => {
      this.sendToClient(clientId, message)
    })

    // Émettre l'événement pour d'autres parties du système
    this.emit(event.type, event)
  }

  /**
   * Envoie un événement spécifique sur une nouvelle version
   */
  notifyVersionCreated(
    matrixId: number,
    version: any,
    userId?: number,
    metadata?: any
  ): void {
    this.broadcast({
      type: HistoryEventType.VERSION_CREATED,
      matrixId,
      userId,
      timestamp: new Date(),
      data: {
        version: version.version,
        note: version.note,
        createdBy: version.createdBy,
        entryCount: version.snapshot?.entries?.length || 0
      },
      metadata
    })
  }

  /**
   * Envoie un événement sur un diff généré
   */
  notifyDiffGenerated(
    matrixId: number,
    fromVersion: number,
    toVersion: number,
    summary: any,
    userId?: number
  ): void {
    this.broadcast({
      type: HistoryEventType.DIFF_GENERATED,
      matrixId,
      userId,
      timestamp: new Date(),
      data: {
        fromVersion,
        toVersion,
        summary,
        processingTime: Date.now() // À calculer réellement
      }
    })
  }

  /**
   * Envoie un événement sur l'invalidation du cache
   */
  notifyCacheInvalidated(matrixId: number, reason: string): void {
    this.broadcast({
      type: HistoryEventType.CACHE_INVALIDATED,
      matrixId,
      timestamp: new Date(),
      data: {
        reason,
        timestamp: new Date()
      }
    })
  }

  /**
   * Envoie un message à un client spécifique
   */
  private sendToClient(clientId: string, message: any): void {
    const ws = this.connections.get(clientId)
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message))
      } catch (error) {
        console.error('Failed to send message to client:', clientId, error)
        this.removeConnection(clientId)
      }
    }
  }

  /**
   * Envoie l'état actuel d'une matrice à un client
   */
  private async sendCurrentState(clientId: string, matrixId: number): Promise<void> {
    try {
      // Récupérer les dernières informations de la matrice depuis le cache ou la DB
      const cacheKey = `matrix:current_state:${matrixId}`
      let currentState = await cache.get(cacheKey)
      
      if (!currentState) {
        // Si pas en cache, récupérer depuis la base et mettre en cache
        currentState = await this.fetchMatrixCurrentState(matrixId)
        if (currentState) {
          await cache.set(cacheKey, currentState, { ttl: 300 }) // 5 minutes
        }
      }

      if (currentState) {
        this.sendToClient(clientId, {
          type: 'current_state',
          matrixId,
          data: currentState,
          timestamp: new Date()
        })
      }
    } catch (error) {
      console.error('Failed to send current state:', error)
    }
  }

  /**
   * Récupère l'état actuel d'une matrice
   */
  private async fetchMatrixCurrentState(matrixId: number): Promise<any> {
    // Ici, on ferait appel à Prisma pour récupérer l'état actuel
    // Pour l'instant, retournons un état fictif
    return {
      currentVersion: 1,
      totalVersions: 1,
      lastModified: new Date(),
      status: 'active'
    }
  }

  /**
   * Vérifie si un client peut accéder à une matrice
   */
  private async canAccessMatrix(userId: number, matrixId: number): Promise<boolean> {
    // Ici, on ferait un vrai check avec le système RBAC
    // Pour l'instant, retournons true (à améliorer)
    return true
  }

  /**
   * Vérifie si un client est rate-limited
   */
  private isRateLimited(clientId: string): boolean {
    const limit = this.rateLimits.get(clientId)
    if (!limit) return false

    const now = Date.now()
    if (now > limit.resetAt) {
      this.rateLimits.delete(clientId)
      return false
    }

    return limit.count >= this.RATE_LIMIT_MAX
  }

  /**
   * Met à jour le compteur de rate limiting
   */
  private updateRateLimit(clientId: string): void {
    const now = Date.now()
    const limit = this.rateLimits.get(clientId)

    if (!limit || now > limit.resetAt) {
      this.rateLimits.set(clientId, {
        count: 1,
        resetAt: now + this.RATE_LIMIT_WINDOW
      })
    } else {
      limit.count++
    }
  }

  /**
   * Retourne les statistiques des connexions
   */
  getStats(): {
    totalConnections: number
    totalSubscriptions: number
    rateLimitedClients: number
    eventTypes: Record<string, number>
  } {
    const rateLimitedClients = Array.from(this.rateLimits.values())
      .filter(limit => Date.now() <= limit.resetAt && limit.count >= this.RATE_LIMIT_MAX)
      .length

    let totalSubscriptions = 0
    for (const subs of this.subscriptions.values()) {
      totalSubscriptions += subs.size
    }

    return {
      totalConnections: this.connections.size,
      totalSubscriptions,
      rateLimitedClients,
      eventTypes: {} // À implémenter pour tracker les types d'événements
    }
  }

  /**
   * Ferme toutes les connexions
   */
  shutdown(): void {
    for (const [clientId, ws] of this.connections) {
      try {
        ws.close()
      } catch (error) {
        console.error('Error closing WebSocket connection:', clientId, error)
      }
    }
    
    this.connections.clear()
    this.subscriptions.clear()
    this.rateLimits.clear()
    this.removeAllListeners()
  }
}

// Instance singleton
export const realtimeHistoryManager = RealtimeHistoryManager.getInstance()

// Types pour l'utilisation côté client
export interface RealtimeHistoryClient {
  connect(userId?: number): Promise<void>
  disconnect(): void
  subscribeToMatrix(matrixId: number): void
  unsubscribeFromMatrix(matrixId: number): void
  onEvent(eventType: HistoryEventType, callback: (data: any) => void): void
  removeListener(eventType: HistoryEventType, callback: (data: any) => void): void
}
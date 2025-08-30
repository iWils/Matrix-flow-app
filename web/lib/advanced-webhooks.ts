import { prisma } from './db'
import { logger } from './logger'
import { auditLog } from './audit'
import { NotificationPreferenceService } from './notification-preferences'

export interface WebhookPayload {
  event: string
  timestamp: string
  data: Record<string, unknown>
  metadata: {
    version: string
    source: string
    environment: string
    requestId: string
  }
}

export interface WebhookTemplate {
  id: string
  name: string
  description: string
  events: string[]
  payloadTransform: string // JavaScript code for transforming payload
  headers: Record<string, string>
  retryPolicy: RetryPolicy
  enabled: boolean
}

export interface RetryPolicy {
  maxRetries: number
  initialDelay: number // milliseconds
  maxDelay: number // milliseconds
  backoffMultiplier: number
  enableCircuitBreaker: boolean
  circuitBreakerThreshold: number
  circuitBreakerTimeout: number // milliseconds
}

export interface WebhookDelivery {
  id: string
  webhookUrl: string
  event: string
  payload: WebhookPayload
  attempt: number
  maxRetries: number
  status: 'pending' | 'delivered' | 'failed' | 'circuit_open'
  statusCode?: number
  responseTime?: number
  errorMessage?: string
  nextRetryAt?: Date
  deliveredAt?: Date
  createdAt: Date
}

export interface WebhookStats {
  totalDeliveries: number
  successRate: number
  averageResponseTime: number
  failedDeliveries: number
  activeCircuitBreakers: number
}

class CircuitBreaker {
  private failures = 0
  private lastFailureTime?: Date
  private state: 'closed' | 'open' | 'half_open' = 'closed'
  
  constructor(
    private threshold: number,
    private timeout: number
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half_open'
      } else {
        throw new Error('Circuit breaker is open')
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false
    return Date.now() - this.lastFailureTime.getTime() > this.timeout
  }

  private onSuccess(): void {
    this.failures = 0
    this.state = 'closed'
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = new Date()
    
    if (this.failures >= this.threshold) {
      this.state = 'open'
    }
  }

  get isOpen(): boolean {
    return this.state === 'open'
  }
}

export class AdvancedWebhookService {
  private circuitBreakers = new Map<string, CircuitBreaker>()
  private deliveryQueue: WebhookDelivery[] = []
  private processing = false
  
  private readonly DEFAULT_RETRY_POLICY: RetryPolicy = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    enableCircuitBreaker: true,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 300000 // 5 minutes
  }

  /**
   * Send webhook with advanced retry and circuit breaker logic
   */
  async sendWebhook(
    webhookUrl: string,
    event: string,
    data: Record<string, unknown>,
    options: {
      userId?: number
      retryPolicy?: Partial<RetryPolicy>
      headers?: Record<string, string>
      transform?: string
      secret?: string
    } = {}
  ): Promise<WebhookDelivery> {
    const payload = this.buildPayload(event, data)
    const retryPolicy = { ...this.DEFAULT_RETRY_POLICY, ...options.retryPolicy }
    
    const delivery: WebhookDelivery = {
      id: this.generateDeliveryId(),
      webhookUrl,
      event,
      payload,
      attempt: 0,
      maxRetries: retryPolicy.maxRetries,
      status: 'pending',
      createdAt: new Date()
    }

    // Apply payload transformation if provided
    if (options.transform) {
      try {
        delivery.payload = this.transformPayload(payload, options.transform)
      } catch (error) {
        logger.error('Webhook payload transformation failed', error, {
          webhookUrl,
          event,
          transform: options.transform
        })
        delivery.status = 'failed'
        delivery.errorMessage = `Transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`
        return delivery
      }
    }

    // Add to delivery queue
    this.deliveryQueue.push(delivery)
    
    // Start processing if not already running
    if (!this.processing) {
      this.processDeliveryQueue()
    }

    // Log webhook creation
    if (options.userId) {
      await auditLog({
        userId: options.userId,
        entity: 'webhook_delivery',
        entityId: 0,
        action: 'create',
        changes: {
          event,
          webhookUrl: this.maskUrl(webhookUrl),
          deliveryId: delivery.id,
          status: delivery.status
        }
      })
    }

    return delivery
  }

  /**
   * Send webhook to all configured endpoints for an event
   */
  async broadcastWebhook(
    event: string,
    data: Record<string, unknown>,
    options: {
      userId?: number
      sourceUserId?: number
    } = {}
  ): Promise<WebhookDelivery[]> {
    const webhooks = await NotificationPreferenceService.getWebhooksForEvent(event)
    const deliveries: WebhookDelivery[] = []

    for (const webhook of webhooks) {
      try {
        const delivery = await this.sendWebhook(
          webhook.webhookUrl,
          event,
          data,
          {
            userId: options.sourceUserId || webhook.userId,
            secret: webhook.webhookSecret
          }
        )
        deliveries.push(delivery)
      } catch (error) {
        logger.error('Failed to send webhook', error, {
          webhookUrl: this.maskUrl(webhook.webhookUrl),
          event,
          userId: webhook.userId
        })
      }
    }

    return deliveries
  }

  /**
   * Process delivery queue with retries and circuit breaker
   */
  private async processDeliveryQueue(): Promise<void> {
    if (this.processing) return
    this.processing = true

    try {
      while (this.deliveryQueue.length > 0) {
        const delivery = this.deliveryQueue.shift()
        if (!delivery) continue

        // Skip if too many retries
        if (delivery.attempt >= delivery.maxRetries) {
          delivery.status = 'failed'
          delivery.errorMessage = 'Max retries exceeded'
          await this.saveDeliveryResult(delivery)
          continue
        }

        // Check if we should retry now
        if (delivery.nextRetryAt && delivery.nextRetryAt > new Date()) {
          this.deliveryQueue.push(delivery) // Re-queue for later
          continue
        }

        await this.attemptDelivery(delivery)
      }
    } finally {
      this.processing = false
    }

    // Schedule next processing if queue has items
    if (this.deliveryQueue.length > 0) {
      setTimeout(() => this.processDeliveryQueue(), 5000)
    }
  }

  /**
   * Attempt single webhook delivery
   */
  private async attemptDelivery(delivery: WebhookDelivery): Promise<void> {
    const circuitBreaker = this.getCircuitBreaker(delivery.webhookUrl)
    delivery.attempt++

    try {
      const result = await circuitBreaker.execute(async () => {
        return this.executeWebhookRequest(delivery)
      })

      delivery.status = 'delivered'
      delivery.statusCode = result.statusCode
      delivery.responseTime = result.responseTime
      delivery.deliveredAt = new Date()

      logger.info('Webhook delivered successfully', {
        deliveryId: delivery.id,
        webhookUrl: this.maskUrl(delivery.webhookUrl),
        event: delivery.event,
        attempt: delivery.attempt,
        statusCode: result.statusCode,
        responseTime: result.responseTime
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (circuitBreaker.isOpen) {
        delivery.status = 'circuit_open'
        delivery.errorMessage = 'Circuit breaker is open'
      } else if (delivery.attempt >= delivery.maxRetries) {
        delivery.status = 'failed'
        delivery.errorMessage = errorMessage
      } else {
        // Schedule retry
        delivery.status = 'pending'
        delivery.errorMessage = errorMessage
        delivery.nextRetryAt = this.calculateNextRetry(delivery.attempt)
        this.deliveryQueue.push(delivery)
        return // Don't save yet, will retry
      }

      logger.error('Webhook delivery failed', error, {
        deliveryId: delivery.id,
        webhookUrl: this.maskUrl(delivery.webhookUrl),
        event: delivery.event,
        attempt: delivery.attempt,
        finalStatus: delivery.status
      })
    }

    await this.saveDeliveryResult(delivery)
  }

  /**
   * Execute HTTP request for webhook
   */
  private async executeWebhookRequest(delivery: WebhookDelivery): Promise<{
    statusCode: number
    responseTime: number
  }> {
    const startTime = Date.now()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Matrix Flow Webhook v1.0',
      'X-Matrix-Flow-Event': delivery.event,
      'X-Matrix-Flow-Delivery-Id': delivery.id,
      'X-Matrix-Flow-Attempt': delivery.attempt.toString(),
      'X-Matrix-Flow-Timestamp': delivery.payload.timestamp
    }

    // Add webhook signature if secret is available
    // This would be implemented with HMAC-SHA256
    // headers['X-Matrix-Flow-Signature'] = this.generateSignature(payload, secret)

    const response = await fetch(delivery.webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(delivery.payload),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    const responseTime = Date.now() - startTime

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return {
      statusCode: response.status,
      responseTime
    }
  }

  /**
   * Get or create circuit breaker for URL
   */
  private getCircuitBreaker(webhookUrl: string): CircuitBreaker {
    const key = this.hashUrl(webhookUrl)
    
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, new CircuitBreaker(
        this.DEFAULT_RETRY_POLICY.circuitBreakerThreshold,
        this.DEFAULT_RETRY_POLICY.circuitBreakerTimeout
      ))
    }

    return this.circuitBreakers.get(key)!
  }

  /**
   * Calculate next retry time with exponential backoff
   */
  private calculateNextRetry(attempt: number): Date {
    const delay = Math.min(
      this.DEFAULT_RETRY_POLICY.initialDelay * 
      Math.pow(this.DEFAULT_RETRY_POLICY.backoffMultiplier, attempt - 1),
      this.DEFAULT_RETRY_POLICY.maxDelay
    )
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay
    const totalDelay = delay + jitter

    return new Date(Date.now() + totalDelay)
  }

  /**
   * Build standardized webhook payload
   */
  private buildPayload(event: string, data: Record<string, unknown>): WebhookPayload {
    return {
      event,
      timestamp: new Date().toISOString(),
      data,
      metadata: {
        version: '1.0',
        source: 'matrix-flow',
        environment: process.env.NODE_ENV || 'development',
        requestId: this.generateRequestId()
      }
    }
  }

  /**
   * Transform payload using custom JavaScript code
   */
  private transformPayload(payload: WebhookPayload, transformCode: string): WebhookPayload {
    // Create safe execution context
    const context = {
      payload: JSON.parse(JSON.stringify(payload)),
      // Add utility functions
      utils: {
        formatDate: (date: string | Date) => new Date(date).toISOString(),
        maskEmail: (email: string) => email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
        truncate: (str: string, length: number) => str.length > length ? str.substring(0, length) + '...' : str
      }
    }

    try {
      // Execute transformation code in controlled environment
      const fn = new Function('context', `
        with (context) {
          ${transformCode}
          return payload;
        }
      `)
      
      return fn(context)
    } catch (error) {
      throw new Error(`Payload transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Save delivery result to database
   */
  private async saveDeliveryResult(delivery: WebhookDelivery): Promise<void> {
    try {
      await prisma.webhookDelivery.create({
        data: {
          id: delivery.id,
          webhookUrl: delivery.webhookUrl,
          event: delivery.event,
          payload: delivery.payload as any,
          attempt: delivery.attempt,
          status: delivery.status,
          statusCode: delivery.statusCode,
          responseTime: delivery.responseTime,
          errorMessage: delivery.errorMessage,
          deliveredAt: delivery.deliveredAt,
          createdAt: delivery.createdAt
        }
      })
    } catch (error) {
      logger.error('Failed to save webhook delivery result', error, {
        deliveryId: delivery.id,
        status: delivery.status
      })
    }
  }

  /**
   * Get webhook delivery statistics
   */
  async getWebhookStats(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<WebhookStats> {
    const now = new Date()
    const timeRanges = {
      hour: new Date(now.getTime() - 60 * 60 * 1000),
      day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    const since = timeRanges[timeRange]

    const stats = await prisma.webhookDelivery.groupBy({
      by: ['status'],
      _count: true,
      _avg: {
        responseTime: true
      },
      where: {
        createdAt: {
          gte: since
        }
      }
    })

    const totalDeliveries = stats.reduce((sum, stat) => sum + stat._count, 0)
    const successfulDeliveries = stats.find(s => s.status === 'delivered')?._count || 0
    const failedDeliveries = stats.find(s => s.status === 'failed')?._count || 0
    const avgResponseTime = stats.find(s => s.status === 'delivered')?._avg.responseTime || 0

    return {
      totalDeliveries,
      successRate: totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0,
      averageResponseTime: avgResponseTime,
      failedDeliveries,
      activeCircuitBreakers: Array.from(this.circuitBreakers.values()).filter(cb => cb.isOpen).length
    }
  }

  /**
   * Get recent webhook deliveries for monitoring
   */
  async getRecentDeliveries(limit = 50): Promise<WebhookDelivery[]> {
    const deliveries = await prisma.webhookDelivery.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    })

    return deliveries.map(d => ({
      ...d,
      payload: d.payload as WebhookPayload,
      webhookUrl: this.maskUrl(d.webhookUrl)
    }))
  }

  // Utility methods
  private generateDeliveryId(): string {
    return `whd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private maskUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}***`
    } catch {
      return url.substring(0, 20) + '***'
    }
  }

  private hashUrl(url: string): string {
    // Simple hash function for circuit breaker keys
    let hash = 0
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString()
  }
}

// Global service instance
export const advancedWebhookService = new AdvancedWebhookService()

// Export utility functions
export const webhooks = {
  send: (url: string, event: string, data: Record<string, unknown>, options?: any) => 
    advancedWebhookService.sendWebhook(url, event, data, options),
    
  broadcast: (event: string, data: Record<string, unknown>, options?: any) =>
    advancedWebhookService.broadcastWebhook(event, data, options),
    
  getStats: (timeRange?: 'hour' | 'day' | 'week' | 'month') =>
    advancedWebhookService.getWebhookStats(timeRange),
    
  getRecent: (limit?: number) =>
    advancedWebhookService.getRecentDeliveries(limit)
}
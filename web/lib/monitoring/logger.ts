import { prisma } from '@/lib/db'
import { cache } from '@/lib/cache'

// Types pour le logging structuré
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'
export type LogCategory = 'security' | 'auth' | 'api' | 'database' | 'system'

export interface LogEntry {
  id?: string
  level: LogLevel
  category: LogCategory
  message: string
  timestamp: Date
  userId?: number
  ipAddress?: string
  userAgent?: string
  requestId?: string
  sessionId?: string
  metadata?: Record<string, unknown>
  error?: {
    name: string
    message: string
    stack?: string
  }
}

export interface LogFilter {
  level?: LogLevel[]
  category?: LogCategory[]
  userId?: number
  dateFrom?: Date
  dateTo?: Date
  search?: string
  limit?: number
  offset?: number
}

export class StructuredLogger {
  private static readonly MAX_LOGS_IN_MEMORY = 1000
  private static readonly LOG_RETENTION_DAYS = 90
  private static readonly BATCH_SIZE = 100
  private static logBuffer: LogEntry[] = []
  private static flushTimer: NodeJS.Timeout | null = null

  // Niveaux de log avec priorités
  private static readonly LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4
  }

  private static readonly LOG_LEVEL_THRESHOLD = 
    process.env.LOG_LEVEL?.toLowerCase() as LogLevel || 'info'

  // Méthodes de logging principales
  static debug(category: LogCategory, message: string, metadata?: Record<string, unknown>) {
    this.log('debug', category, message, metadata)
  }

  static info(category: LogCategory, message: string, metadata?: Record<string, unknown>) {
    this.log('info', category, message, metadata)
  }

  static warn(category: LogCategory, message: string, metadata?: Record<string, unknown>) {
    this.log('warn', category, message, metadata)
  }

  static error(category: LogCategory, message: string, error?: Error, metadata?: Record<string, unknown>) {
    this.log('error', category, message, metadata, error)
  }

  static fatal(category: LogCategory, message: string, error?: Error, metadata?: Record<string, unknown>) {
    this.log('fatal', category, message, metadata, error)
  }

  // Méthode de logging principale
  static log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error,
    context?: {
      userId?: number
      ipAddress?: string
      userAgent?: string
      requestId?: string
      sessionId?: string
    }
  ) {
    // Vérifier le niveau de log
    if (this.LOG_LEVELS[level] < this.LOG_LEVELS[this.LOG_LEVEL_THRESHOLD]) {
      return
    }

    const logEntry: LogEntry = {
      level,
      category,
      message,
      timestamp: new Date(),
      ...context,
      metadata,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      })
    }

    // Log vers la console (avec formatage)
    this.logToConsole(logEntry)

    // Ajouter au buffer pour persistence
    this.logBuffer.push(logEntry)

    // Déclencher le flush si nécessaire
    if (this.logBuffer.length >= this.BATCH_SIZE) {
      this.flushLogs()
    } else {
      this.scheduleFlush()
    }

    // Pour les erreurs critiques, flush immédiatement
    if (level === 'fatal' || level === 'error') {
      this.flushLogs()
    }
  }

  // Formatage pour la console
  private static logToConsole(entry: LogEntry) {
    const timestamp = entry.timestamp.toISOString()
    const level = entry.level.toUpperCase().padEnd(5)
    const category = entry.category.toUpperCase().padEnd(8)
    
    let message = `[${timestamp}] ${level} ${category} ${entry.message}`
    
    if (entry.userId) {
      message += ` (User: ${entry.userId})`
    }
    
    if (entry.ipAddress) {
      message += ` (IP: ${entry.ipAddress})`
    }
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      message += ` ${JSON.stringify(entry.metadata)}`
    }

    // Utiliser la bonne méthode console selon le niveau
    switch (entry.level) {
      case 'debug':
        console.debug(message)
        break
      case 'info':
        console.info(message)
        break
      case 'warn':
        console.warn(message)
        break
      case 'error':
      case 'fatal':
        console.error(message)
        if (entry.error?.stack) {
          console.error(entry.error.stack)
        }
        break
    }
  }

  // Planifier le flush des logs
  private static scheduleFlush() {
    if (this.flushTimer) return

    this.flushTimer = setTimeout(() => {
      this.flushLogs()
    }, 5000) // Flush toutes les 5 secondes
  }

  // Sauvegarder les logs en base de données
  private static async flushLogs() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    if (this.logBuffer.length === 0) return

    const logsToFlush = [...this.logBuffer]
    this.logBuffer = []

    try {
      // Sauvegarder en base de données
      await prisma.systemLog.createMany({
        data: logsToFlush.map(log => ({
          level: log.level,
          category: log.category,
          message: log.message,
          timestamp: log.timestamp,
          userId: log.userId,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          requestId: log.requestId,
          sessionId: log.sessionId,
          metadata: log.metadata ? JSON.stringify(log.metadata) : null,
          errorName: log.error?.name,
          errorMessage: log.error?.message,
          errorStack: log.error?.stack
        }))
      })

      // Mettre en cache les logs récents pour performance
      const cacheKey = 'recent_logs'
      const recentLogs = await this.getRecentLogsFromCache()
      const updatedLogs = [...logsToFlush, ...recentLogs].slice(0, this.MAX_LOGS_IN_MEMORY)
      
      await cache.set(cacheKey, updatedLogs, { ttl: 3600 }) // 1 heure

    } catch (error) {
      // En cas d'erreur de sauvegarde, remettre les logs dans le buffer
      this.logBuffer = [...logsToFlush, ...this.logBuffer]
      console.error('Failed to flush logs to database:', error)
    }
  }

  // Récupérer les logs récents depuis le cache
  private static async getRecentLogsFromCache(): Promise<LogEntry[]> {
    try {
      const cached = await cache.get<LogEntry[]>('recent_logs')
      return cached || []
    } catch {
      return []
    }
  }

  // Récupérer les logs avec filtres
  static async getLogs(filter: LogFilter = {}): Promise<{
    logs: LogEntry[]
    total: number
    hasMore: boolean
  }> {
    const {
      level = [],
      category = [],
      userId,
      dateFrom,
      dateTo,
      search,
      limit = 50,
      offset = 0
    } = filter

    try {
      // Construire la requête WHERE
      const where: Record<string, unknown> = {}
      
      if (level.length > 0) {
        where.level = { in: level }
      }
      
      if (category.length > 0) {
        where.category = { in: category }
      }
      
      if (userId) {
        where.userId = userId
      }
      
      if (dateFrom || dateTo) {
        where.timestamp = {}
        if (dateFrom) {
          (where.timestamp as Record<string, unknown>).gte = dateFrom
        }
        if (dateTo) {
          (where.timestamp as Record<string, unknown>).lte = dateTo
        }
      }
      
      if (search) {
        where.OR = [
          { message: { contains: search, mode: 'insensitive' } },
          { errorMessage: { contains: search, mode: 'insensitive' } }
        ]
      }

      // Compter le total
      const total = await prisma.systemLog.count({ where })

      // Récupérer les logs
      const logs = await prisma.systemLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              username: true,
              fullName: true
            }
          }
        }
      })

      const formattedLogs: LogEntry[] = logs.map(log => ({
        id: log.id,
        level: log.level as LogLevel,
        category: log.category as LogCategory,
        message: log.message,
        timestamp: log.timestamp,
        userId: log.userId || undefined,
        ipAddress: log.ipAddress || undefined,
        userAgent: log.userAgent || undefined,
        requestId: log.requestId || undefined,
        sessionId: log.sessionId || undefined,
        metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
        ...(log.errorName && {
          error: {
            name: log.errorName,
            message: log.errorMessage || '',
            stack: log.errorStack || undefined
          }
        })
      }))

      return {
        logs: formattedLogs,
        total,
        hasMore: offset + logs.length < total
      }

    } catch (error) {
      console.error('Error retrieving logs:', error)
      throw error
    }
  }

  // Nettoyer les anciens logs
  static async cleanupOldLogs(): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.LOG_RETENTION_DAYS)

      const result = await prisma.systemLog.deleteMany({
        where: {
          timestamp: { lt: cutoffDate }
        }
      })

      this.info('system', `Cleaned up ${result.count} old log entries`, {
        cutoffDate: cutoffDate.toISOString(),
        retentionDays: this.LOG_RETENTION_DAYS
      })

      return result.count

    } catch (error) {
      this.error('system', 'Failed to cleanup old logs', error instanceof Error ? error : undefined)
      throw error
    }
  }

  // Obtenir les statistiques des logs
  static async getLogStatistics(days: number = 7): Promise<{
    totalLogs: number
    logsByLevel: Record<LogLevel, number>
    logsByCategory: Record<LogCategory, number>
    logsByDay: Array<{ date: string; count: number }>
    topErrors: Array<{ error: string; count: number }>
  }> {
    try {
      const since = new Date()
      since.setDate(since.getDate() - days)

      const logs = await prisma.systemLog.findMany({
        where: { timestamp: { gte: since } },
        select: {
          level: true,
          category: true,
          timestamp: true,
          errorName: true,
          errorMessage: true
        }
      })

      const stats = {
        totalLogs: logs.length,
        logsByLevel: {} as Record<LogLevel, number>,
        logsByCategory: {} as Record<LogCategory, number>,
        logsByDay: [] as Array<{ date: string; count: number }>,
        topErrors: [] as Array<{ error: string; count: number }>
      }

      // Initialiser les compteurs
      Object.keys(this.LOG_LEVELS).forEach(level => {
        stats.logsByLevel[level as LogLevel] = 0
      })

      // Compter par niveau et catégorie
      const dayCount: Record<string, number> = {}
      const errorCount: Record<string, number> = {}

      logs.forEach(log => {
        stats.logsByLevel[log.level as LogLevel]++
        stats.logsByCategory[log.category as LogCategory] = 
          (stats.logsByCategory[log.category as LogCategory] || 0) + 1

        // Compter par jour
        const day = log.timestamp.toISOString().split('T')[0]
        dayCount[day] = (dayCount[day] || 0) + 1

        // Compter les erreurs
        if (log.errorName) {
          const errorKey = `${log.errorName}: ${log.errorMessage || 'Unknown error'}`
          errorCount[errorKey] = (errorCount[errorKey] || 0) + 1
        }
      })

      // Formater les résultats
      stats.logsByDay = Object.entries(dayCount)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }))

      stats.topErrors = Object.entries(errorCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([error, count]) => ({ error, count }))

      return stats

    } catch (error) {
      this.error('system', 'Failed to get log statistics', error instanceof Error ? error : undefined)
      throw error
    }
  }

  // Forcer le flush des logs en attente
  static async forceFlush(): Promise<void> {
    await this.flushLogs()
  }

  // Obtenir le niveau de log actuel
  static getLogLevel(): LogLevel {
    return this.LOG_LEVEL_THRESHOLD
  }

  // Définir le niveau de log
  static setLogLevel(level: LogLevel): void {
    // Note: Dans un vrai système, ceci devrait être persisté
    process.env.LOG_LEVEL = level
  }
}

// Créer des helpers spécialisés pour différents domaines
export const SecurityLogger = {
  loginAttempt: (userId: number, success: boolean, ipAddress: string, userAgent: string) =>
    StructuredLogger.info('security', 
      success ? 'Login successful' : 'Login failed', 
      { userId, success, ipAddress, userAgent }
    ),

  rateLimitExceeded: (type: string, identifier: string, ipAddress: string) =>
    StructuredLogger.warn('security', 'Rate limit exceeded', 
      { type, identifier, ipAddress }
    ),

  suspiciousActivity: (description: string, userId?: number, ipAddress?: string, metadata?: Record<string, unknown>) =>
    StructuredLogger.error('security', `Suspicious activity: ${description}`, 
      undefined, { userId, ipAddress, ...metadata }
    ),

  sessionCreated: (sessionId: string, userId: number, ipAddress: string, deviceFingerprint?: string) =>
    StructuredLogger.info('security', 'Session created', 
      { sessionId, userId, ipAddress, deviceFingerprint }
    ),

  sessionTerminated: (sessionId: string, userId: number, reason: string) =>
    StructuredLogger.info('security', 'Session terminated', 
      { sessionId, userId, reason }
    )
}

export default StructuredLogger
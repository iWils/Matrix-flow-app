import { prisma } from '@/lib/db'
import { cache } from '@/lib/cache'
import fs from 'fs/promises'
import os from 'os'

// Types pour les vérifications de santé
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: Date
  responseTime?: number
  error?: string
  metadata?: Record<string, unknown>
}

export interface SystemHealth {
  overall: HealthStatus
  services: {
    database: HealthStatus
    redis: HealthStatus
    fileSystem: HealthStatus
    memory: HealthStatus
    cpu: HealthStatus
  }
  uptime: number
  version: string
}

export class HealthCheckManager {
  private static readonly MAX_RESPONSE_TIME = 5000 // 5 seconds
  private static readonly MEMORY_THRESHOLD = 0.9 // 90%
  private static readonly CPU_THRESHOLD = 0.95 // 95%
  private static startTime = Date.now()

  // Vérification de la base de données
  static async checkDatabase(): Promise<HealthStatus> {
    const startTime = Date.now()
    
    try {
      // Test de connexion simple
      await prisma.$queryRaw`SELECT 1`
      
      // Test plus complexe avec une vraie table
      const userCount = await prisma.user.count()
      
      const responseTime = Date.now() - startTime
      
      return {
        status: responseTime < this.MAX_RESPONSE_TIME ? 'healthy' : 'degraded',
        timestamp: new Date(),
        responseTime,
        metadata: {
          userCount,
          connectionStatus: 'connected'
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Database connection failed',
        metadata: {
          connectionStatus: 'disconnected'
        }
      }
    }
  }

  // Vérification de Redis
  static async checkRedis(): Promise<HealthStatus> {
    const startTime = Date.now()
    
    try {
      // Test simple de ping
      const testKey = 'health_check_test'
      const testValue = Date.now().toString()
      
      await cache.set(testKey, testValue, { ttl: 60 })
      const retrievedValue = await cache.get<string>(testKey)
      await cache.del(testKey)
      
      const responseTime = Date.now() - startTime
      
      if (retrievedValue !== testValue) {
        throw new Error('Redis data integrity test failed')
      }
      
      return {
        status: responseTime < this.MAX_RESPONSE_TIME ? 'healthy' : 'degraded',
        timestamp: new Date(),
        responseTime,
        metadata: {
          connectionStatus: 'connected',
          memoryInfo: await this.getRedisMemoryInfo()
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Redis connection failed',
        metadata: {
          connectionStatus: 'disconnected'
        }
      }
    }
  }

  // Vérification du système de fichiers
  static async checkFileSystem(): Promise<HealthStatus> {
    const startTime = Date.now()
    
    try {
      const testFile = '/tmp/health_check_test.txt'
      const testData = `Health check test - ${Date.now()}`
      
      // Test d'écriture
      await fs.writeFile(testFile, testData)
      
      // Test de lecture
      const readData = await fs.readFile(testFile, 'utf-8')
      
      // Nettoyage
      await fs.unlink(testFile)
      
      const responseTime = Date.now() - startTime
      
      if (readData !== testData) {
        throw new Error('File system integrity test failed')
      }
      
      // Vérifier l'espace disque disponible
      await fs.stat(process.cwd())
      
      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded', // File system should be fast
        timestamp: new Date(),
        responseTime,
        metadata: {
          diskSpace: await this.getDiskSpaceInfo(),
          testPath: testFile
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'File system test failed'
      }
    }
  }

  // Vérification de la mémoire
  static async checkMemory(): Promise<HealthStatus> {
    try {
      const memInfo = process.memoryUsage()
      const systemMemory = os.totalmem()
      const freeMemory = os.freemem()
      const usedSystemMemory = systemMemory - freeMemory
      const systemMemoryUsage = usedSystemMemory / systemMemory
      
      // Vérifier l'usage mémoire du processus Node.js
      const heapUsage = memInfo.heapUsed / memInfo.heapTotal
      
      let status: HealthStatus['status'] = 'healthy'
      
      if (systemMemoryUsage > this.MEMORY_THRESHOLD || heapUsage > 0.9) {
        status = 'unhealthy'
      } else if (systemMemoryUsage > 0.8 || heapUsage > 0.8) {
        status = 'degraded'
      }
      
      return {
        status,
        timestamp: new Date(),
        metadata: {
          processMemory: {
            heapUsed: Math.round(memInfo.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memInfo.heapTotal / 1024 / 1024), // MB
            heapUsagePercent: Math.round(heapUsage * 100)
          },
          systemMemory: {
            total: Math.round(systemMemory / 1024 / 1024), // MB
            used: Math.round(usedSystemMemory / 1024 / 1024), // MB
            free: Math.round(freeMemory / 1024 / 1024), // MB
            usagePercent: Math.round(systemMemoryUsage * 100)
          }
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Memory check failed'
      }
    }
  }

  // Vérification du CPU
  static async checkCPU(): Promise<HealthStatus> {
    try {
      const cpus = os.cpus()
      const loadAverage = os.loadavg()
      const numCPUs = cpus.length
      
      // Load average pour la dernière minute, normalisé par le nombre de CPUs
      const normalizedLoad = loadAverage[0] / numCPUs
      
      let status: HealthStatus['status'] = 'healthy'
      
      if (normalizedLoad > this.CPU_THRESHOLD) {
        status = 'unhealthy'
      } else if (normalizedLoad > 0.8) {
        status = 'degraded'
      }
      
      return {
        status,
        timestamp: new Date(),
        metadata: {
          cpuCount: numCPUs,
          loadAverage: {
            '1min': Math.round(loadAverage[0] * 100) / 100,
            '5min': Math.round(loadAverage[1] * 100) / 100,
            '15min': Math.round(loadAverage[2] * 100) / 100
          },
          normalizedLoad: Math.round(normalizedLoad * 100) / 100,
          cpuModel: cpus[0]?.model || 'Unknown'
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'CPU check failed'
      }
    }
  }

  // Vérification complète du système
  static async checkSystemHealth(): Promise<SystemHealth> {
    const [database, redis, fileSystem, memory, cpu] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkFileSystem(),
      this.checkMemory(),
      this.checkCPU()
    ])

    // Déterminer le statut global
    const services = { database, redis, fileSystem, memory, cpu }
    const statuses = Object.values(services).map(s => s.status)
    
    let overallStatus: HealthStatus['status'] = 'healthy'
    
    if (statuses.includes('unhealthy')) {
      overallStatus = 'unhealthy'
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded'
    }

    const uptime = Math.floor((Date.now() - this.startTime) / 1000)
    
    return {
      overall: {
        status: overallStatus,
        timestamp: new Date()
      },
      services,
      uptime,
      version: process.env.npm_package_version || '1.0.0'
    }
  }

  // Helpers privés
  private static async getRedisMemoryInfo(): Promise<Record<string, unknown>> {
    try {
      const info = await cache.info()
      if (!info) return { status: 'unavailable' }
      
      // Parser les informations mémoire Redis (format simple)
      const memoryLines = info.split('\n').filter(line => 
        line.includes('used_memory') || line.includes('maxmemory')
      )
      
      const memoryInfo: Record<string, unknown> = {}
      memoryLines.forEach(line => {
        const [key, value] = line.split(':')
        if (key && value) {
          memoryInfo[key.trim()] = value.trim()
        }
      })
      
      return memoryInfo
    } catch {
      return { status: 'unavailable' }
    }
  }

  private static async getDiskSpaceInfo(): Promise<Record<string, unknown>> {
    try {
      // Simple check - in production you'd use statvfs or similar
      await fs.stat(process.cwd())
      return {
        accessible: true,
        path: process.cwd(),
        // Note: Getting actual disk space requires additional libraries or system calls
        status: 'accessible'
      }
    } catch {
      return {
        accessible: false,
        status: 'inaccessible'
      }
    }
  }

  // Endpoint de santé simple (pour load balancers, etc.)
  static async getSimpleHealth(): Promise<{ status: 'ok' | 'error'; uptime: number }> {
    try {
      // Test rapide de la base de données
      await prisma.$queryRaw`SELECT 1`
      
      return {
        status: 'ok',
        uptime: Math.floor((Date.now() - this.startTime) / 1000)
      }
    } catch {
      return {
        status: 'error',
        uptime: Math.floor((Date.now() - this.startTime) / 1000)
      }
    }
  }

  // Méthodes pour les métriques
  static getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000)
  }

  static getMemoryStats(): Record<string, number> {
    const memInfo = process.memoryUsage()
    return {
      heapUsed: Math.round(memInfo.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memInfo.heapTotal / 1024 / 1024), // MB
      external: Math.round(memInfo.external / 1024 / 1024), // MB
      rss: Math.round(memInfo.rss / 1024 / 1024) // MB
    }
  }
}

export default HealthCheckManager
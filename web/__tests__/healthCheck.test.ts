import { describe, test, expect, beforeEach, vi } from 'vitest'
import { HealthCheckManager } from '../lib/monitoring/healthCheck'

// Mock dependencies
const mockPrismaQueryRaw = vi.fn()
const mockPrismaUserCount = vi.fn()

vi.mock('../lib/db', () => ({
  prisma: {
    $queryRaw: mockPrismaQueryRaw,
    user: {
      count: mockPrismaUserCount
    }
  }
}))

const mockCacheSet = vi.fn()
const mockCacheGet = vi.fn()
const mockCacheDel = vi.fn()
const mockCacheInfo = vi.fn()

vi.mock('../lib/cache', () => ({
  cache: {
    set: mockCacheSet,
    get: mockCacheGet,
    del: mockCacheDel,
    info: mockCacheInfo
  }
}))

// Mock fs/promises
const mockWriteFile = vi.fn()
const mockReadFile = vi.fn()
const mockUnlink = vi.fn()
const mockStat = vi.fn()

vi.mock('fs/promises', () => ({
  writeFile: mockWriteFile,
  readFile: mockReadFile,
  unlink: mockUnlink,
  stat: mockStat
}))

// Mock os
const mockTotalmem = vi.fn()
const mockFreemem = vi.fn()
const mockCpus = vi.fn()
const mockLoadavg = vi.fn()

vi.mock('os', () => ({
  totalmem: mockTotalmem,
  freemem: mockFreemem,
  cpus: mockCpus,
  loadavg: mockLoadavg
}))

describe('HealthCheckManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mocks
    mockPrismaQueryRaw.mockResolvedValue([{ '1': 1 }])
    mockPrismaUserCount.mockResolvedValue(5)
    
    mockCacheSet.mockResolvedValue('OK')
    mockCacheGet.mockResolvedValue('test-value')
    mockCacheDel.mockResolvedValue(1)
    mockCacheInfo.mockResolvedValue('redis_version:6.0.0\nused_memory:1024\nmaxmemory:2048')
    
    mockWriteFile.mockResolvedValue(undefined)
    mockReadFile.mockResolvedValue('test-data')
    mockUnlink.mockResolvedValue(undefined)
    mockStat.mockResolvedValue({ isFile: () => true })
    
    mockTotalmem.mockReturnValue(8 * 1024 * 1024 * 1024) // 8GB
    mockFreemem.mockReturnValue(4 * 1024 * 1024 * 1024) // 4GB
    mockCpus.mockReturnValue([
      { model: 'Intel Core i7' },
      { model: 'Intel Core i7' },
      { model: 'Intel Core i7' },
      { model: 'Intel Core i7' }
    ])
    mockLoadavg.mockReturnValue([0.5, 0.6, 0.7])
  })

  describe('checkDatabase', () => {
    test('should return healthy status when database is working', async () => {
      const result = await HealthCheckManager.checkDatabase()
      
      expect(result.status).toBe('healthy')
      expect(result.responseTime).toBeDefined()
      expect(result.metadata?.userCount).toBe(5)
      expect(result.metadata?.connectionStatus).toBe('connected')
      expect(mockPrismaQueryRaw).toHaveBeenCalledWith('SELECT 1')
      expect(mockPrismaUserCount).toHaveBeenCalled()
    })

    test('should return degraded status when response time is high', async () => {
      // Mock slow response by delaying the promise
      mockPrismaQueryRaw.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([{ '1': 1 }]), 6000))
      )

      const result = await HealthCheckManager.checkDatabase()
      
      expect(result.status).toBe('degraded')
      expect(result.responseTime).toBeGreaterThan(5000)
    }, 10000)

    test('should return unhealthy status when database fails', async () => {
      const error = new Error('Connection refused')
      mockPrismaQueryRaw.mockRejectedValue(error)

      const result = await HealthCheckManager.checkDatabase()
      
      expect(result.status).toBe('unhealthy')
      expect(result.error).toBe('Connection refused')
      expect(result.metadata?.connectionStatus).toBe('disconnected')
    })
  })

  describe('checkRedis', () => {
    test('should return healthy status when Redis is working', async () => {
      mockCacheGet.mockResolvedValue('health_check_test')

      const result = await HealthCheckManager.checkRedis()
      
      expect(result.status).toBe('healthy')
      expect(result.responseTime).toBeDefined()
      expect(result.metadata?.connectionStatus).toBe('connected')
      expect(mockCacheSet).toHaveBeenCalled()
      expect(mockCacheGet).toHaveBeenCalled()
      expect(mockCacheDel).toHaveBeenCalled()
    })

    test('should return unhealthy status when Redis data integrity fails', async () => {
      mockCacheGet.mockResolvedValue('wrong-value')

      const result = await HealthCheckManager.checkRedis()
      
      expect(result.status).toBe('unhealthy')
      expect(result.error).toContain('data integrity test failed')
    })

    test('should return unhealthy status when Redis connection fails', async () => {
      const error = new Error('Redis connection failed')
      mockCacheSet.mockRejectedValue(error)

      const result = await HealthCheckManager.checkRedis()
      
      expect(result.status).toBe('unhealthy')
      expect(result.error).toBe('Redis connection failed')
      expect(result.metadata?.connectionStatus).toBe('disconnected')
    })

    test('should include memory info when available', async () => {
      mockCacheGet.mockResolvedValue('health_check_test')
      
      const result = await HealthCheckManager.checkRedis()
      
      expect(result.metadata?.memoryInfo).toBeDefined()
    })
  })

  describe('checkFileSystem', () => {
    test('should return healthy status when file system is working', async () => {
      const testData = 'test-data'
      mockReadFile.mockResolvedValue(testData)

      const result = await HealthCheckManager.checkFileSystem()
      
      expect(result.status).toBe('healthy')
      expect(result.responseTime).toBeLessThan(1000)
      expect(mockWriteFile).toHaveBeenCalled()
      expect(mockReadFile).toHaveBeenCalled()
      expect(mockUnlink).toHaveBeenCalled()
    })

    test('should return degraded status when file operations are slow', async () => {
      mockWriteFile.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1500))
      )

      const result = await HealthCheckManager.checkFileSystem()
      
      expect(result.status).toBe('degraded')
      expect(result.responseTime).toBeGreaterThan(1000)
    }, 3000)

    test('should return unhealthy status when file integrity fails', async () => {
      mockReadFile.mockResolvedValue('wrong-data')

      const result = await HealthCheckManager.checkFileSystem()
      
      expect(result.status).toBe('unhealthy')
      expect(result.error).toContain('integrity test failed')
    })

    test('should return unhealthy status when file operations fail', async () => {
      const error = new Error('Permission denied')
      mockWriteFile.mockRejectedValue(error)

      const result = await HealthCheckManager.checkFileSystem()
      
      expect(result.status).toBe('unhealthy')
      expect(result.error).toBe('Permission denied')
    })
  })

  describe('checkMemory', () => {
    test('should return healthy status with normal memory usage', async () => {
      mockTotalmem.mockReturnValue(8 * 1024 * 1024 * 1024) // 8GB
      mockFreemem.mockReturnValue(6 * 1024 * 1024 * 1024) // 6GB free (25% used)

      const result = await HealthCheckManager.checkMemory()
      
      expect(result.status).toBe('healthy')
      expect(result.metadata?.systemMemory?.usagePercent).toBe(25)
      expect(result.metadata?.processMemory).toBeDefined()
    })

    test('should return degraded status with high memory usage', async () => {
      mockTotalmem.mockReturnValue(8 * 1024 * 1024 * 1024) // 8GB
      mockFreemem.mockReturnValue(1 * 1024 * 1024 * 1024) // 1GB free (87.5% used)

      const result = await HealthCheckManager.checkMemory()
      
      expect(result.status).toBe('degraded')
      expect(result.metadata?.systemMemory?.usagePercent).toBe(88) // Rounded
    })

    test('should return unhealthy status with critical memory usage', async () => {
      mockTotalmem.mockReturnValue(8 * 1024 * 1024 * 1024) // 8GB
      mockFreemem.mockReturnValue(0.5 * 1024 * 1024 * 1024) // 0.5GB free (93.75% used)

      const result = await HealthCheckManager.checkMemory()
      
      expect(result.status).toBe('unhealthy')
      expect(result.metadata?.systemMemory?.usagePercent).toBe(94) // Rounded
    })

    test('should handle memory check errors', async () => {
      mockTotalmem.mockImplementation(() => {
        throw new Error('Memory info unavailable')
      })

      const result = await HealthCheckManager.checkMemory()
      
      expect(result.status).toBe('unhealthy')
      expect(result.error).toBe('Memory info unavailable')
    })
  })

  describe('checkCPU', () => {
    test('should return healthy status with normal CPU load', async () => {
      mockLoadavg.mockReturnValue([1.0, 1.2, 1.1]) // Normal load for 4 CPUs
      mockCpus.mockReturnValue(new Array(4).fill({ model: 'Intel Core i7' }))

      const result = await HealthCheckManager.checkCPU()
      
      expect(result.status).toBe('healthy')
      expect(result.metadata?.cpuCount).toBe(4)
      expect(result.metadata?.normalizedLoad).toBe(0.25) // 1.0 / 4 CPUs
      expect(result.metadata?.loadAverage?.['1min']).toBe(1.0)
    })

    test('should return degraded status with high CPU load', async () => {
      mockLoadavg.mockReturnValue([3.5, 3.2, 3.0]) // High load for 4 CPUs
      mockCpus.mockReturnValue(new Array(4).fill({ model: 'Intel Core i7' }))

      const result = await HealthCheckManager.checkCPU()
      
      expect(result.status).toBe('degraded')
      expect(result.metadata?.normalizedLoad).toBe(0.88) // 3.5 / 4 CPUs, rounded
    })

    test('should return unhealthy status with critical CPU load', async () => {
      mockLoadavg.mockReturnValue([4.0, 3.8, 3.5]) // Critical load for 4 CPUs
      mockCpus.mockReturnValue(new Array(4).fill({ model: 'Intel Core i7' }))

      const result = await HealthCheckManager.checkCPU()
      
      expect(result.status).toBe('unhealthy')
      expect(result.metadata?.normalizedLoad).toBe(1.0) // 4.0 / 4 CPUs
    })

    test('should handle CPU check errors', async () => {
      mockCpus.mockImplementation(() => {
        throw new Error('CPU info unavailable')
      })

      const result = await HealthCheckManager.checkCPU()
      
      expect(result.status).toBe('unhealthy')
      expect(result.error).toBe('CPU info unavailable')
    })
  })

  describe('checkSystemHealth', () => {
    test('should return overall healthy status when all services are healthy', async () => {
      // All checks will return healthy by default with current mocks

      const result = await HealthCheckManager.checkSystemHealth()
      
      expect(result.overall.status).toBe('healthy')
      expect(result.services.database.status).toBe('healthy')
      expect(result.services.redis.status).toBe('healthy')
      expect(result.services.fileSystem.status).toBe('healthy')
      expect(result.services.memory.status).toBe('healthy')
      expect(result.services.cpu.status).toBe('healthy')
      expect(result.uptime).toBeDefined()
      expect(result.version).toBeDefined()
    })

    test('should return overall degraded status when any service is degraded', async () => {
      // Make memory check return degraded
      mockTotalmem.mockReturnValue(8 * 1024 * 1024 * 1024) // 8GB
      mockFreemem.mockReturnValue(1 * 1024 * 1024 * 1024) // 1GB free (87.5% used)

      const result = await HealthCheckManager.checkSystemHealth()
      
      expect(result.overall.status).toBe('degraded')
      expect(result.services.memory.status).toBe('degraded')
    })

    test('should return overall unhealthy status when any service is unhealthy', async () => {
      // Make database check fail
      mockPrismaQueryRaw.mockRejectedValue(new Error('Database down'))

      const result = await HealthCheckManager.checkSystemHealth()
      
      expect(result.overall.status).toBe('unhealthy')
      expect(result.services.database.status).toBe('unhealthy')
    })

    test('should run all checks in parallel', async () => {
      const startTime = Date.now()
      
      await HealthCheckManager.checkSystemHealth()
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete quickly since all checks run in parallel
      expect(duration).toBeLessThan(1000)
    })
  })

  describe('getSimpleHealth', () => {
    test('should return ok status when database is accessible', async () => {
      const result = await HealthCheckManager.getSimpleHealth()
      
      expect(result.status).toBe('ok')
      expect(result.uptime).toBeDefined()
      expect(mockPrismaQueryRaw).toHaveBeenCalledWith('SELECT 1')
    })

    test('should return error status when database is not accessible', async () => {
      mockPrismaQueryRaw.mockRejectedValue(new Error('Database down'))

      const result = await HealthCheckManager.getSimpleHealth()
      
      expect(result.status).toBe('error')
      expect(result.uptime).toBeDefined()
    })
  })

  describe('utility methods', () => {
    test('getUptime should return uptime in seconds', () => {
      const uptime = HealthCheckManager.getUptime()
      
      expect(typeof uptime).toBe('number')
      expect(uptime).toBeGreaterThanOrEqual(0)
    })

    test('getMemoryStats should return process memory stats', () => {
      const stats = HealthCheckManager.getMemoryStats()
      
      expect(stats.heapUsed).toBeDefined()
      expect(stats.heapTotal).toBeDefined()
      expect(stats.external).toBeDefined()
      expect(stats.rss).toBeDefined()
      
      // All values should be in MB (positive numbers)
      Object.values(stats).forEach(value => {
        expect(typeof value).toBe('number')
        expect(value).toBeGreaterThan(0)
      })
    })
  })
})
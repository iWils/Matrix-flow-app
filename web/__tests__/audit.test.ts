import { describe, test, expect, beforeEach, vi } from 'vitest'
import { auditLog, auditLogFromRequest, logAudit } from '../lib/audit'

// Mock Prisma
const mockAuditLogCreate = vi.fn()
vi.mock('../lib/db', () => ({
  prisma: {
    auditLog: {
      create: mockAuditLogCreate
    }
  }
}))

// Mock logger
const mockLogger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn()
}

vi.mock('../lib/logger', () => ({
  logger: mockLogger
}))

describe('Audit System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuditLogCreate.mockResolvedValue({ id: 1 })
  })

  describe('auditLog', () => {
    test('should create audit log entry', async () => {
      const opts = {
        userId: 1,
        matrixId: 10,
        entity: 'Matrix',
        entityId: 10,
        action: 'create' as const,
        changes: { name: 'Test Matrix' },
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      }

      await auditLog(opts)

      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: {
          userId: 1,
          matrixId: 10,
          entity: 'Matrix',
          entityId: 10,
          action: 'create',
          changes: { name: 'Test Matrix' },
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      })
    })

    test('should handle null changes', async () => {
      const opts = {
        userId: 1,
        entity: 'Matrix',
        entityId: 10,
        action: 'delete' as const,
        changes: null
      }

      await auditLog(opts)

      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: {
          userId: 1,
          matrixId: undefined,
          entity: 'Matrix',
          entityId: 10,
          action: 'delete',
          changes: null,
          ip: undefined,
          userAgent: undefined
        }
      })
    })

    test('should handle optional fields', async () => {
      const opts = {
        entity: 'FlowEntry',
        entityId: 5,
        action: 'update' as const,
        changes: { status: 'active' }
      }

      await auditLog(opts)

      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: {
          userId: undefined,
          matrixId: undefined,
          entity: 'FlowEntry',
          entityId: 5,
          action: 'update',
          changes: { status: 'active' },
          ip: undefined,
          userAgent: undefined
        }
      })
    })

    test('should handle database errors gracefully', async () => {
      const error = new Error('Database connection failed')
      mockAuditLogCreate.mockRejectedValue(error)

      const opts = {
        userId: 1,
        entity: 'Matrix',
        entityId: 10,
        action: 'create' as const,
        changes: { name: 'Test' }
      }

      // Should not throw
      await expect(auditLog(opts)).resolves.toBeUndefined()

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create audit log',
        error,
        {
          entity: 'Matrix',
          entityId: 10,
          action: 'create',
          userId: 1,
          matrixId: undefined
        }
      )
    })

    test('should serialize complex changes objects', async () => {
      const complexChanges = {
        matrix: { id: 1, name: 'Test' },
        entries: [1, 2, 3],
        metadata: { version: '1.0', tags: ['test', 'demo'] }
      }

      const opts = {
        userId: 1,
        entity: 'Matrix',
        entityId: 10,
        action: 'update' as const,
        changes: complexChanges
      }

      await auditLog(opts)

      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: {
          userId: 1,
          matrixId: undefined,
          entity: 'Matrix',
          entityId: 10,
          action: 'update',
          changes: complexChanges, // Should be JSON serialized
          ip: undefined,
          userAgent: undefined
        }
      })
    })
  })

  describe('auditLogFromRequest', () => {
    test('should extract IP and user agent from request', async () => {
      const mockRequest = {
        headers: {
          get: vi.fn()
        }
      } as unknown as Request

      const headersGet = mockRequest.headers.get as ReturnType<typeof vi.fn>
      headersGet.mockImplementation((name: string) => {
        switch (name) {
          case 'x-forwarded-for': return '203.0.113.1'
          case 'user-agent': return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          default: return null
        }
      })

      const opts = {
        userId: 1,
        entity: 'Matrix',
        entityId: 10,
        action: 'create' as const,
        changes: { name: 'Test' }
      }

      await auditLogFromRequest(mockRequest, opts)

      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: {
          userId: 1,
          matrixId: undefined,
          entity: 'Matrix',
          entityId: 10,
          action: 'create',
          changes: { name: 'Test' },
          ip: '203.0.113.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      })
    })

    test('should handle x-real-ip header when x-forwarded-for is not available', async () => {
      const mockRequest = {
        headers: {
          get: vi.fn()
        }
      } as unknown as Request

      const headersGet = mockRequest.headers.get as ReturnType<typeof vi.fn>
      headersGet.mockImplementation((name: string) => {
        switch (name) {
          case 'x-forwarded-for': return null
          case 'x-real-ip': return '192.168.1.100'
          case 'user-agent': return 'curl/7.68.0'
          default: return null
        }
      })

      const opts = {
        userId: 1,
        entity: 'Matrix',
        entityId: 10,
        action: 'create' as const,
        changes: { name: 'Test' }
      }

      await auditLogFromRequest(mockRequest, opts)

      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: {
          userId: 1,
          matrixId: undefined,
          entity: 'Matrix',
          entityId: 10,
          action: 'create',
          changes: { name: 'Test' },
          ip: '192.168.1.100',
          userAgent: 'curl/7.68.0'
        }
      })
    })

    test('should use unknown when headers are missing', async () => {
      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue(null)
        }
      } as unknown as Request

      const opts = {
        userId: 1,
        entity: 'Matrix',
        entityId: 10,
        action: 'create' as const,
        changes: { name: 'Test' }
      }

      await auditLogFromRequest(mockRequest, opts)

      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: {
          userId: 1,
          matrixId: undefined,
          entity: 'Matrix',
          entityId: 10,
          action: 'create',
          changes: { name: 'Test' },
          ip: 'unknown',
          userAgent: 'unknown'
        }
      })
    })
  })

  describe('logAudit (legacy API)', () => {
    test('should create audit log with legacy format', async () => {
      const options = {
        userId: 1,
        action: 'update',
        resource: 'Matrix',
        resourceId: '10',
        details: { name: 'Updated Matrix' }
      }

      await logAudit(options)

      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: {
          userId: 1,
          entity: 'Matrix',
          entityId: 10, // Should be parsed to integer
          action: 'update',
          changes: { name: 'Updated Matrix' },
          at: expect.any(Date)
        }
      })
    })

    test('should handle string resourceId correctly', async () => {
      const options = {
        userId: 1,
        action: 'delete',
        resource: 'FlowEntry',
        resourceId: '999',
        details: { reason: 'cleanup' }
      }

      await logAudit(options)

      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: {
          userId: 1,
          entity: 'FlowEntry',
          entityId: 999,
          action: 'delete',
          changes: { reason: 'cleanup' },
          at: expect.any(Date)
        }
      })
    })

    test('should handle missing details', async () => {
      const options = {
        userId: 1,
        action: 'create',
        resource: 'User',
        resourceId: '5'
      }

      await logAudit(options)

      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: {
          userId: 1,
          entity: 'User',
          entityId: 5,
          action: 'create',
          changes: null,
          at: expect.any(Date)
        }
      })
    })

    test('should handle database errors gracefully', async () => {
      const error = new Error('Database error')
      mockAuditLogCreate.mockRejectedValue(error)

      const options = {
        userId: 1,
        action: 'create',
        resource: 'Matrix',
        resourceId: '10'
      }

      // Should not throw
      await expect(logAudit(options)).resolves.toBeUndefined()

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to log audit',
        error,
        options
      )
    })

    test('should serialize complex details', async () => {
      const complexDetails = {
        changes: {
          old: { name: 'Old Name', status: 'inactive' },
          new: { name: 'New Name', status: 'active' }
        },
        metadata: { source: 'api', timestamp: '2024-01-01' },
        array: [1, 2, { nested: true }]
      }

      const options = {
        userId: 1,
        action: 'update',
        resource: 'Matrix',
        resourceId: '10',
        details: complexDetails
      }

      await logAudit(options)

      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: {
          userId: 1,
          entity: 'Matrix',
          entityId: 10,
          action: 'update',
          changes: complexDetails, // Should be JSON serialized
          at: expect.any(Date)
        }
      })
    })
  })

  describe('audit actions', () => {
    const validActions = ['create', 'update', 'delete'] as const

    validActions.forEach(action => {
      test(`should handle ${action} action`, async () => {
        const opts = {
          userId: 1,
          entity: 'Matrix',
          entityId: 10,
          action,
          changes: { test: true }
        }

        await auditLog(opts)

        expect(mockAuditLogCreate).toHaveBeenCalledWith({
          data: expect.objectContaining({
            action,
            entity: 'Matrix',
            entityId: 10
          })
        })
      })
    })
  })

  describe('audit entities', () => {
    const commonEntities = ['Matrix', 'FlowEntry', 'User', 'MatrixPermission', 'AuditLog']

    commonEntities.forEach(entity => {
      test(`should handle ${entity} entity`, async () => {
        const opts = {
          userId: 1,
          entity,
          entityId: 1,
          action: 'create' as const,
          changes: { test: true }
        }

        await auditLog(opts)

        expect(mockAuditLogCreate).toHaveBeenCalledWith({
          data: expect.objectContaining({
            entity,
            action: 'create',
            entityId: 1
          })
        })
      })
    })
  })
})
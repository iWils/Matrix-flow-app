import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { canViewMatrix, canEditMatrix, canOwnMatrix } from '../lib/rbac'
import { prisma } from '../lib/db'

// Mock Prisma using vi.hoisted to avoid hoisting issues
const { mockMatrixFindUnique, mockMatrixPermissionFindFirst } = vi.hoisted(() => ({
  mockMatrixFindUnique: vi.fn(),
  mockMatrixPermissionFindFirst: vi.fn(),
}))

vi.mock('../lib/db', () => ({
  prisma: {
    matrix: {
      findUnique: mockMatrixFindUnique,
    },
    matrixPermission: {
      findFirst: mockMatrixPermissionFindFirst,
    },
  },
}))

describe('RBAC Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('canViewMatrix', () => {
    test('should allow admin to view any matrix', async () => {
      const result = await canViewMatrix(1, 'admin', 100)
      expect(result).toBe(true)
      // Admin should not require database checks
      expect(mockMatrixFindUnique).not.toHaveBeenCalled()
    })

    test('should allow owner to view their matrix', async () => {
      mockMatrixFindUnique.mockResolvedValue({
        id: 100,
        ownerId: 1,
        name: 'Test Matrix',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedVersionId: null,
        requiredApprovals: 1,
        webhookUrl: null,
      })

      const result = await canViewMatrix(1, 'user', 100)
      expect(result).toBe(true)
      expect(mockMatrixFindUnique).toHaveBeenCalledWith({
        where: { id: 100 },
        select: { ownerId: true }
      })
    })

    test('should allow user with explicit permissions to view matrix', async () => {
      mockMatrixFindUnique.mockResolvedValue({
        id: 100,
        ownerId: 2, // Different owner
        name: 'Test Matrix',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedVersionId: null,
        requiredApprovals: 1,
        webhookUrl: null,
      })

      mockMatrixPermissionFindFirst.mockResolvedValue({
        id: 1,
        matrixId: 100,
        userId: 1,
        role: 'viewer',
      })

      const result = await canViewMatrix(1, 'user', 100)
      expect(result).toBe(true)
      expect(mockMatrixPermissionFindFirst).toHaveBeenCalledWith({
        where: { matrixId: 100, userId: 1 }
      })
    })

    test('should deny access when user has no permissions', async () => {
      mockMatrixFindUnique.mockResolvedValue({
        id: 100,
        ownerId: 2, // Different owner
        name: 'Test Matrix',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedVersionId: null,
        requiredApprovals: 1,
        webhookUrl: null,
      })

      mockMatrixPermissionFindFirst.mockResolvedValue(null)

      const result = await canViewMatrix(1, 'user', 100)
      expect(result).toBe(false)
    })
  })

  describe('canEditMatrix', () => {
    test('should allow admin to edit any matrix', async () => {
      const result = await canEditMatrix(1, 'admin', 100)
      expect(result).toBe(true)
      expect(mockMatrixFindUnique).not.toHaveBeenCalled()
    })

    test('should allow owner to edit their matrix', async () => {
      mockMatrixFindUnique.mockResolvedValue({
        id: 100,
        ownerId: 1,
        name: 'Test Matrix',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedVersionId: null,
        requiredApprovals: 1,
        webhookUrl: null,
      })

      const result = await canEditMatrix(1, 'user', 100)
      expect(result).toBe(true)
    })

    test('should allow editor to edit matrix', async () => {
      mockMatrixFindUnique.mockResolvedValue({
        id: 100,
        ownerId: 2,
        name: 'Test Matrix',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedVersionId: null,
        requiredApprovals: 1,
        webhookUrl: null,
      })

      mockMatrixPermissionFindFirst.mockResolvedValue({
        id: 1,
        matrixId: 100,
        userId: 1,
        role: 'editor',
      })

      const result = await canEditMatrix(1, 'user', 100)
      expect(result).toBe(true)
    })

    test('should deny viewer from editing matrix', async () => {
      mockMatrixFindUnique.mockResolvedValue({
        id: 100,
        ownerId: 2,
        name: 'Test Matrix',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedVersionId: null,
        requiredApprovals: 1,
        webhookUrl: null,
      })

      mockMatrixPermissionFindFirst.mockResolvedValue({
        id: 1,
        matrixId: 100,
        userId: 1,
        role: 'viewer',
      })

      const result = await canEditMatrix(1, 'user', 100)
      expect(result).toBe(false)
    })
  })

  describe('canOwnMatrix', () => {
    test('should allow admin to own any matrix', async () => {
      const result = await canOwnMatrix(1, 'admin', 100)
      expect(result).toBe(true)
    })

    test('should allow actual owner to own their matrix', async () => {
      mockMatrixFindUnique.mockResolvedValue({
        id: 100,
        ownerId: 1,
        name: 'Test Matrix',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedVersionId: null,
        requiredApprovals: 1,
        webhookUrl: null,
      })

      const result = await canOwnMatrix(1, 'user', 100)
      expect(result).toBe(true)
    })

    test('should allow user with owner permission to own matrix', async () => {
      mockMatrixFindUnique.mockResolvedValue({
        id: 100,
        ownerId: 2,
        name: 'Test Matrix',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedVersionId: null,
        requiredApprovals: 1,
        webhookUrl: null,
      })

      mockMatrixPermissionFindFirst.mockResolvedValue({
        id: 1,
        matrixId: 100,
        userId: 1,
        role: 'owner',
      })

      const result = await canOwnMatrix(1, 'user', 100)
      expect(result).toBe(true)
    })

    test('should deny editor from owning matrix', async () => {
      mockMatrixFindUnique.mockResolvedValue({
        id: 100,
        ownerId: 2,
        name: 'Test Matrix',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedVersionId: null,
        requiredApprovals: 1,
        webhookUrl: null,
      })

      mockMatrixPermissionFindFirst.mockResolvedValue({
        id: 1,
        matrixId: 100,
        userId: 1,
        role: 'editor',
      })

      const result = await canOwnMatrix(1, 'user', 100)
      expect(result).toBe(false)
    })
  })
})
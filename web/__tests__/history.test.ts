import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MatrixDiffEngine, MatrixDiff } from '@/lib/matrix-diff'

// Mock data for testing
const mockOldSnapshot = {
  entries: [
    {
      id: 1,
      request_type: 'NEW',
      rule_status: 'ACTIVE',
      rule_name: 'Test Rule 1',
      device: 'FW-01',
      src_zone: 'DMZ',
      src_name: 'Server1',
      src_cidr: '192.168.1.10/32',
      src_service: 'ANY',
      dst_zone: 'LAN',
      dst_name: 'Server2', 
      dst_cidr: '10.0.1.20/32',
      protocol_group: 'TCP',
      dst_service: '443',
      action: 'ALLOW',
      implementation_date: '2023-12-01T10:00:00Z',
      requester: 'admin',
      comment: 'Test rule for HTTPS'
    },
    {
      id: 2,
      request_type: 'NEW',
      rule_status: 'ACTIVE',
      rule_name: 'Test Rule 2',
      device: 'FW-01',
      src_zone: 'DMZ',
      src_name: 'Server3',
      src_cidr: '192.168.1.30/32',
      src_service: 'ANY',
      dst_zone: 'LAN',
      dst_name: 'Server4',
      dst_cidr: '10.0.1.40/32', 
      protocol_group: 'TCP',
      dst_service: '80',
      action: 'ALLOW',
      implementation_date: '2023-12-01T10:00:00Z',
      requester: 'admin',
      comment: 'Test rule for HTTP'
    }
  ]
}

const mockNewSnapshot = {
  entries: [
    // Modified rule (changed action)
    {
      id: 1,
      request_type: 'NEW',
      rule_status: 'ACTIVE',
      rule_name: 'Test Rule 1',
      device: 'FW-01',
      src_zone: 'DMZ',
      src_name: 'Server1',
      src_cidr: '192.168.1.10/32',
      src_service: 'ANY',
      dst_zone: 'LAN',
      dst_name: 'Server2',
      dst_cidr: '10.0.1.20/32',
      protocol_group: 'TCP',
      dst_service: '443',
      action: 'DENY', // Changed from ALLOW
      implementation_date: '2023-12-01T10:00:00Z',
      requester: 'admin',
      comment: 'Test rule for HTTPS - blocked'
    },
    // Rule 2 removed (not in new snapshot)
    // New rule added
    {
      id: 3,
      request_type: 'NEW',
      rule_status: 'ACTIVE',
      rule_name: 'Test Rule 3',
      device: 'FW-01',
      src_zone: 'DMZ',
      src_name: 'Server5',
      src_cidr: '192.168.1.50/32',
      src_service: 'ANY',
      dst_zone: 'LAN',
      dst_name: 'Server6',
      dst_cidr: '10.0.1.60/32',
      protocol_group: 'TCP',
      dst_service: '22',
      action: 'ALLOW',
      implementation_date: '2023-12-02T10:00:00Z',
      requester: 'admin',
      comment: 'Test rule for SSH'
    }
  ]
}

const mockMetadata = {
  fromVersion: 1,
  toVersion: 2,
  fromDate: new Date('2023-12-01T10:00:00Z'),
  toDate: new Date('2023-12-02T10:00:00Z'),
  fromCreatedBy: 'admin',
  toCreatedBy: 'admin'
}

describe('Matrix Diff Engine', () => {
  describe('generateDiff', () => {
    it('should correctly identify added, removed, and modified entries', () => {
      const diff = MatrixDiffEngine.generateDiff(
        mockOldSnapshot,
        mockNewSnapshot,
        mockMetadata
      )

      // Check summary counts
      expect(diff.summary.added).toBe(1)
      expect(diff.summary.removed).toBe(1)
      expect(diff.summary.modified).toBe(1)
      expect(diff.summary.unchanged).toBe(0)
      expect(diff.summary.total).toBe(3)

      // Check that we have all entries
      expect(diff.entries).toHaveLength(3)

      // Find each type of change
      const addedEntry = diff.entries.find(e => e.type === 'added')
      const removedEntry = diff.entries.find(e => e.type === 'removed') 
      const modifiedEntry = diff.entries.find(e => e.type === 'modified')

      // Verify added entry
      expect(addedEntry).toBeTruthy()
      expect(addedEntry?.entry?.id).toBe(3)

      // Verify removed entry
      expect(removedEntry).toBeTruthy()
      expect(removedEntry?.entry?.id).toBe(2)

      // Verify modified entry
      expect(modifiedEntry).toBeTruthy()
      expect(modifiedEntry?.entry?.id).toBe(1)
      expect(modifiedEntry?.changes?.length).toBeGreaterThan(0)
      
      // Find the action change
      const actionChange = modifiedEntry?.changes?.find(c => c.field === 'action')
      expect(actionChange).toBeTruthy()
      expect(actionChange?.oldValue).toBe('ALLOW')
      expect(actionChange?.newValue).toBe('DENY')
    })
  })

  describe('generateQuickDiff', () => {
    it('should generate a quick summary of changes', () => {
      const quickDiff = MatrixDiffEngine.generateQuickDiff(
        mockOldSnapshot,
        mockNewSnapshot
      )

      expect(quickDiff.hasChanges).toBe(true)
      expect(quickDiff.changeCount).toBe(3)
      expect(quickDiff.summary).toContain('+1')
      expect(quickDiff.summary).toContain('-1')  
      expect(quickDiff.summary).toContain('~1')
    })

    it('should handle no changes', () => {
      const quickDiff = MatrixDiffEngine.generateQuickDiff(
        mockOldSnapshot,
        mockOldSnapshot
      )

      expect(quickDiff.hasChanges).toBe(false)
      expect(quickDiff.changeCount).toBe(0)
      expect(quickDiff.summary).toBe('Aucun changement')
    })
  })

  describe('generateImpactAnalysis', () => {
    it('should assess risk level correctly', () => {
      const diff = MatrixDiffEngine.generateDiff(
        mockOldSnapshot,
        mockNewSnapshot,
        mockMetadata
      )

      const impact = MatrixDiffEngine.generateImpactAnalysis(diff)

      // Should be critical risk due to ALLOW -> DENY change
      expect(impact.riskLevel).toBe('critical')
      expect(impact.criticalChanges.length).toBeGreaterThan(0)
      
      // Find the critical change related to ALLOW -> DENY
      const criticalChange = impact.criticalChanges.find(c => c.includes('ALLOW à DENY'))
      expect(criticalChange).toBeTruthy()
      
      // Should have impacted zones
      expect(impact.impactedZones).toContain('DMZ')
      expect(impact.impactedZones).toContain('LAN')
      
      // Should have recommendations
      expect(impact.recommendations.length).toBeGreaterThan(0)
      expect(impact.recommendations[0]).toContain('Révision manuelle')
    })
  })

  describe('generateVersionStats', () => {
    it('should generate stats for multiple versions', () => {
      const snapshots = [
        { version: 1, snapshot: mockOldSnapshot },
        { version: 2, snapshot: mockNewSnapshot }
      ]

      const stats = MatrixDiffEngine.generateVersionStats(snapshots)

      expect(stats).toHaveLength(1) // One transition (v1 -> v2)
      expect(stats[0].version).toBe(2)
      expect(stats[0].changeCount).toBe(3)
      expect(stats[0].hasChanges).toBe(true)
      expect(stats[0].summary).toBeTruthy()
    })
  })

  describe('exportDiff', () => {
    it('should export to JSON format', () => {
      const diff = MatrixDiffEngine.generateDiff(
        mockOldSnapshot,
        mockNewSnapshot,
        mockMetadata
      )

      const exported = MatrixDiffEngine.exportDiff(diff, 'json')
      const parsed = JSON.parse(exported)

      expect(parsed.summary).toEqual(diff.summary)
      expect(parsed.entries).toHaveLength(3)
    })

    it('should export to CSV format', () => {
      const diff = MatrixDiffEngine.generateDiff(
        mockOldSnapshot,
        mockNewSnapshot,
        mockMetadata
      )

      const exported = MatrixDiffEngine.exportDiff(diff, 'csv')

      expect(exported).toContain('Type,ID,Rule Name')
      expect(exported).toContain('added')
      expect(exported).toContain('removed')
      expect(exported).toContain('modified')
    })

    it('should export to Markdown format', () => {
      const diff = MatrixDiffEngine.generateDiff(
        mockOldSnapshot,
        mockNewSnapshot,
        mockMetadata
      )

      const exported = MatrixDiffEngine.exportDiff(diff, 'markdown')

      expect(exported).toContain('# Matrix Diff Report')
      expect(exported).toContain('## Summary')
      expect(exported).toContain('## Impact Analysis')
      expect(exported).toContain('**Added**: 1')
      expect(exported).toContain('**Modified**: 1')
      expect(exported).toContain('**Removed**: 1')
    })
  })
})

// Mock React components for basic functionality tests
describe('History System Components', () => {
  describe('DiffViewer Component Logic', () => {
    it('should filter entries correctly by type', () => {
      const diff = MatrixDiffEngine.generateDiff(
        mockOldSnapshot,
        mockNewSnapshot,
        mockMetadata
      )

      // Test filter logic
      const addedEntries = diff.entries.filter(e => e.type === 'added')
      const modifiedEntries = diff.entries.filter(e => e.type === 'modified')
      const removedEntries = diff.entries.filter(e => e.type === 'removed')

      expect(addedEntries).toHaveLength(1)
      expect(modifiedEntries).toHaveLength(1)
      expect(removedEntries).toHaveLength(1)
    })

    it('should support search filtering', () => {
      const diff = MatrixDiffEngine.generateDiff(
        mockOldSnapshot,
        mockNewSnapshot,
        mockMetadata
      )

      // Search for "SSH"
      const sshEntries = diff.entries.filter(entry => {
        const entryData = entry.entry || entry.newEntry || entry.oldEntry
        return entryData && (entryData as any).comment?.toLowerCase().includes('ssh')
      })

      expect(sshEntries).toHaveLength(1)
      expect((sshEntries[0].entry as any)?.rule_name).toBe('Test Rule 3')
    })
  })

  describe('API Response Validation', () => {
    it('should validate diff API response structure', () => {
      const diff = MatrixDiffEngine.generateDiff(
        mockOldSnapshot,
        mockNewSnapshot,
        mockMetadata
      )

      const impact = MatrixDiffEngine.generateImpactAnalysis(diff)

      // Simulate API response structure
      const apiResponse = {
        success: true,
        data: {
          diff,
          impact,
          versions: {
            from: {
              version: 1,
              note: 'Initial version',
              createdAt: new Date().toISOString(),
              createdBy: 'admin'
            },
            to: {
              version: 2,
              note: 'Updated version',
              createdAt: new Date().toISOString(),
              createdBy: 'admin'
            }
          }
        }
      }

      expect(apiResponse.success).toBe(true)
      expect(apiResponse.data.diff.summary).toBeTruthy()
      expect(apiResponse.data.impact.riskLevel).toBeTruthy()
      expect(apiResponse.data.versions.from.version).toBe(1)
      expect(apiResponse.data.versions.to.version).toBe(2)
    })
  })
})
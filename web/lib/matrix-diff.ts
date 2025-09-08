import { MatrixSnapshot, MatrixEntry, FirewallEntry, TestEntry } from '@/types/matrix'

export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged'

export type DiffEntryData = MatrixEntry | FirewallEntry | TestEntry | Record<string, unknown>

export interface DiffEntry {
  type: DiffType
  entry?: DiffEntryData
  oldEntry?: DiffEntryData
  newEntry?: DiffEntryData
  changes?: FieldChange[]
}

export interface FieldChange {
  field: string
  oldValue: unknown
  newValue: unknown
  type: 'added' | 'removed' | 'modified'
}

export interface MatrixDiff {
  summary: DiffSummary
  entries: DiffEntry[]
  metadata: DiffMetadata
}

export interface DiffSummary {
  added: number
  removed: number
  modified: number
  unchanged: number
  total: number
}

export interface DiffMetadata {
  fromVersion: number
  toVersion: number
  fromDate: Date
  toDate: Date
  fromCreatedBy: string
  toCreatedBy: string
}

export class MatrixDiffEngine {
  
  /**
   * Compare two matrix snapshots and generate a diff
   */
  static generateDiff(
    oldSnapshot: MatrixSnapshot,
    newSnapshot: MatrixSnapshot,
    metadata: DiffMetadata
  ): MatrixDiff {
    const oldEntries = new Map<number, any>()
    const newEntries = new Map<number, any>()
    
    // Index entries by ID for efficient lookup
    oldSnapshot.entries.forEach(entry => {
      oldEntries.set(entry.id, entry)
    })
    
    newSnapshot.entries.forEach(entry => {
      newEntries.set(entry.id, entry)
    })
    
    const diffEntries: DiffEntry[] = []
    const processedIds = new Set<number>()
    
    // Process entries that exist in new snapshot
    newSnapshot.entries.forEach(newEntry => {
      processedIds.add(newEntry.id)
      const oldEntry = oldEntries.get(newEntry.id)
      
      if (!oldEntry) {
        // Entry was added
        diffEntries.push({
          type: 'added',
          entry: newEntry,
          newEntry
        })
      } else {
        // Entry might be modified
        const changes = this.compareEntries(oldEntry, newEntry)
        if (changes.length > 0) {
          diffEntries.push({
            type: 'modified',
            entry: newEntry,
            oldEntry,
            newEntry,
            changes
          })
        } else {
          diffEntries.push({
            type: 'unchanged',
            entry: newEntry,
            oldEntry,
            newEntry
          })
        }
      }
    })
    
    // Process entries that only exist in old snapshot (removed)
    oldSnapshot.entries.forEach(oldEntry => {
      if (!processedIds.has(oldEntry.id)) {
        diffEntries.push({
          type: 'removed',
          entry: oldEntry,
          oldEntry
        })
      }
    })
    
    // Calculate summary
    const summary: DiffSummary = {
      added: diffEntries.filter(e => e.type === 'added').length,
      removed: diffEntries.filter(e => e.type === 'removed').length,
      modified: diffEntries.filter(e => e.type === 'modified').length,
      unchanged: diffEntries.filter(e => e.type === 'unchanged').length,
      total: diffEntries.length
    }
    
    return {
      summary,
      entries: diffEntries,
      metadata
    }
  }
  
  /**
   * Compare two entries and return field changes
   */
  private static compareEntries(oldEntry: Record<string, unknown>, newEntry: Record<string, unknown>): FieldChange[] {
    const changes: FieldChange[] = []
    const fieldsToCompare = [
      'request_type', 'rule_status', 'rule_name', 'device',
      'src_zone', 'src_name', 'src_cidr', 'src_service',
      'dst_zone', 'dst_name', 'dst_cidr', 'protocol_group',
      'dst_service', 'action', 'implementation_date',
      'requester', 'comment'
    ]
    
    fieldsToCompare.forEach(field => {
      const oldValue = oldEntry[field]
      const newValue = newEntry[field]
      
      if (oldValue !== newValue) {
        changes.push({
          field,
          oldValue,
          newValue,
          type: 'modified'
        })
      }
    })
    
    return changes
  }
  
  /**
   * Generate a simplified diff summary for quick overview
   */
  static generateQuickDiff(
    oldSnapshot: MatrixSnapshot,
    newSnapshot: MatrixSnapshot
  ): {
    hasChanges: boolean
    summary: string
    changeCount: number
  } {
    const diff = this.generateDiff(oldSnapshot, newSnapshot, {
      fromVersion: 0,
      toVersion: 0,
      fromDate: new Date(),
      toDate: new Date(),
      fromCreatedBy: '',
      toCreatedBy: ''
    })
    
    const changeCount = diff.summary.added + diff.summary.removed + diff.summary.modified
    const hasChanges = changeCount > 0
    
    let summary = ''
    if (diff.summary.added > 0) {
      summary += `+${diff.summary.added} ajouté${diff.summary.added > 1 ? 's' : ''}`
    }
    if (diff.summary.removed > 0) {
      if (summary) summary += ', '
      summary += `-${diff.summary.removed} supprimé${diff.summary.removed > 1 ? 's' : ''}`
    }
    if (diff.summary.modified > 0) {
      if (summary) summary += ', '
      summary += `~${diff.summary.modified} modifié${diff.summary.modified > 1 ? 's' : ''}`
    }
    
    if (!summary) {
      summary = 'Aucun changement'
    }
    
    return {
      hasChanges,
      summary,
      changeCount
    }
  }
  
  /**
   * Generate diff statistics for a series of versions
   */
  static generateVersionStats(snapshots: { version: number; snapshot: MatrixSnapshot }[]): {
    version: number
    changeCount: number
    summary: string
    hasChanges: boolean
  }[] {
    const stats: {
      version: number
      changeCount: number
      summary: string
      hasChanges: boolean
    }[] = []
    
    for (let i = 1; i < snapshots.length; i++) {
      const prevSnapshot = snapshots[i - 1]
      const currentSnapshot = snapshots[i]
      
      const quickDiff = this.generateQuickDiff(
        prevSnapshot.snapshot,
        currentSnapshot.snapshot
      )
      
      stats.push({
        version: currentSnapshot.version,
        changeCount: quickDiff.changeCount,
        summary: quickDiff.summary,
        hasChanges: quickDiff.hasChanges
      })
    }
    
    return stats
  }
  
  /**
   * Generate change impact analysis
   */
  static generateImpactAnalysis(diff: MatrixDiff): {
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    impactedZones: string[]
    impactedServices: string[]
    criticalChanges: string[]
    recommendations: string[]
  } {
    const impactedZones = new Set<string>()
    const impactedServices = new Set<string>()
    const criticalChanges: string[] = []
    const recommendations: string[] = []
    
    diff.entries.forEach(diffEntry => {
      if (diffEntry.type === 'added' || diffEntry.type === 'modified' || diffEntry.type === 'removed') {
        const entry = diffEntry.entry || diffEntry.newEntry || diffEntry.oldEntry
        if (entry) {
          // Extract impacted zones
          if ((entry as any).src_zone) impactedZones.add((entry as any).src_zone)
          if ((entry as any).dst_zone) impactedZones.add((entry as any).dst_zone)
          
          // Extract impacted services  
          if ((entry as any).src_service) impactedServices.add((entry as any).src_service)
          if ((entry as any).dst_service) impactedServices.add((entry as any).dst_service)
          
          // Detect critical changes
          if (diffEntry.type === 'removed') {
            criticalChanges.push(`Règle supprimée: ${(entry as any).rule_name || 'Sans nom'}`)
          } else if (diffEntry.type === 'added' && (entry as any).action === 'DENY') {
            criticalChanges.push(`Nouvelle règle de blocage: ${(entry as any).rule_name || 'Sans nom'}`)
          } else if (diffEntry.type === 'modified') {
            const actionChange = diffEntry.changes?.find(c => c.field === 'action')
            if (actionChange && actionChange.oldValue === 'ALLOW' && actionChange.newValue === 'DENY') {
              criticalChanges.push(`Règle changée de ALLOW à DENY: ${(entry as any).rule_name || 'Sans nom'}`)
            }
          }
        }
      }
    })
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    
    if (criticalChanges.length > 0) {
      riskLevel = 'critical'
    } else if (diff.summary.removed > 0) {
      riskLevel = 'high'
    } else if (diff.summary.modified > 5) {
      riskLevel = 'medium'
    } else if (diff.summary.added > 10) {
      riskLevel = 'medium'
    }
    
    // Generate recommendations
    if (criticalChanges.length > 0) {
      recommendations.push('⚠️ Révision manuelle recommandée avant application')
      recommendations.push('📋 Tester sur environnement de test d\'abord')
    }
    
    if (diff.summary.removed > 0) {
      recommendations.push('🔍 Vérifier que les règles supprimées ne sont plus nécessaires')
    }
    
    if (impactedZones.size > 3) {
      recommendations.push('🌐 Impact multi-zones détecté - coordination requise')
    }
    
    if (diff.summary.modified > 10) {
      recommendations.push('📊 Nombreuses modifications - considérer un déploiement progressif')
    }
    
    return {
      riskLevel,
      impactedZones: Array.from(impactedZones),
      impactedServices: Array.from(impactedServices),
      criticalChanges,
      recommendations
    }
  }
  
  /**
   * Export diff to various formats
   */
  static exportDiff(diff: MatrixDiff, format: 'json' | 'csv' | 'markdown'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(diff, null, 2)
        
      case 'csv':
        return this.exportDiffToCsv(diff)
        
      case 'markdown':
        return this.exportDiffToMarkdown(diff)
        
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }
  
  private static exportDiffToCsv(diff: MatrixDiff): string {
    const headers = [
      'Type', 'ID', 'Rule Name', 'Source', 'Destination', 'Action', 'Changes'
    ]
    
    const rows = diff.entries.map(entry => {
      const e = entry.entry || entry.newEntry || entry.oldEntry
      const changes = entry.changes?.map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`).join('; ') || ''
      
      return [
        entry.type,
        e?.id || '',
        (e as any)?.rule_name || '',
        (e as any)?.src_name || (e as any)?.src_cidr || '',
        (e as any)?.dst_name || (e as any)?.dst_cidr || '',
        (e as any)?.action || '',
        changes
      ].map(cell => `"${cell}"`).join(',')
    })
    
    return [headers.join(','), ...rows].join('\n')
  }
  
  private static exportDiffToMarkdown(diff: MatrixDiff): string {
    const impact = this.generateImpactAnalysis(diff)
    
    let markdown = `# Matrix Diff Report\n\n`
    
    markdown += `## Summary\n\n`
    markdown += `- **Added**: ${diff.summary.added} entries\n`
    markdown += `- **Modified**: ${diff.summary.modified} entries\n`
    markdown += `- **Removed**: ${diff.summary.removed} entries\n`
    markdown += `- **Unchanged**: ${diff.summary.unchanged} entries\n`
    markdown += `- **Total**: ${diff.summary.total} entries\n\n`
    
    markdown += `## Impact Analysis\n\n`
    markdown += `- **Risk Level**: ${impact.riskLevel.toUpperCase()}\n`
    markdown += `- **Impacted Zones**: ${impact.impactedZones.join(', ') || 'None'}\n`
    markdown += `- **Impacted Services**: ${impact.impactedServices.join(', ') || 'None'}\n\n`
    
    if (impact.criticalChanges.length > 0) {
      markdown += `## Critical Changes\n\n`
      impact.criticalChanges.forEach(change => {
        markdown += `- ${change}\n`
      })
      markdown += `\n`
    }
    
    if (impact.recommendations.length > 0) {
      markdown += `## Recommendations\n\n`
      impact.recommendations.forEach(rec => {
        markdown += `- ${rec}\n`
      })
      markdown += `\n`
    }
    
    return markdown
  }
}

// Export utility functions
export const matrixDiff = {
  generate: MatrixDiffEngine.generateDiff,
  quick: MatrixDiffEngine.generateQuickDiff,
  stats: MatrixDiffEngine.generateVersionStats,
  impact: MatrixDiffEngine.generateImpactAnalysis,
  export: MatrixDiffEngine.exportDiff
}
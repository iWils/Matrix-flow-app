import { cache } from '@/lib/cache'
import { MatrixDiff } from '@/lib/matrix-diff'
import { createHash } from 'crypto'

/**
 * Cache avancé spécialement optimisé pour l'historique des matrices
 * Gère les snapshots, les diffs, et les timelines avec compression intelligente
 */
export class HistoryCache {
  private static readonly CACHE_PREFIXES = {
    // Cache des snapshots de versions
    VERSION_SNAPSHOT: 'history:version:',
    // Cache des diffs entre versions
    VERSION_DIFF: 'history:diff:',
    // Cache des timelines de versions
    VERSION_TIMELINE: 'history:timeline:',
    // Cache des statistiques d'historique
    HISTORY_STATS: 'history:stats:',
    // Cache des analyses d'impact
    IMPACT_ANALYSIS: 'history:impact:',
    // Cache des exports compressés
    EXPORT_CACHE: 'history:export:',
  } as const

  private static readonly TTL = {
    // Les snapshots sont rarement modifiés une fois créés
    VERSION_SNAPSHOT: 86400, // 24 heures
    // Les diffs sont stables entre versions spécifiques
    VERSION_DIFF: 43200, // 12 heures
    // Les timelines peuvent changer avec de nouvelles versions
    VERSION_TIMELINE: 3600, // 1 heure
    // Les stats peuvent être rafraîchies plus fréquemment
    HISTORY_STATS: 1800, // 30 minutes
    // L'analyse d'impact est coûteuse à calculer
    IMPACT_ANALYSIS: 7200, // 2 heures
    // Les exports sont rarement régénérés
    EXPORT_CACHE: 21600, // 6 heures
  } as const

  /**
   * Met en cache un snapshot de version avec compression
   */
  static async setVersionSnapshot(
    matrixId: number,
    version: number,
    snapshot: any
  ): Promise<boolean> {
    const key = `${this.CACHE_PREFIXES.VERSION_SNAPSHOT}${matrixId}:v${version}`
    
    try {
      // Compression basique avec JSON stringification optimisée
      const compressedSnapshot = this.compressSnapshot(snapshot)
      return await cache.set(key, compressedSnapshot, { 
        ttl: this.TTL.VERSION_SNAPSHOT 
      })
    } catch (error) {
      console.warn('Failed to cache version snapshot:', error)
      return false
    }
  }

  /**
   * Récupère un snapshot de version avec décompression
   */
  static async getVersionSnapshot(
    matrixId: number,
    version: number
  ): Promise<any | null> {
    const key = `${this.CACHE_PREFIXES.VERSION_SNAPSHOT}${matrixId}:v${version}`
    
    try {
      const compressedSnapshot = await cache.get<any>(key)
      if (!compressedSnapshot) return null
      
      return this.decompressSnapshot(compressedSnapshot)
    } catch (error) {
      console.warn('Failed to get version snapshot from cache:', error)
      return null
    }
  }

  /**
   * Met en cache un diff entre deux versions
   */
  static async setVersionDiff(
    matrixId: number,
    fromVersion: number,
    toVersion: number,
    diff: MatrixDiff,
    impact?: any
  ): Promise<boolean> {
    const key = `${this.CACHE_PREFIXES.VERSION_DIFF}${matrixId}:${fromVersion}-${toVersion}`
    
    try {
      const cacheData = {
        diff: this.compressDiff(diff),
        impact: impact ? this.compressImpact(impact) : null,
        generatedAt: new Date().toISOString(),
        versions: { from: fromVersion, to: toVersion }
      }

      return await cache.set(key, cacheData, { 
        ttl: this.TTL.VERSION_DIFF 
      })
    } catch (error) {
      console.warn('Failed to cache version diff:', error)
      return false
    }
  }

  /**
   * Récupère un diff entre deux versions
   */
  static async getVersionDiff(
    matrixId: number,
    fromVersion: number,
    toVersion: number
  ): Promise<{ diff: MatrixDiff; impact?: any; generatedAt: string } | null> {
    const key = `${this.CACHE_PREFIXES.VERSION_DIFF}${matrixId}:${fromVersion}-${toVersion}`
    
    try {
      const cacheData = await cache.get<any>(key)
      if (!cacheData) return null

      return {
        diff: this.decompressDiff(cacheData.diff),
        impact: cacheData.impact ? this.decompressImpact(cacheData.impact) : undefined,
        generatedAt: cacheData.generatedAt
      }
    } catch (error) {
      console.warn('Failed to get version diff from cache:', error)
      return null
    }
  }

  /**
   * Met en cache une timeline de versions
   */
  static async setVersionTimeline(
    matrixId: number,
    timeline: any[]
  ): Promise<boolean> {
    const key = `${this.CACHE_PREFIXES.VERSION_TIMELINE}${matrixId}`
    
    try {
      const compressedTimeline = {
        versions: timeline.map(entry => this.compressTimelineEntry(entry)),
        generatedAt: new Date().toISOString(),
        totalVersions: timeline.length
      }

      return await cache.set(key, compressedTimeline, { 
        ttl: this.TTL.VERSION_TIMELINE 
      })
    } catch (error) {
      console.warn('Failed to cache version timeline:', error)
      return false
    }
  }

  /**
   * Récupère une timeline de versions
   */
  static async getVersionTimeline(matrixId: number): Promise<any[] | null> {
    const key = `${this.CACHE_PREFIXES.VERSION_TIMELINE}${matrixId}`
    
    try {
      const compressedTimeline = await cache.get<any>(key)
      if (!compressedTimeline) return null

      return compressedTimeline.versions.map((entry: any) => 
        this.decompressTimelineEntry(entry)
      )
    } catch (error) {
      console.warn('Failed to get version timeline from cache:', error)
      return null
    }
  }

  /**
   * Met en cache les statistiques d'historique globales
   */
  static async setHistoryStats(
    matrixId: number,
    stats: any
  ): Promise<boolean> {
    const key = `${this.CACHE_PREFIXES.HISTORY_STATS}${matrixId}`
    
    return await cache.set(key, stats, { 
      ttl: this.TTL.HISTORY_STATS 
    })
  }

  /**
   * Récupère les statistiques d'historique
   */
  static async getHistoryStats(matrixId: number): Promise<any | null> {
    const key = `${this.CACHE_PREFIXES.HISTORY_STATS}${matrixId}`
    return await cache.get(key)
  }

  /**
   * Cache un export formaté (CSV, Markdown, etc.)
   */
  static async setExportCache(
    matrixId: number,
    fromVersion: number,
    toVersion: number,
    format: string,
    content: string
  ): Promise<boolean> {
    const exportHash = this.generateExportHash(matrixId, fromVersion, toVersion, format)
    const key = `${this.CACHE_PREFIXES.EXPORT_CACHE}${exportHash}`
    
    const exportData = {
      content,
      format,
      versions: { from: fromVersion, to: toVersion },
      generatedAt: new Date().toISOString(),
      size: Buffer.byteLength(content, 'utf8')
    }

    return await cache.set(key, exportData, { 
      ttl: this.TTL.EXPORT_CACHE 
    })
  }

  /**
   * Récupère un export mis en cache
   */
  static async getExportCache(
    matrixId: number,
    fromVersion: number,
    toVersion: number,
    format: string
  ): Promise<{ content: string; generatedAt: string; size: number } | null> {
    const exportHash = this.generateExportHash(matrixId, fromVersion, toVersion, format)
    const key = `${this.CACHE_PREFIXES.EXPORT_CACHE}${exportHash}`
    
    const exportData = await cache.get<any>(key)
    if (!exportData) return null

    return {
      content: exportData.content,
      generatedAt: exportData.generatedAt,
      size: exportData.size
    }
  }

  /**
   * Invalide tout le cache d'historique pour une matrice
   */
  static async invalidateMatrixHistory(matrixId: number): Promise<void> {
    const patterns = Object.values(this.CACHE_PREFIXES).map(prefix => 
      `${prefix}${matrixId}*`
    )

    await Promise.all(
      patterns.map(pattern => cache.delPattern(pattern))
    )
  }

  /**
   * Invalide uniquement les caches dépendant des nouvelles versions
   */
  static async invalidateAfterNewVersion(matrixId: number): Promise<void> {
    const patterns = [
      `${this.CACHE_PREFIXES.VERSION_TIMELINE}${matrixId}`,
      `${this.CACHE_PREFIXES.HISTORY_STATS}${matrixId}`,
      `${this.CACHE_PREFIXES.VERSION_DIFF}${matrixId}*`,
    ]

    await Promise.all(
      patterns.map(pattern => 
        pattern.includes('*') ? cache.delPattern(pattern) : cache.del(pattern)
      )
    )
  }

  /**
   * Obtient des statistiques sur l'utilisation du cache d'historique
   */
  static async getCacheStats(matrixId: number): Promise<{
    snapshots: number;
    diffs: number;
    exports: number;
    totalMemory: string;
  }> {
    try {
      const patterns = [
        `${this.CACHE_PREFIXES.VERSION_SNAPSHOT}${matrixId}*`,
        `${this.CACHE_PREFIXES.VERSION_DIFF}${matrixId}*`,
        `${this.CACHE_PREFIXES.EXPORT_CACHE}*${matrixId}*`,
      ]

      const [snapshots, diffs, exports] = await Promise.all(
        patterns.map(async (pattern) => {
          // Compter les clés sans les récupérer pour économiser la mémoire
          return await this.countKeys(pattern)
        })
      )

      const memoryInfo = await cache.info() || 'N/A'

      return {
        snapshots,
        diffs,
        exports,
        totalMemory: this.parseMemoryUsage(memoryInfo)
      }
    } catch (error) {
      console.warn('Failed to get cache stats:', error)
      return {
        snapshots: 0,
        diffs: 0,
        exports: 0,
        totalMemory: 'N/A'
      }
    }
  }

  // Méthodes privées de compression et utilitaires

  private static compressSnapshot(snapshot: any): any {
    // Compression simple : supprimer les champs redondants et optimiser la structure
    return {
      entries: snapshot.entries?.map((entry: any) => ({
        // Garder seulement les champs essentiels
        id: entry.id,
        type: entry.request_type,
        status: entry.rule_status,
        name: entry.rule_name,
        device: entry.device,
        src: `${entry.src_zone}:${entry.src_name || entry.src_cidr}:${entry.src_service}`,
        dst: `${entry.dst_zone}:${entry.dst_name || entry.dst_cidr}:${entry.dst_service}`,
        proto: entry.protocol_group,
        action: entry.action,
        date: entry.implementation_date,
        req: entry.requester,
        comment: entry.comment
      })),
      meta: {
        count: snapshot.entries?.length || 0,
        compressed: true,
        version: '1.0'
      }
    }
  }

  private static decompressSnapshot(compressed: any): any {
    if (!compressed.meta?.compressed) return compressed

    return {
      entries: compressed.entries?.map((entry: any) => {
        const [srcZone, srcName, srcService] = entry.src.split(':')
        const [dstZone, dstName, dstService] = entry.dst.split(':')
        
        return {
          id: entry.id,
          request_type: entry.type,
          rule_status: entry.status,
          rule_name: entry.name,
          device: entry.device,
          src_zone: srcZone,
          src_name: srcName.includes('/') ? null : srcName,
          src_cidr: srcName.includes('/') ? srcName : null,
          src_service: srcService,
          dst_zone: dstZone,
          dst_name: dstName.includes('/') ? null : dstName,
          dst_cidr: dstName.includes('/') ? dstName : null,
          protocol_group: entry.proto,
          dst_service: dstService,
          action: entry.action,
          implementation_date: entry.date,
          requester: entry.req,
          comment: entry.comment
        }
      })
    }
  }

  private static compressDiff(diff: MatrixDiff): any {
    return {
      summary: diff.summary,
      entries: diff.entries.map(entry => ({
        type: entry.type,
        id: entry.entry?.id || entry.newEntry?.id || entry.oldEntry?.id,
        changes: entry.changes?.map(change => 
          `${change.field}:${change.oldValue}→${change.newValue}`
        )
      })),
      meta: diff.metadata
    }
  }

  private static decompressDiff(compressed: any): MatrixDiff {
    return {
      summary: compressed.summary,
      entries: compressed.entries.map((entry: any) => ({
        type: entry.type,
        entry: { id: entry.id },
        changes: entry.changes?.map((change: string) => {
          const [field, values] = change.split(':')
          const [oldValue, newValue] = values.split('→')
          return { field, oldValue, newValue, type: 'modified' as const }
        })
      })),
      metadata: compressed.meta
    }
  }

  private static compressImpact(impact: any): any {
    return {
      risk: impact.riskLevel,
      zones: impact.impactedZones.length,
      services: impact.impactedServices.length,
      critical: impact.criticalChanges.length,
      recommendations: impact.recommendations.length
    }
  }

  private static decompressImpact(compressed: any): any {
    return {
      riskLevel: compressed.risk,
      impactedZones: Array(compressed.zones).fill('zone'),
      impactedServices: Array(compressed.services).fill('service'),
      criticalChanges: Array(compressed.critical).fill('change'),
      recommendations: Array(compressed.recommendations).fill('recommendation')
    }
  }

  private static compressTimelineEntry(entry: any): any {
    return {
      v: entry.version,
      n: entry.note,
      at: entry.createdAt,
      by: entry.createdBy,
      cc: entry.changeCount,
      sum: entry.summary,
      hc: entry.hasChanges
    }
  }

  private static decompressTimelineEntry(compressed: any): any {
    return {
      version: compressed.v,
      note: compressed.n,
      createdAt: compressed.at,
      createdBy: compressed.by,
      changeCount: compressed.cc,
      summary: compressed.sum,
      hasChanges: compressed.hc
    }
  }

  private static generateExportHash(
    matrixId: number,
    fromVersion: number,
    toVersion: number,
    format: string
  ): string {
    const data = `${matrixId}:${fromVersion}:${toVersion}:${format}`
    return createHash('md5').update(data).digest('hex')
  }

  private static async countKeys(pattern: string): Promise<number> {
    // Compter sans récupérer les valeurs pour économiser la mémoire
    const redis = (cache as any).redis
    if (!redis) return 0

    try {
      const keys = await redis.keys(pattern)
      return keys.length
    } catch {
      return 0
    }
  }

  private static parseMemoryUsage(memoryInfo: string): string {
    try {
      const lines = memoryInfo.split('\n')
      const usedMemoryLine = lines.find(line => line.startsWith('used_memory_human:'))
      if (usedMemoryLine) {
        return usedMemoryLine.split(':')[1].trim()
      }
    } catch {
      // Ignore parsing errors
    }
    return 'N/A'
  }
}
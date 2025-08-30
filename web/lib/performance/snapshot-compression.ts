import { gzipSync, gunzipSync } from 'zlib'
import { createHash } from 'crypto'

/**
 * Types pour la compression des snapshots
 */
export interface CompressionStats {
  originalSize: number
  compressedSize: number
  ratio: number
  algorithm: string
  checksum: string
}

export interface CompressedSnapshot {
  data: Buffer
  stats: CompressionStats
  metadata: {
    version: string
    timestamp: Date
    fields: string[]
  }
}

/**
 * Service de compression avancé pour les snapshots de matrices
 * Utilise plusieurs techniques pour optimiser le stockage
 */
export class SnapshotCompressor {
  private static readonly COMPRESSION_VERSION = '2.0'
  
  // Dictionnaire des champs les plus fréquents pour la compression
  private static readonly FIELD_DICTIONARY = {
    'request_type': 'rt',
    'rule_status': 'rs', 
    'rule_name': 'rn',
    'device': 'dev',
    'src_zone': 'sz',
    'src_name': 'sn',
    'src_cidr': 'sc',
    'src_service': 'ss',
    'dst_zone': 'dz',
    'dst_name': 'dn',
    'dst_cidr': 'dc',
    'protocol_group': 'pg',
    'dst_service': 'ds',
    'action': 'act',
    'implementation_date': 'idate',
    'requester': 'req',
    'comment': 'cmt'
  }

  // Dictionnaire inversé pour la décompression
  private static readonly REVERSE_DICTIONARY = Object.fromEntries(
    Object.entries(this.FIELD_DICTIONARY).map(([k, v]) => [v, k])
  )

  // Valeurs fréquentes pour la compression
  private static readonly VALUE_DICTIONARY = {
    'ALLOW': 'A',
    'DENY': 'D',
    'ACTIVE': 'ACT',
    'INACTIVE': 'INA',
    'NEW': 'N',
    'MODIFY': 'M',
    'DELETE': 'DEL',
    'TCP': 'T',
    'UDP': 'U',
    'ICMP': 'I',
    'ANY': '*'
  }

  private static readonly REVERSE_VALUES = Object.fromEntries(
    Object.entries(this.VALUE_DICTIONARY).map(([k, v]) => [v, k])
  )

  /**
   * Compresse un snapshot avec optimisations avancées
   */
  static compress(snapshot: any): CompressedSnapshot {
    const startTime = Date.now()
    
    // Étape 1: Normalisation et déduplication
    const normalized = this.normalizeSnapshot(snapshot)
    
    // Étape 2: Compression par dictionnaire
    const dictionaryCompressed = this.applyDictionaryCompression(normalized)
    
    // Étape 3: Compression structurelle
    const structuralCompressed = this.applyStructuralCompression(dictionaryCompressed)
    
    // Étape 4: Compression GZIP finale
    const jsonString = JSON.stringify(structuralCompressed)
    const originalSize = Buffer.byteLength(jsonString, 'utf8')
    const compressedBuffer = gzipSync(jsonString)
    
    // Calcul du checksum pour vérifier l'intégrité
    const checksum = createHash('sha256').update(jsonString).digest('hex')
    
    const stats: CompressionStats = {
      originalSize,
      compressedSize: compressedBuffer.length,
      ratio: Math.round((1 - compressedBuffer.length / originalSize) * 100),
      algorithm: 'hybrid-gzip',
      checksum
    }

    const processingTime = Date.now() - startTime

    return {
      data: compressedBuffer,
      stats,
      metadata: {
        version: this.COMPRESSION_VERSION,
        timestamp: new Date(),
        fields: Object.keys(this.FIELD_DICTIONARY)
      }
    }
  }

  /**
   * Décompresse un snapshot
   */
  static decompress(compressed: CompressedSnapshot): any {
    try {
      // Décompression GZIP
      const jsonString = gunzipSync(compressed.data).toString('utf8')
      
      // Vérification du checksum
      const checksum = createHash('sha256').update(jsonString).digest('hex')
      if (checksum !== compressed.stats.checksum) {
        throw new Error('Checksum mismatch - data may be corrupted')
      }
      
      const structuralCompressed = JSON.parse(jsonString)
      
      // Décompression inverse
      const dictionaryCompressed = this.reverseStructuralCompression(structuralCompressed)
      const normalized = this.reverseDictionaryCompression(dictionaryCompressed)
      const original = this.denormalizeSnapshot(normalized)
      
      return original
    } catch (error) {
      console.error('Failed to decompress snapshot:', error)
      throw new Error(`Decompression failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Compresse spécifiquement pour le stockage Redis
   */
  static compressForRedis(snapshot: any): string {
    const compressed = this.compress(snapshot)
    // Retourne une version base64 pour Redis
    return compressed.data.toString('base64')
  }

  /**
   * Décompresse depuis Redis
   */
  static decompressFromRedis(compressedString: string): any {
    try {
      const buffer = Buffer.from(compressedString, 'base64')
      
      // Décompression directe sans vérification de checksum pour Redis
      const jsonString = gunzipSync(buffer).toString('utf8')
      const structuralCompressed = JSON.parse(jsonString)
      
      // Décompression inverse
      const dictionaryCompressed = this.reverseStructuralCompression(structuralCompressed)
      const normalized = this.reverseDictionaryCompression(dictionaryCompressed)
      const original = this.denormalizeSnapshot(normalized)
      
      return original
    } catch (error) {
      console.error('Failed to decompress from Redis:', error)
      throw new Error(`Redis decompression failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Analyse la compressibilité d'un snapshot
   */
  static analyzeCompressibility(snapshot: any): {
    estimatedRatio: number
    duplicatedFields: number
    commonValues: number
    recommendCompression: boolean
    estimatedSaving: number
  } {
    const jsonString = JSON.stringify(snapshot)
    const originalSize = Buffer.byteLength(jsonString, 'utf8')
    
    // Analyse des champs dupliqués
    const fieldCounts = new Map<string, number>()
    const valueCounts = new Map<string, number>()
    
    if (snapshot.entries) {
      snapshot.entries.forEach((entry: any) => {
        Object.keys(entry).forEach(key => {
          fieldCounts.set(key, (fieldCounts.get(key) || 0) + 1)
          const value = String(entry[key])
          valueCounts.set(value, (valueCounts.get(value) || 0) + 1)
        })
      })
    }

    const duplicatedFields = Array.from(fieldCounts.values())
      .filter(count => count > 1).length
    
    const commonValues = Array.from(valueCounts.values())
      .filter(count => count > 5).length

    // Estimation basée sur l'analyse
    let estimatedRatio = 30 // Base de 30%
    
    if (duplicatedFields > 10) estimatedRatio += 20
    if (commonValues > 20) estimatedRatio += 15
    if (originalSize > 100000) estimatedRatio += 10
    
    estimatedRatio = Math.min(estimatedRatio, 85) // Maximum 85%
    
    const estimatedSaving = Math.round(originalSize * (estimatedRatio / 100))
    
    return {
      estimatedRatio,
      duplicatedFields,
      commonValues,
      recommendCompression: originalSize > 10000 || estimatedRatio > 40,
      estimatedSaving
    }
  }

  /**
   * Normalise un snapshot pour optimiser la compression
   */
  private static normalizeSnapshot(snapshot: any): any {
    if (!snapshot.entries) return snapshot

    return {
      ...snapshot,
      entries: snapshot.entries.map((entry: any) => {
        const normalized: any = {}
        
        // Trier les clés pour une meilleure compression
        const sortedKeys = Object.keys(entry).sort()
        
        sortedKeys.forEach(key => {
          const value = entry[key]
          // Normaliser les valeurs null/undefined
          if (value === null || value === undefined || value === '') {
            normalized[key] = null
          } else {
            normalized[key] = value
          }
        })
        
        return normalized
      })
    }
  }

  /**
   * Applique la compression par dictionnaire
   */
  private static applyDictionaryCompression(snapshot: any): any {
    if (!snapshot.entries) return snapshot

    return {
      ...snapshot,
      entries: snapshot.entries.map((entry: any) => {
        const compressed: any = {}
        
        Object.keys(entry).forEach(key => {
          const compressedKey = this.FIELD_DICTIONARY[key] || key
          let value = entry[key]
          
          // Compresser les valeurs fréquentes
          if (typeof value === 'string') {
            value = this.VALUE_DICTIONARY[value] || value
          }
          
          compressed[compressedKey] = value
        })
        
        return compressed
      })
    }
  }

  /**
   * Applique la compression structurelle
   */
  private static applyStructuralCompression(snapshot: any): any {
    if (!snapshot.entries || snapshot.entries.length === 0) return snapshot

    // Identifier les colonnes communes
    const firstEntry = snapshot.entries[0]
    const commonKeys = Object.keys(firstEntry)
    
    // Créer un format colonnaire
    const columnar: any = {
      _format: 'columnar',
      _keys: commonKeys,
      _data: []
    }
    
    snapshot.entries.forEach((entry: any) => {
      const row = commonKeys.map(key => entry[key])
      columnar._data.push(row)
    })
    
    return {
      ...snapshot,
      entries: columnar
    }
  }

  /**
   * Inverse la compression par dictionnaire
   */
  private static reverseDictionaryCompression(snapshot: any): any {
    if (!snapshot.entries) return snapshot

    return {
      ...snapshot,
      entries: snapshot.entries.map((entry: any) => {
        const decompressed: any = {}
        
        Object.keys(entry).forEach(key => {
          const originalKey = this.REVERSE_DICTIONARY[key] || key
          let value = entry[key]
          
          // Décompresser les valeurs
          if (typeof value === 'string') {
            value = this.REVERSE_VALUES[value] || value
          }
          
          decompressed[originalKey] = value
        })
        
        return decompressed
      })
    }
  }

  /**
   * Inverse la compression structurelle
   */
  private static reverseStructuralCompression(snapshot: any): any {
    if (!snapshot.entries || snapshot.entries._format !== 'columnar') {
      return snapshot
    }

    const columnar = snapshot.entries
    const entries = columnar._data.map((row: any[]) => {
      const entry: any = {}
      columnar._keys.forEach((key: string, index: number) => {
        entry[key] = row[index]
      })
      return entry
    })

    return {
      ...snapshot,
      entries
    }
  }

  /**
   * Dénormalise un snapshot
   */
  private static denormalizeSnapshot(snapshot: any): any {
    // Pour l'instant, pas de transformation spécifique nécessaire
    return snapshot
  }

  /**
   * Obtient des statistiques détaillées sur la compression
   */
  static getCompressionStats(snapshots: CompressedSnapshot[]): {
    totalOriginalSize: number
    totalCompressedSize: number
    averageRatio: number
    bestRatio: number
    worstRatio: number
    totalSavings: number
  } {
    if (snapshots.length === 0) {
      return {
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        averageRatio: 0,
        bestRatio: 0,
        worstRatio: 0,
        totalSavings: 0
      }
    }

    const totalOriginalSize = snapshots.reduce((sum, s) => sum + s.stats.originalSize, 0)
    const totalCompressedSize = snapshots.reduce((sum, s) => sum + s.stats.compressedSize, 0)
    
    const ratios = snapshots.map(s => s.stats.ratio)
    const averageRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length
    const bestRatio = Math.max(...ratios)
    const worstRatio = Math.min(...ratios)
    
    const totalSavings = totalOriginalSize - totalCompressedSize

    return {
      totalOriginalSize,
      totalCompressedSize,
      averageRatio: Math.round(averageRatio),
      bestRatio,
      worstRatio,
      totalSavings
    }
  }
}
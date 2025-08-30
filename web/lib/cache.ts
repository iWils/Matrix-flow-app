import { Redis } from 'ioredis'

let redis: Redis | null = null

// Créer une instance Redis si elle n'existe pas déjà
function getRedisClient() {
  if (!redis && process.env.REDIS_URL) {
    try {
      redis = new Redis(process.env.REDIS_URL, {
        enableReadyCheck: false,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        // Optimisations pour les performances
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
      })

      redis.on('error', (err) => {
        console.warn('Redis connection error:', err)
        // Ne pas faire planter l'application si Redis n'est pas disponible
      })

      redis.on('ready', () => {
        console.log('Redis connection established')
      })
    } catch (error) {
      console.warn('Failed to initialize Redis:', error)
      redis = null
    }
  }
  return redis
}

// Interface pour les options de cache
interface CacheOptions {
  ttl?: number // Time to live en secondes
  serialize?: boolean // Sérialiser les objets en JSON
}

// Classe pour gérer le cache avec fallback
class CacheManager {
  private redis: Redis | null

  constructor() {
    this.redis = getRedisClient()
  }

  // Vérifie si Redis est disponible
  private isRedisAvailable(): boolean {
    return this.redis !== null && this.redis.status === 'ready'
  }

  // Obtenir une valeur du cache
  async get<T>(key: string): Promise<T | null> {
    if (!this.isRedisAvailable()) {
      return null
    }

    try {
      const value = await this.redis!.get(key)
      if (value === null) return null
      
      // Tenter de parser le JSON, sinon retourner la valeur brute
      try {
        return JSON.parse(value) as T
      } catch {
        return value as unknown as T
      }
    } catch (error) {
      console.warn('Cache get error:', error)
      return null
    }
  }

  // Définir une valeur dans le cache
  async set(key: string, value: unknown, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isRedisAvailable()) {
      return false
    }

    try {
      const { ttl = 3600, serialize = true } = options
      const serializedValue = serialize ? JSON.stringify(value) : String(value)
      
      if (ttl > 0) {
        await this.redis!.setex(key, ttl, serializedValue)
      } else {
        await this.redis!.set(key, serializedValue)
      }
      
      return true
    } catch (error) {
      console.warn('Cache set error:', error)
      return false
    }
  }

  // Supprimer une clé du cache
  async del(key: string | string[]): Promise<number> {
    if (!this.isRedisAvailable()) {
      return 0
    }

    try {
      const keys = Array.isArray(key) ? key : [key]
      return await this.redis!.del(...keys)
    } catch (error) {
      console.warn('Cache del error:', error)
      return 0
    }
  }

  // Supprimer toutes les clés qui correspondent au pattern
  async delPattern(pattern: string): Promise<number> {
    if (!this.isRedisAvailable()) {
      return 0
    }

    try {
      const keys = await this.redis!.keys(pattern)
      if (keys.length === 0) return 0
      return await this.redis!.del(...keys)
    } catch (error) {
      console.warn('Cache delPattern error:', error)
      return 0
    }
  }

  // Vérifier si une clé existe
  async exists(key: string): Promise<boolean> {
    if (!this.isRedisAvailable()) {
      return false
    }

    try {
      const result = await this.redis!.exists(key)
      return result === 1
    } catch (error) {
      console.warn('Cache exists error:', error)
      return false
    }
  }

  // Définir un TTL sur une clé existante
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isRedisAvailable()) {
      return false
    }

    try {
      const result = await this.redis!.expire(key, seconds)
      return result === 1
    } catch (error) {
      console.warn('Cache expire error:', error)
      return false
    }
  }

  // Incrémenter une valeur numérique
  async incr(key: string, by: number = 1): Promise<number | null> {
    if (!this.isRedisAvailable()) {
      return null
    }

    try {
      if (by === 1) {
        return await this.redis!.incr(key)
      } else {
        return await this.redis!.incrby(key, by)
      }
    } catch (error) {
      console.warn('Cache incr error:', error)
      return null
    }
  }

  // Méthode pour les statistiques du cache
  async info(): Promise<string | null> {
    if (!this.isRedisAvailable()) {
      return null
    }

    try {
      return await this.redis!.info('memory')
    } catch (error) {
      console.warn('Cache info error:', error)
      return null
    }
  }

  // Fermer la connexion Redis
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
      this.redis = null
    }
  }
}

// Instance singleton
export const cache = new CacheManager()

// Utilitaires spécialisés pour les matrices
export class MatrixCache {
  private static readonly CACHE_PREFIXES = {
    MATRIX: 'matrix:',
    MATRIX_ENTRIES: 'matrix:entries:',
    MATRIX_STATS: 'matrix:stats:',
    DASHBOARD_STATS: 'dashboard:stats',
    USER_MATRICES: 'user:matrices:',
    SEARCH_RESULTS: 'search:',
  }

  private static readonly DEFAULT_TTL = {
    MATRIX: 1800, // 30 minutes
    ENTRIES: 900, // 15 minutes
    STATS: 300, // 5 minutes
    SEARCH: 600, // 10 minutes
  }

  // Cache une matrice complète
  static async setMatrix(matrixId: number, matrix: unknown): Promise<void> {
    const key = `${this.CACHE_PREFIXES.MATRIX}${matrixId}`
    await cache.set(key, matrix, { ttl: this.DEFAULT_TTL.MATRIX })
  }

  // Récupère une matrice du cache
  static async getMatrix(matrixId: number): Promise<unknown> {
    const key = `${this.CACHE_PREFIXES.MATRIX}${matrixId}`
    return (await cache.get(key)) || null
  }

  // Cache les entrées d'une matrice
  static async setMatrixEntries(matrixId: number, entries: unknown[]): Promise<void> {
    const key = `${this.CACHE_PREFIXES.MATRIX_ENTRIES}${matrixId}`
    await cache.set(key, entries, { ttl: this.DEFAULT_TTL.ENTRIES })
  }

  // Récupère les entrées d'une matrice
  static async getMatrixEntries(matrixId: number): Promise<unknown[]> {
    const key = `${this.CACHE_PREFIXES.MATRIX_ENTRIES}${matrixId}`
    return (await cache.get(key)) as unknown[] || []
  }

  // Cache les statistiques d'une matrice
  static async setMatrixStats(matrixId: number, stats: unknown): Promise<void> {
    const key = `${this.CACHE_PREFIXES.MATRIX_STATS}${matrixId}`
    await cache.set(key, stats, { ttl: this.DEFAULT_TTL.STATS })
  }

  // Récupère les statistiques d'une matrice
  static async getMatrixStats(matrixId: number): Promise<unknown> {
    const key = `${this.CACHE_PREFIXES.MATRIX_STATS}${matrixId}`
    return (await cache.get(key)) || null
  }

  // Cache les statistiques du dashboard
  static async setDashboardStats(userId: number, stats: unknown): Promise<void> {
    const key = `${this.CACHE_PREFIXES.DASHBOARD_STATS}:${userId}`
    await cache.set(key, stats, { ttl: this.DEFAULT_TTL.STATS })
  }

  // Récupère les statistiques du dashboard
  static async getDashboardStats(userId: number): Promise<unknown> {
    const key = `${this.CACHE_PREFIXES.DASHBOARD_STATS}:${userId}`
    return await cache.get(key)
  }

  // Cache les résultats de recherche
  static async setSearchResults(searchHash: string, results: unknown): Promise<void> {
    const key = `${this.CACHE_PREFIXES.SEARCH_RESULTS}${searchHash}`
    await cache.set(key, results, { ttl: this.DEFAULT_TTL.SEARCH })
  }

  // Récupère les résultats de recherche
  static async getSearchResults(searchHash: string): Promise<unknown> {
    const key = `${this.CACHE_PREFIXES.SEARCH_RESULTS}${searchHash}`
    return await cache.get(key)
  }

  // Invalide le cache d'une matrice (après modification)
  static async invalidateMatrix(matrixId: number): Promise<void> {
    const patterns = [
      `${this.CACHE_PREFIXES.MATRIX}${matrixId}`,
      `${this.CACHE_PREFIXES.MATRIX_ENTRIES}${matrixId}`,
      `${this.CACHE_PREFIXES.MATRIX_STATS}${matrixId}`,
      `${this.CACHE_PREFIXES.SEARCH_RESULTS}*`, // Invalider toutes les recherches
    ]

    await Promise.all(patterns.map(pattern => 
      pattern.includes('*') ? cache.delPattern(pattern) : cache.del(pattern)
    ))
  }

  // Invalide le cache du dashboard
  static async invalidateDashboardStats(userId?: number): Promise<void> {
    if (userId) {
      const key = `${this.CACHE_PREFIXES.DASHBOARD_STATS}:${userId}`
      await cache.del(key)
    } else {
      // Invalider tous les dashboards
      await cache.delPattern(`${this.CACHE_PREFIXES.DASHBOARD_STATS}:*`)
    }
  }

  // Invalide toutes les recherches (après des modifications importantes)
  static async invalidateSearchResults(): Promise<void> {
    await cache.delPattern(`${this.CACHE_PREFIXES.SEARCH_RESULTS}*`)
  }

  // Génère un hash pour une recherche (pour la mise en cache)
  static generateSearchHash(filters: Record<string, unknown>, userId: number): string {
    const searchString = JSON.stringify({ filters, userId })
    return Buffer.from(searchString).toString('base64').slice(0, 32)
  }
}

// Hook pour nettoyer les connexions lors de l'arrêt du processus
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await cache.disconnect()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    await cache.disconnect()
    process.exit(0)
  })
}

export default cache
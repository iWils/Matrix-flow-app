// Conditional Redis import for Edge Runtime compatibility
let Redis: typeof import('ioredis').Redis | null = null
if (typeof window === 'undefined' && !process.env.NEXT_RUNTIME) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Redis = require('ioredis').Redis
}

interface RateLimitOptions {
  window: number // Fenêtre en millisecondes
  max: number // Nombre maximum de requêtes
  keyGenerator?: (identifier: string) => string
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

export class RateLimiter {
  private redis?: any
  private fallbackStore = new Map<string, { count: number; resetTime: number }>()

  constructor() {
    // Connexion Redis optionnelle (only in Node.js runtime)
    if (process.env.REDIS_URL && Redis && !process.env.NEXT_RUNTIME) {
      try {
        this.redis = new Redis(process.env.REDIS_URL)
        this.redis.on('error', () => {
          console.warn('Redis unavailable for rate limiting, using in-memory fallback')
        })
      } catch {
        console.warn('Redis connection failed, using in-memory rate limiting')
      }
    }
  }

  async checkLimit(
    identifier: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    const { window, max, keyGenerator } = options
    const key = keyGenerator ? keyGenerator(identifier) : `rate_limit:${identifier}`
    const now = Date.now()
    const windowStart = now - window

    if (this.redis) {
      return this.checkLimitRedis(key, window, max, now, windowStart)
    } else {
      return this.checkLimitMemory(key, window, max, now)
    }
  }

  private async checkLimitRedis(
    key: string,
    window: number,
    max: number,
    now: number,
    windowStart: number
  ): Promise<RateLimitResult> {
    try {
      // Script Lua atomique pour éviter les conditions de course
      const luaScript = `
        local key = KEYS[1]
        local window_start = ARGV[1]
        local now = ARGV[2]
        local max_requests = tonumber(ARGV[3])
        local window = tonumber(ARGV[4])

        -- Nettoyer les anciennes entrées
        redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)
        
        -- Compter les requêtes actuelles
        local current_requests = redis.call('ZCARD', key)
        
        if current_requests < max_requests then
          -- Ajouter la nouvelle requête
          redis.call('ZADD', key, now, now)
          redis.call('EXPIRE', key, math.ceil(window / 1000))
          return {1, max_requests - current_requests - 1, now + window}
        else
          -- Limite atteinte
          local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
          local reset_time = now + window
          if #oldest > 0 then
            reset_time = tonumber(oldest[2]) + window
          end
          return {0, 0, reset_time}
        end
      `

      const result = await this.redis!.eval(
        luaScript,
        1,
        key,
        windowStart.toString(),
        now.toString(),
        max.toString(),
        window.toString()
      ) as [number, number, number]

      const [allowed, remaining, resetTime] = result

      return {
        allowed: allowed === 1,
        remaining,
        resetTime,
        retryAfter: allowed === 0 ? Math.ceil((resetTime - now) / 1000) : undefined
      }
    } catch (error) {
      console.warn('Redis rate limiting failed:', error)
      // Fallback vers mémoire
      return this.checkLimitMemory(key, window, max, now)
    }
  }

  private checkLimitMemory(
    key: string,
    window: number,
    max: number,
    now: number
  ): RateLimitResult {
    // Nettoyer les anciennes entrées
    for (const [storeKey, value] of this.fallbackStore.entries()) {
      if (value.resetTime < now) {
        this.fallbackStore.delete(storeKey)
      }
    }

    const current = this.fallbackStore.get(key) || { count: 0, resetTime: now + window }

    // Réinitialiser si la fenêtre est expirée
    if (current.resetTime < now) {
      current.count = 0
      current.resetTime = now + window
    }

    if (current.count < max) {
      current.count++
      this.fallbackStore.set(key, current)

      return {
        allowed: true,
        remaining: max - current.count,
        resetTime: current.resetTime
      }
    }

    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime,
      retryAfter: Math.ceil((current.resetTime - now) / 1000)
    }
  }
}

// Instances pré-configurées pour différents endpoints
export const rateLimiters = {
  // Authentification - très restrictif
  auth: new RateLimiter(),
  
  // API générale - modéré
  api: new RateLimiter(),
  
  // Dashboard - permissif
  dashboard: new RateLimiter(),
  
  // Global par IP - restrictif
  global: new RateLimiter()
}

// Configuration des limites par endpoint
export const RATE_LIMITS = {
  // Authentification : 5 tentatives par 15 minutes
  AUTH: { window: 15 * 60 * 1000, max: 5 },
  
  // Login : 10 tentatives par heure  
  LOGIN: { window: 60 * 60 * 1000, max: 10 },
  
  // API : 1000 requêtes par heure
  API: { window: 60 * 60 * 1000, max: 1000 },
  
  // Dashboard : 500 requêtes par heure
  DASHBOARD: { window: 60 * 60 * 1000, max: 500 },
  
  // Global : 2000 requêtes par heure par IP
  GLOBAL: { window: 60 * 60 * 1000, max: 2000 }
} as const

export default RateLimiter
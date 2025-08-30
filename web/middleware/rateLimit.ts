import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters, RATE_LIMITS } from '@/lib/security/rateLimit'

// Types pour les options de rate limiting
interface RateLimitMiddlewareOptions {
  type: keyof typeof RATE_LIMITS
  keyGenerator?: (req: NextRequest) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  onLimitReached?: (req: NextRequest) => void
}

// Helper pour extraire l'IP du client
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (cfConnectingIp) {
    return cfConnectingIp
  }
  if (realIp) {
    return realIp
  }
  
  // Fallback pour développement local
  return (request as any).ip || 'unknown'
}

// Helper pour générer une clé de rate limiting
function generateRateLimitKey(
  request: NextRequest, 
  type: keyof typeof RATE_LIMITS,
  customGenerator?: (req: NextRequest) => string
): string {
  if (customGenerator) {
    return customGenerator(request)
  }

  const ip = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  // Hash simple du user-agent pour éviter les clés trop longues
  const uaHash = Buffer.from(userAgent).toString('base64').slice(0, 8)
  
  return `${type.toLowerCase()}:${ip}:${uaHash}`
}

// Middleware principal de rate limiting
export async function rateLimitMiddleware(
  request: NextRequest,
  options: RateLimitMiddlewareOptions
): Promise<NextResponse | null> {
  try {
    const { type, keyGenerator, onLimitReached } = options
    const limits = RATE_LIMITS[type]
    
    if (!limits) {
      console.warn(`Unknown rate limit type: ${type}`)
      return null
    }

    // Générer la clé de rate limiting
    const identifier = generateRateLimitKey(request, type, keyGenerator)
    
    // Sélectionner le rate limiter approprié
    const limiter = rateLimiters[type.toLowerCase() as keyof typeof rateLimiters] || rateLimiters.global

    // Vérifier la limite
    const result = await limiter.checkLimit(identifier, {
      window: limits.window,
      max: limits.max,
      keyGenerator: (id: string) => id
    })

    // Ajouter les headers de rate limiting
    const headers = new Headers()
    headers.set('X-RateLimit-Limit', limits.max.toString())
    headers.set('X-RateLimit-Remaining', result.remaining.toString())
    headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString())

    if (!result.allowed) {
      // Limite atteinte - logs et callback
      console.warn(`Rate limit exceeded for ${type}: ${identifier}`)
      
      if (onLimitReached) {
        onLimitReached(request)
      }

      // Headers supplémentaires pour les cas d'erreur
      if (result.retryAfter) {
        headers.set('Retry-After', result.retryAfter.toString())
      }

      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many ${type.toLowerCase()} requests. Try again later.`,
          retryAfter: result.retryAfter
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(headers.entries())
          }
        }
      )
    }

    // Limite respectée - ajouter les headers et continuer
    const response = NextResponse.next()
    headers.forEach((value, key) => {
      response.headers.set(key, value)
    })

    return response

  } catch (error) {
    // En cas d'erreur du rate limiter, on laisse passer la requête
    // mais on log l'erreur pour investigation
    console.error('Rate limiting middleware error:', error)
    return null
  }
}

// Wrappers spécialisés pour différents types d'endpoints
export const authRateLimit = (request: NextRequest) => 
  rateLimitMiddleware(request, {
    type: 'AUTH',
    onLimitReached: (req) => {
      console.warn(`Authentication rate limit exceeded from IP: ${getClientIP(req)}`)
    }
  })

export const loginRateLimit = (request: NextRequest) =>
  rateLimitMiddleware(request, {
    type: 'LOGIN',
    keyGenerator: (req) => {
      // Pour le login, on peut utiliser l'email si disponible
      const ip = getClientIP(req)
      return `login:${ip}`
    },
    onLimitReached: (req) => {
      console.warn(`Login rate limit exceeded from IP: ${getClientIP(req)}`)
    }
  })

export const apiRateLimit = (request: NextRequest) =>
  rateLimitMiddleware(request, {
    type: 'API',
    onLimitReached: (req) => {
      console.warn(`API rate limit exceeded from IP: ${getClientIP(req)}`)
    }
  })

export const dashboardRateLimit = (request: NextRequest) =>
  rateLimitMiddleware(request, {
    type: 'DASHBOARD'
  })

export const globalRateLimit = (request: NextRequest) =>
  rateLimitMiddleware(request, {
    type: 'GLOBAL',
    onLimitReached: (req) => {
      const ip = getClientIP(req)
      const path = req.nextUrl.pathname
      console.warn(`Global rate limit exceeded from IP: ${ip} on path: ${path}`)
    }
  })

// Helper pour appliquer le rate limiting dans les API routes
export function withRateLimit<T extends Record<string, unknown>>(
  handler: (req: NextRequest, context: T) => Promise<NextResponse>,
  rateLimitType: keyof typeof RATE_LIMITS
) {
  return async (req: NextRequest, context: T): Promise<NextResponse> => {
    // Appliquer le rate limiting
    const rateLimitResponse = await rateLimitMiddleware(req, { type: rateLimitType })
    
    if (rateLimitResponse && rateLimitResponse.status === 429) {
      return rateLimitResponse
    }

    // Continuer avec le handler original
    const response = await handler(req, context)
    
    // Copier les headers de rate limiting si ils existent
    if (rateLimitResponse?.headers) {
      rateLimitResponse.headers.forEach((value, key) => {
        if (key.startsWith('X-RateLimit')) {
          response.headers.set(key, value)
        }
      })
    }

    return response
  }
}

export default rateLimitMiddleware
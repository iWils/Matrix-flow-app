import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Configuration des headers de sécurité
export interface SecurityHeadersConfig {
  contentSecurityPolicy?: {
    enabled: boolean
    directives?: {
      defaultSrc?: string[]
      scriptSrc?: string[]
      styleSrc?: string[]
      imgSrc?: string[]
      connectSrc?: string[]
      fontSrc?: string[]
      objectSrc?: string[]
      mediaSrc?: string[]
      frameSrc?: string[]
      childSrc?: string[]
      manifestSrc?: string[]
      workerSrc?: string[]
      formAction?: string[]
      baseUri?: string[]
      upgradeInsecureRequests?: boolean
      blockAllMixedContent?: boolean
    }
  }
  hsts?: {
    enabled: boolean
    maxAge?: number
    includeSubdomains?: boolean
    preload?: boolean
  }
  frameOptions?: {
    enabled: boolean
    value: 'DENY' | 'SAMEORIGIN' | string
  }
  contentTypeOptions?: boolean
  referrerPolicy?: {
    enabled: boolean
    policy: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url'
  }
  permissionsPolicy?: {
    enabled: boolean
    directives?: Record<string, string[]>
  }
  crossOriginEmbedderPolicy?: {
    enabled: boolean
    value: 'require-corp' | 'unsafe-none' | 'credentialless'
  }
  crossOriginOpenerPolicy?: {
    enabled: boolean
    value: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none'
  }
  crossOriginResourcePolicy?: {
    enabled: boolean
    value: 'same-site' | 'same-origin' | 'cross-origin'
  }
}

// Configuration par défaut pour l'application Matrix Flow
export const DEFAULT_SECURITY_CONFIG: SecurityHeadersConfig = {
  contentSecurityPolicy: {
    enabled: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Nécessaire pour Next.js en dev
        "'unsafe-eval'", // Nécessaire pour Next.js
        "https://vercel.live"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Nécessaire pour Tailwind CSS
        "https://fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:"
      ],
      connectSrc: [
        "'self'",
        "https://vercel.live",
        "wss://vercel.live"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      childSrc: ["'none'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: true,
      blockAllMixedContent: true
    }
  },
  hsts: {
    enabled: true,
    maxAge: 63072000, // 2 ans
    includeSubdomains: true,
    preload: true
  },
  frameOptions: {
    enabled: true,
    value: 'DENY'
  },
  contentTypeOptions: true,
  referrerPolicy: {
    enabled: true,
    policy: 'strict-origin-when-cross-origin'
  },
  permissionsPolicy: {
    enabled: true,
    directives: {
      'camera': ['()'],
      'microphone': ['()'],
      'geolocation': ['()'],
      'interest-cohort': ['()'], // Disable FLoC
      'payment': ['()'],
      'usb': ['()'],
      'magnetometer': ['()'],
      'accelerometer': ['()'],
      'gyroscope': ['()']
    }
  },
  crossOriginEmbedderPolicy: {
    enabled: false, // Peut casser certaines fonctionnalités
    value: 'unsafe-none'
  },
  crossOriginOpenerPolicy: {
    enabled: true,
    value: 'same-origin'
  },
  crossOriginResourcePolicy: {
    enabled: true,
    value: 'same-origin'
  }
}

// Configuration spécifique pour le développement
export const DEV_SECURITY_CONFIG: SecurityHeadersConfig = {
  ...DEFAULT_SECURITY_CONFIG,
  contentSecurityPolicy: {
    enabled: true,
    ...DEFAULT_SECURITY_CONFIG.contentSecurityPolicy,
    directives: {
      ...DEFAULT_SECURITY_CONFIG.contentSecurityPolicy?.directives,
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://vercel.live",
        "http://localhost:*", // Webpack dev server
        "ws://localhost:*"
      ],
      connectSrc: [
        "'self'",
        "https://vercel.live",
        "wss://vercel.live",
        "http://localhost:*",
        "ws://localhost:*",
        "ws://127.0.0.1:*"
      ]
    }
  },
  hsts: {
    enabled: false // Pas nécessaire en dev local
  }
}

// Fonction pour construire la directive CSP
function buildCSPDirective(directives: Record<string, unknown>): string {
  const parts: string[] = []

  Object.entries(directives).forEach(([key, value]) => {
    if (key === 'upgradeInsecureRequests' && value === true) {
      parts.push('upgrade-insecure-requests')
    } else if (key === 'blockAllMixedContent' && value === true) {
      parts.push('block-all-mixed-content')
    } else if (Array.isArray(value) && value.length > 0) {
      const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
      parts.push(`${kebabKey} ${value.join(' ')}`)
    }
  })

  return parts.join('; ')
}

// Fonction pour construire la directive Permissions Policy
function buildPermissionsPolicyDirective(directives: Record<string, string[]>): string {
  const parts: string[] = []

  Object.entries(directives).forEach(([feature, allowlist]) => {
    if (allowlist.length === 0 || (allowlist.length === 1 && allowlist[0] === '()')) {
      parts.push(`${feature}=()`)
    } else {
      const values = allowlist.map(origin => 
        origin === '*' ? '*' : `"${origin}"`
      ).join(' ')
      parts.push(`${feature}=(${values})`)
    }
  })

  return parts.join(', ')
}

// Middleware principal pour les headers de sécurité
export function applySecurityHeaders(
  response: NextResponse,
  request: NextRequest,
  config?: SecurityHeadersConfig
): NextResponse {
  const isDev = process.env.NODE_ENV === 'development'
  const securityConfig = config || (isDev ? DEV_SECURITY_CONFIG : DEFAULT_SECURITY_CONFIG)

  // Content Security Policy
  if (securityConfig.contentSecurityPolicy?.enabled && securityConfig.contentSecurityPolicy.directives) {
    const cspValue = buildCSPDirective(securityConfig.contentSecurityPolicy.directives)
    response.headers.set('Content-Security-Policy', cspValue)
    
    // Report-Only variant pour les tests (uniquement en dev)
    if (isDev) {
      response.headers.set('Content-Security-Policy-Report-Only', cspValue)
    }
  }

  // HTTP Strict Transport Security
  if (securityConfig.hsts?.enabled && !isDev) {
    let hstsValue = `max-age=${securityConfig.hsts.maxAge || 63072000}`
    if (securityConfig.hsts.includeSubdomains) {
      hstsValue += '; includeSubDomains'
    }
    if (securityConfig.hsts.preload) {
      hstsValue += '; preload'
    }
    response.headers.set('Strict-Transport-Security', hstsValue)
  }

  // X-Frame-Options
  if (securityConfig.frameOptions?.enabled) {
    response.headers.set('X-Frame-Options', securityConfig.frameOptions.value)
  }

  // X-Content-Type-Options
  if (securityConfig.contentTypeOptions) {
    response.headers.set('X-Content-Type-Options', 'nosniff')
  }

  // Referrer Policy
  if (securityConfig.referrerPolicy?.enabled) {
    response.headers.set('Referrer-Policy', securityConfig.referrerPolicy.policy)
  }

  // Permissions Policy
  if (securityConfig.permissionsPolicy?.enabled && securityConfig.permissionsPolicy.directives) {
    const ppValue = buildPermissionsPolicyDirective(securityConfig.permissionsPolicy.directives)
    response.headers.set('Permissions-Policy', ppValue)
  }

  // Cross-Origin-Embedder-Policy
  if (securityConfig.crossOriginEmbedderPolicy?.enabled) {
    response.headers.set('Cross-Origin-Embedder-Policy', securityConfig.crossOriginEmbedderPolicy.value)
  }

  // Cross-Origin-Opener-Policy
  if (securityConfig.crossOriginOpenerPolicy?.enabled) {
    response.headers.set('Cross-Origin-Opener-Policy', securityConfig.crossOriginOpenerPolicy.value)
  }

  // Cross-Origin-Resource-Policy
  if (securityConfig.crossOriginResourcePolicy?.enabled) {
    response.headers.set('Cross-Origin-Resource-Policy', securityConfig.crossOriginResourcePolicy.value)
  }

  // Headers anti-fingerprinting et sécurité supplémentaires
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('X-Download-Options', 'noopen')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  
  // Ne pas révéler la technologie utilisée
  response.headers.delete('X-Powered-By')
  response.headers.set('Server', 'Matrix Flow')

  return response
}

// Helper pour vérifier si la requête nécessite des headers spéciaux
export function shouldApplySecurityHeaders(request: NextRequest): boolean {
  const { pathname } = request.nextUrl
  
  // Ne pas appliquer aux assets statiques
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|css|js)$/)
  ) {
    return false
  }

  return true
}

// Helper pour obtenir la configuration basée sur l'environnement
export function getSecurityConfig(): SecurityHeadersConfig {
  return process.env.NODE_ENV === 'development' ? DEV_SECURITY_CONFIG : DEFAULT_SECURITY_CONFIG
}

export default applySecurityHeaders
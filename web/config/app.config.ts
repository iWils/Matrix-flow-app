// Configuration de l'application
// Cette configuration centralise les URLs et paramètres de l'application

export const appConfig = {
  // URL de base de l'application (utilisée pour les redirections)
  // En production, utilisez votre domaine réel
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  
  // Configuration de l'authentification
  auth: {
    // URL publique pour les redirections (accessible depuis le navigateur)
    publicUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000',
  }
}

// Fonction helper pour obtenir l'URL absolue
export function getAbsoluteUrl(path: string = ''): string {
  const baseUrl = appConfig.auth.publicUrl
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${cleanPath}`
}
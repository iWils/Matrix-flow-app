// Utilitaire d'internationalisation pour les messages d'API
// Centralise tous les messages traduits pour une gestion cohérente

export interface I18nMessage {
  fr: string
  en: string
  es: string
}

export const API_MESSAGES = {
  // Webhooks
  webhookTemplateCreated: {
    fr: 'Template de webhook créé avec succès',
    en: 'Webhook template created successfully',
    es: 'Plantilla de webhook creada exitosamente'
  },
  webhookTemplateUpdated: {
    fr: 'Template de webhook mis à jour avec succès',
    en: 'Webhook template updated successfully',
    es: 'Plantilla de webhook actualizada exitosamente'
  },
  webhookTemplateDeleted: {
    fr: 'Template de webhook supprimé avec succès',
    en: 'Webhook template deleted successfully',
    es: 'Plantilla de webhook eliminada exitosamente'
  },
  webhookSent: {
    fr: 'Webhook envoyé avec succès',
    en: 'Webhook sent successfully',
    es: 'Webhook enviado exitosamente'
  },
  webhookError: {
    fr: 'Erreur lors de l\'envoi du webhook',
    en: 'Error sending webhook',
    es: 'Error al enviar webhook'
  },

  // 2FA
  twoFactorEnabled: {
    fr: 'Authentification à deux facteurs activée avec succès',
    en: 'Two-factor authentication enabled successfully',
    es: 'Autenticación de dos factores habilitada exitosamente'
  },
  twoFactorDisabled: {
    fr: 'Authentification à deux facteurs désactivée avec succès',
    en: 'Two-factor authentication disabled successfully',
    es: 'Autenticación de dos factores deshabilitada exitosamente'
  },
  twoFactorError: {
    fr: 'Erreur lors de la configuration 2FA',
    en: 'Error configuring 2FA',
    es: 'Error al configurar 2FA'
  },

  // Audit
  auditLogsFetched: {
    fr: 'Logs d\'audit récupérés avec succès',
    en: 'Audit logs retrieved successfully',
    es: 'Logs de auditoría recuperados exitosamente'
  },
  auditError: {
    fr: 'Erreur lors de la récupération des logs d\'audit',
    en: 'Error retrieving audit logs',
    es: 'Error al recuperar logs de auditoría'
  },

  // Change Requests / Workflow
  changeRequestApproved: {
    fr: 'Demande de changement approuvée avec succès',
    en: 'Change request approved successfully',
    es: 'Solicitud de cambio aprobada exitosamente'
  },
  changeRequestRejected: {
    fr: 'Demande de changement rejetée avec succès',
    en: 'Change request rejected successfully',
    es: 'Solicitud de cambio rechazada exitosamente'
  },
  changeRequestCreated: {
    fr: 'Demande de changement créée avec succès',
    en: 'Change request created successfully',
    es: 'Solicitud de cambio creada exitosamente'
  },
  changeRequestError: {
    fr: 'Erreur lors du traitement de la demande',
    en: 'Error processing change request',
    es: 'Error al procesar solicitud de cambio'
  },

  // Notifications
  notificationPreferencesUpdated: {
    fr: 'Préférences de notification mises à jour avec succès',
    en: 'Notification preferences updated successfully',
    es: 'Preferencias de notificación actualizadas exitosamente'
  },
  notificationError: {
    fr: 'Erreur lors de la mise à jour des préférences',
    en: 'Error updating notification preferences',
    es: 'Error al actualizar preferencias de notificación'
  },

  // Utilisateurs
  userStatusUpdated: {
    fr: 'Statut utilisateur mis à jour avec succès',
    en: 'User status updated successfully',
    es: 'Estado de usuario actualizado exitosamente'
  },
  passwordReset: {
    fr: 'Mot de passe réinitialisé avec succès',
    en: 'Password reset successfully',
    es: 'Contraseña restablecida exitosamente'
  },
  nameChanged: {
    fr: 'Nom modifié avec succès',
    en: 'Name changed successfully',
    es: 'Nombre cambiado exitosamente'
  },
  passwordChanged: {
    fr: 'Mot de passe modifié avec succès',
    en: 'Password changed successfully',
    es: 'Contraseña cambiada exitosamente'
  },

  // Matrices
  matrixCreated: {
    fr: 'Matrice créée avec succès',
    en: 'Matrix created successfully',
    es: 'Matriz creada exitosamente'
  },
  matrixUpdated: {
    fr: 'Matrice mise à jour avec succès',
    en: 'Matrix updated successfully',
    es: 'Matriz actualizada exitosamente'
  },
  matrixDeleted: {
    fr: 'Matrice supprimée avec succès',
    en: 'Matrix deleted successfully',
    es: 'Matriz eliminada exitosamente'
  },
  matrixVersionCreated: {
    fr: 'Version de matrice créée avec succès',
    en: 'Matrix version created successfully',
    es: 'Versión de matriz creada exitosamente'
  },

  // Erreurs génériques
  unauthorized: {
    fr: 'Non autorisé',
    en: 'Unauthorized',
    es: 'No autorizado'
  },
  adminRequired: {
    fr: 'Accès administrateur requis',
    en: 'Admin access required',
    es: 'Acceso de administrador requerido'
  },
  userNotFound: {
    fr: 'Utilisateur non trouvé',
    en: 'User not found',
    es: 'Usuario no encontrado'
  },
  invalidToken: {
    fr: 'Token invalide',
    en: 'Invalid token',
    es: 'Token inválido'
  },
  internalError: {
    fr: 'Erreur interne du serveur',
    en: 'Internal server error',
    es: 'Error interno del servidor'
  },

  // Auth Providers
  authProviderSaved: {
    fr: 'Fournisseur d\'authentification sauvegardé avec succès',
    en: 'Authentication provider saved successfully',
    es: 'Proveedor de autenticación guardado exitosamente'
  },
  authProviderDeleted: {
    fr: 'Fournisseur d\'authentification supprimé avec succès',
    en: 'Authentication provider deleted successfully',
    es: 'Proveedor de autenticación eliminado exitosamente'
  },
  authProviderError: {
    fr: 'Erreur lors de la configuration du fournisseur d\'authentification',
    en: 'Error configuring authentication provider',
    es: 'Error al configurar proveedor de autenticación'
  }
} as const

export type MessageKey = keyof typeof API_MESSAGES

/**
 * Récupère un message traduit selon la langue
 * @param key - Clé du message
 * @param lang - Langue (fr, en, es)
 * @returns Message traduit
 */
export function getMessage(key: MessageKey, lang: string = 'fr'): string {
  const normalizedLang = lang.toLowerCase().substring(0, 2) as 'fr' | 'en' | 'es'
  const message = API_MESSAGES[key]
  
  if (!message) {
    console.warn(`Message key '${key}' not found`)
    return key
  }
  
  return message[normalizedLang] || message.fr
}

/**
 * Extrait la langue depuis les headers HTTP Accept-Language
 * @param request - Request object avec headers
 * @returns Langue détectée (fr par défaut)
 */
export function detectLanguage(request: { headers: { get: (name: string) => string | null } }): string {
  const acceptLanguage = request.headers.get('accept-language') || 'fr'
  return acceptLanguage.split(',')[0] || 'fr'
}

/**
 * Crée un objet de réponse avec message traduit
 * @param success - Statut de succès
 * @param messageKey - Clé du message à traduire
 * @param lang - Langue
 * @param data - Données optionnelles
 * @returns Objet de réponse
 */
export function createResponse<T = null>(
  success: boolean,
  messageKey: MessageKey,
  lang?: string,
  data?: T
) {
  return {
    success,
    message: getMessage(messageKey, lang),
    ...(data && { data })
  }
}

/**
 * Crée une réponse d'erreur traduite
 * @param messageKey - Clé du message d'erreur
 * @param lang - Langue
 * @param status - Code de statut HTTP
 * @returns Objet de réponse d'erreur
 */
export function createErrorResponse(
  messageKey: MessageKey,
  lang?: string,
  status: number = 500
) {
  return {
    response: createResponse(false, messageKey, lang),
    status
  }
}
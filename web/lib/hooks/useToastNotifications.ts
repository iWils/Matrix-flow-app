import { useToast } from '@/components/ui/Toast'
import { useTranslation } from 'react-i18next'

// Hook personnalisé pour les notifications toast avec traductions
export function useToastNotifications() {
  const { success, error, warning, info } = useToast()
  const { t } = useTranslation(['common'])

  return {
    // Notifications de succès
    showSuccess: (message: string) => success(t('common:success'), message),
    showSaveSuccess: () => success(t('common:success'), 'Sauvegardé avec succès'),
    showDeleteSuccess: () => success(t('common:success'), 'Supprimé avec succès'),
    showCreateSuccess: () => success(t('common:success'), 'Créé avec succès'),
    
    // Notifications d'erreur
    showError: (message: string) => error(t('common:error'), message),
    showSaveError: () => error(t('common:error'), t('common:errorSaving')),
    showDeleteError: () => error(t('common:error'), 'Erreur lors de la suppression'),
    showLoadError: () => error(t('common:error'), 'Erreur lors du chargement'),
    
    // Notifications d'avertissement
    showWarning: (message: string) => warning('Attention', message),
    showPermissionWarning: () => warning('Attention', 'Permissions insuffisantes'),
    
    // Notifications d'information
    showInfo: (message: string) => info('Information', message),
    showLoadingInfo: () => info('Information', 'Chargement en cours...'),
    
    // Actions directes
    success,
    error, 
    warning,
    info
  }
}
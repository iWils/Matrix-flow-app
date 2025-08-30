import { useCallback } from 'react'
import { emailService } from '@/lib/email-notifications'

export interface NotificationTriggers {
  onChangeRequestCreated: (data: {
    matrixName: string
    requesterName: string
    actionType: string
    changes?: string
    changeRequestId: number
    ipAddress?: string
  }) => Promise<void>
  
  onChangeApproved: (data: {
    matrixName: string
    actionType: string
    approverName: string
    matrixId: number
    recipientEmail: string
  }) => Promise<void>
  
  onChangeRejected: (data: {
    matrixName: string
    actionType: string
    approverName: string
    reason?: string
    matrixId: number
    recipientEmail: string
  }) => Promise<void>
  
  onSecurityEvent: (data: {
    alertType: string
    userName: string
    actionType: string
    ipAddress: string
  }) => Promise<void>
}

export function useNotificationTriggers(): NotificationTriggers {
  const onChangeRequestCreated = useCallback(async (data: Parameters<NotificationTriggers['onChangeRequestCreated']>[0]) => {
    try {
      const success = await emailService.sendChangeApprovalRequest(data)
      if (!success) {
        console.warn('Failed to send change approval notification')
      }
    } catch (error) {
      console.error('Error sending change approval notification:', error)
    }
  }, [])

  const onChangeApproved = useCallback(async (data: Parameters<NotificationTriggers['onChangeApproved']>[0]) => {
    try {
      const success = await emailService.sendChangeNotification(data)
      if (!success) {
        console.warn('Failed to send change notification')
      }
    } catch (error) {
      console.error('Error sending change notification:', error)
    }
  }, [])

  const onChangeRejected = useCallback(async (data: Parameters<NotificationTriggers['onChangeRejected']>[0]) => {
    try {
      const success = await emailService.sendChangeRejection(data)
      if (!success) {
        console.warn('Failed to send change rejection notification')
      }
    } catch (error) {
      console.error('Error sending change rejection notification:', error)
    }
  }, [])

  const onSecurityEvent = useCallback(async (data: Parameters<NotificationTriggers['onSecurityEvent']>[0]) => {
    try {
      const success = await emailService.sendSecurityAlert(data)
      if (!success) {
        console.warn('Failed to send security alert')
      }
    } catch (error) {
      console.error('Error sending security alert:', error)
    }
  }, [])

  return {
    onChangeRequestCreated,
    onChangeApproved,
    onChangeRejected,
    onSecurityEvent
  }
}

// Hook utilitaire pour déclencher des notifications depuis les composants
export function useNotificationHelpers() {
  const triggers = useNotificationTriggers()
  
  return {
    // Notification pour création de matrice
    notifyMatrixCreated: useCallback(async (matrixName: string, userName: string) => {
      await triggers.onSecurityEvent({
        alertType: 'Nouvelle matrice créée',
        userName,
        actionType: 'create_matrix',
        ipAddress: 'unknown' // TODO: Get real IP from request
      })
    }, [triggers]),

    // Notification pour tentative d'accès non autorisé
    notifyUnauthorizedAccess: useCallback(async (userName: string, resource: string, ipAddress: string) => {
      await triggers.onSecurityEvent({
        alertType: 'Accès non autorisé',
        userName,
        actionType: `unauthorized_access_${resource}`,
        ipAddress
      })
    }, [triggers]),

    // Notification pour modification massive
    notifyBulkOperation: useCallback(async (matrixName: string, userName: string, count: number, ipAddress: string) => {
      await triggers.onSecurityEvent({
        alertType: `Modification en lot (${count} éléments)`,
        userName,
        actionType: 'bulk_operation',
        ipAddress
      })
    }, [triggers]),

    ...triggers
  }
}
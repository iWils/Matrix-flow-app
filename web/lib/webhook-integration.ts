import { advancedWebhookService } from './advanced-webhooks'
import { auditLog } from './audit'

/**
 * Integration layer for Matrix Flow events with advanced webhooks
 */
export class WebhookIntegration {

  /**
   * Send webhook when matrix is created
   */
  static async onMatrixCreated(data: {
    matrixId: number
    matrixName: string
    userId: number
    userEmail: string
  }): Promise<void> {
    await advancedWebhookService.broadcastWebhook('matrix_created', {
      matrix: {
        id: data.matrixId,
        name: data.matrixName,
        createdBy: {
          id: data.userId,
          email: data.userEmail
        }
      },
      timestamp: new Date().toISOString()
    }, {
      sourceUserId: data.userId
    })
  }

  /**
   * Send webhook when matrix is updated
   */
  static async onMatrixUpdated(data: {
    matrixId: number
    matrixName: string
    changes: Record<string, any>
    userId: number
    userEmail: string
  }): Promise<void> {
    await advancedWebhookService.broadcastWebhook('matrix_updated', {
      matrix: {
        id: data.matrixId,
        name: data.matrixName,
        changes: data.changes,
        updatedBy: {
          id: data.userId,
          email: data.userEmail
        }
      },
      timestamp: new Date().toISOString()
    }, {
      sourceUserId: data.userId
    })
  }

  /**
   * Send webhook when matrix is deleted
   */
  static async onMatrixDeleted(data: {
    matrixId: number
    matrixName: string
    userId: number
    userEmail: string
  }): Promise<void> {
    await advancedWebhookService.broadcastWebhook('matrix_deleted', {
      matrix: {
        id: data.matrixId,
        name: data.matrixName,
        deletedBy: {
          id: data.userId,
          email: data.userEmail
        }
      },
      timestamp: new Date().toISOString()
    }, {
      sourceUserId: data.userId
    })
  }

  /**
   * Send webhook when flow entry is added
   */
  static async onFlowEntryAdded(data: {
    matrixId: number
    matrixName: string
    entry: {
      id: number
      sourceIp: string
      destIp: string
      port: number
      protocol: string
      action: string
      description?: string
    }
    userId: number
    userEmail: string
  }): Promise<void> {
    await advancedWebhookService.broadcastWebhook('flow_entry_added', {
      matrix: {
        id: data.matrixId,
        name: data.matrixName
      },
      entry: data.entry,
      addedBy: {
        id: data.userId,
        email: data.userEmail
      },
      timestamp: new Date().toISOString()
    }, {
      sourceUserId: data.userId
    })
  }

  /**
   * Send webhook when flow entry is updated
   */
  static async onFlowEntryUpdated(data: {
    matrixId: number
    matrixName: string
    entry: {
      id: number
      sourceIp: string
      destIp: string
      port: number
      protocol: string
      action: string
      description?: string
    }
    changes: Record<string, any>
    userId: number
    userEmail: string
  }): Promise<void> {
    await advancedWebhookService.broadcastWebhook('flow_entry_updated', {
      matrix: {
        id: data.matrixId,
        name: data.matrixName
      },
      entry: data.entry,
      changes: data.changes,
      updatedBy: {
        id: data.userId,
        email: data.userEmail
      },
      timestamp: new Date().toISOString()
    }, {
      sourceUserId: data.userId
    })
  }

  /**
   * Send webhook when flow entry is deleted
   */
  static async onFlowEntryDeleted(data: {
    matrixId: number
    matrixName: string
    entryId: number
    entryData: Record<string, any>
    userId: number
    userEmail: string
  }): Promise<void> {
    await advancedWebhookService.broadcastWebhook('flow_entry_deleted', {
      matrix: {
        id: data.matrixId,
        name: data.matrixName
      },
      entry: {
        id: data.entryId,
        ...data.entryData
      },
      deletedBy: {
        id: data.userId,
        email: data.userEmail
      },
      timestamp: new Date().toISOString()
    }, {
      sourceUserId: data.userId
    })
  }

  /**
   * Send webhook when change request is created
   */
  static async onChangeRequestCreated(data: {
    requestId: number
    requestType: string
    matrixId: number
    matrixName: string
    description?: string
    requestedBy: {
      id: number
      email: string
      name?: string
    }
    changes: Record<string, any>
  }): Promise<void> {
    await advancedWebhookService.broadcastWebhook('change_request_created', {
      changeRequest: {
        id: data.requestId,
        type: data.requestType,
        description: data.description,
        changes: data.changes,
        status: 'pending'
      },
      matrix: {
        id: data.matrixId,
        name: data.matrixName
      },
      requestedBy: data.requestedBy,
      timestamp: new Date().toISOString()
    }, {
      sourceUserId: data.requestedBy.id
    })
  }

  /**
   * Send webhook when change request is approved
   */
  static async onChangeRequestApproved(data: {
    requestId: number
    requestType: string
    matrixId: number
    matrixName: string
    requestedBy: {
      id: number
      email: string
      name?: string
    }
    approvedBy: {
      id: number
      email: string
      name?: string
    }
    changes: Record<string, any>
  }): Promise<void> {
    await advancedWebhookService.broadcastWebhook('change_request_approved', {
      changeRequest: {
        id: data.requestId,
        type: data.requestType,
        changes: data.changes,
        status: 'approved'
      },
      matrix: {
        id: data.matrixId,
        name: data.matrixName
      },
      requestedBy: data.requestedBy,
      approvedBy: data.approvedBy,
      timestamp: new Date().toISOString()
    }, {
      sourceUserId: data.approvedBy.id
    })
  }

  /**
   * Send webhook when change request is rejected
   */
  static async onChangeRequestRejected(data: {
    requestId: number
    requestType: string
    matrixId: number
    matrixName: string
    reason?: string
    requestedBy: {
      id: number
      email: string
      name?: string
    }
    rejectedBy: {
      id: number
      email: string
      name?: string
    }
    changes: Record<string, any>
  }): Promise<void> {
    await advancedWebhookService.broadcastWebhook('change_request_rejected', {
      changeRequest: {
        id: data.requestId,
        type: data.requestType,
        changes: data.changes,
        status: 'rejected',
        reason: data.reason
      },
      matrix: {
        id: data.matrixId,
        name: data.matrixName
      },
      requestedBy: data.requestedBy,
      rejectedBy: data.rejectedBy,
      timestamp: new Date().toISOString()
    }, {
      sourceUserId: data.rejectedBy.id
    })
  }

  /**
   * Send webhook for security alerts
   */
  static async onSecurityAlert(data: {
    alertType: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    details: Record<string, any>
    userId?: number
    ipAddress?: string
  }): Promise<void> {
    await advancedWebhookService.broadcastWebhook('security_alert', {
      alert: {
        type: data.alertType,
        severity: data.severity,
        message: data.message,
        details: data.details
      },
      source: {
        userId: data.userId,
        ipAddress: data.ipAddress
      },
      timestamp: new Date().toISOString()
    })

    // Also log to audit for security events
    if (data.userId) {
      await auditLog({
        userId: data.userId,
        entity: 'security_alert',
        entityId: 0,
        action: 'create',
        changes: {
          alertType: data.alertType,
          severity: data.severity,
          message: data.message,
          webhook_sent: true
        }
      })
    }
  }

  /**
   * Send webhook for system alerts
   */
  static async onSystemAlert(data: {
    alertType: string
    severity: 'info' | 'warning' | 'error' | 'critical'
    message: string
    details: Record<string, any>
    component?: string
  }): Promise<void> {
    await advancedWebhookService.broadcastWebhook('system_alert', {
      alert: {
        type: data.alertType,
        severity: data.severity,
        message: data.message,
        details: data.details,
        component: data.component
      },
      system: {
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Send webhook for user authentication events
   */
  static async onUserLogin(data: {
    userId: number
    userEmail: string
    userName?: string
    ipAddress?: string
    userAgent?: string
    method: 'password' | '2fa' | 'external'
  }): Promise<void> {
    await advancedWebhookService.broadcastWebhook('user_login', {
      user: {
        id: data.userId,
        email: data.userEmail,
        name: data.userName
      },
      login: {
        method: data.method,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        timestamp: new Date().toISOString()
      }
    }, {
      sourceUserId: data.userId
    })
  }

  /**
   * Send webhook for user logout events
   */
  static async onUserLogout(data: {
    userId: number
    userEmail: string
    userName?: string
    sessionDuration?: number
    ipAddress?: string
  }): Promise<void> {
    await advancedWebhookService.broadcastWebhook('user_logout', {
      user: {
        id: data.userId,
        email: data.userEmail,
        name: data.userName
      },
      logout: {
        sessionDuration: data.sessionDuration,
        ipAddress: data.ipAddress,
        timestamp: new Date().toISOString()
      }
    }, {
      sourceUserId: data.userId
    })
  }

  /**
   * Test webhook integration
   */
  static async sendTestWebhook(userId: number): Promise<void> {
    await advancedWebhookService.broadcastWebhook('test_event', {
      test: true,
      message: 'Ceci est un test du système de webhooks avancés Matrix Flow',
      features: {
        retryMechanism: true,
        circuitBreaker: true,
        payloadTransformation: true,
        customHeaders: true,
        monitoring: true
      },
      timestamp: new Date().toISOString()
    }, {
      sourceUserId: userId
    })
  }
}

// Export convenience functions
export const webhookIntegration = {
  onMatrixCreated: WebhookIntegration.onMatrixCreated,
  onMatrixUpdated: WebhookIntegration.onMatrixUpdated,
  onMatrixDeleted: WebhookIntegration.onMatrixDeleted,
  onFlowEntryAdded: WebhookIntegration.onFlowEntryAdded,
  onFlowEntryUpdated: WebhookIntegration.onFlowEntryUpdated,
  onFlowEntryDeleted: WebhookIntegration.onFlowEntryDeleted,
  onChangeRequestCreated: WebhookIntegration.onChangeRequestCreated,
  onChangeRequestApproved: WebhookIntegration.onChangeRequestApproved,
  onChangeRequestRejected: WebhookIntegration.onChangeRequestRejected,
  onSecurityAlert: WebhookIntegration.onSecurityAlert,
  onSystemAlert: WebhookIntegration.onSystemAlert,
  onUserLogin: WebhookIntegration.onUserLogin,
  onUserLogout: WebhookIntegration.onUserLogout,
  sendTest: WebhookIntegration.sendTestWebhook
}
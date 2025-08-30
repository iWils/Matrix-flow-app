import nodemailer from 'nodemailer'
import { logger } from './logger'
import { prisma } from './db'
import { EMAIL_TEMPLATES, EmailTemplateType, EmailTemplateData, renderTemplate } from './email-templates'

interface EmailSettings {
  enabled: boolean
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  smtpPassword: string
  fromEmail: string
  fromName: string
  adminEmails: string[]
  enableLogging?: boolean
}

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

interface NotificationEmailData {
  to: string | string[]
  subject: string
  templateId: string
  variables: Record<string, unknown>
  priority?: 'low' | 'normal' | 'high' | 'critical'
}

class EmailNotificationService {
  private transporter: nodemailer.Transporter | null = null
  private settings: EmailSettings | null = null
  private templates: Map<string, EmailTemplate> = new Map()

  async initialize(): Promise<void> {
    try {
      this.settings = await this.loadEmailSettings()
      if (this.settings?.enabled) {
        this.transporter = await this.createTransporter()
        await this.loadEmailTemplates()
        logger.info('Email notification service initialized')
      } else {
        logger.info('Email notifications disabled')
      }
    } catch (error) {
      logger.error('Failed to initialize email service', error as Error)
    }
  }

  private async loadEmailSettings(): Promise<EmailSettings | null> {
    try {
      // Try to load from database first
      const settings = await prisma.systemSetting.findMany({
        where: {
          key: {
            in: [
              'email_enabled',
              'smtp_host',
              'smtp_port', 
              'smtp_secure',
              'smtp_user',
              'smtp_password',
              'from_email',
              'from_name',
              'admin_emails'
            ]
          }
        }
      })

      if (settings.length === 0) {
        // Fallback to environment variables
        return this.loadFromEnvironment()
      }

      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = String(setting.value || '')
        return acc
      }, {} as Record<string, string>)

      return {
        enabled: settingsMap.email_enabled === 'true',
        smtpHost: settingsMap.smtp_host || '',
        smtpPort: parseInt(settingsMap.smtp_port) || 587,
        smtpSecure: settingsMap.smtp_secure === 'true',
        smtpUser: settingsMap.smtp_user || '',
        smtpPassword: settingsMap.smtp_password || '',
        fromEmail: settingsMap.from_email || '',
        fromName: settingsMap.from_name || 'Matrix Flow',
        adminEmails: settingsMap.admin_emails ? settingsMap.admin_emails.split(',') : []
      }
    } catch {
      logger.warn('Failed to load email settings from database, using environment')
      return this.loadFromEnvironment()
    }
  }

  private loadFromEnvironment(): EmailSettings {
    return {
      enabled: process.env.EMAIL_ENABLED === 'true',
      smtpHost: process.env.SMTP_HOST || '',
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      smtpSecure: process.env.SMTP_SECURE === 'true',
      smtpUser: process.env.SMTP_USER || '',
      smtpPassword: process.env.SMTP_PASSWORD || '',
      fromEmail: process.env.FROM_EMAIL || '',
      fromName: process.env.FROM_NAME || 'Matrix Flow',
      adminEmails: process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : []
    }
  }

  private async createTransporter(): Promise<nodemailer.Transporter> {
    if (!this.settings) {
      throw new Error('Email settings not loaded')
    }

    const transporter = nodemailer.createTransport({
      host: this.settings.smtpHost,
      port: this.settings.smtpPort,
      secure: this.settings.smtpSecure,
      auth: {
        user: this.settings.smtpUser,
        pass: this.settings.smtpPassword
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateLimit: 14, // emails per second
    })

    // Verify connection
    await transporter.verify()
    
    return transporter
  }

  private async loadEmailTemplates(): Promise<void> {
    try {
      const templates = await prisma.emailTemplate.findMany({
        where: { isActive: true }
      })

      templates.forEach(template => {
        this.templates.set(template.name, {
          subject: template.subject,
          html: template.htmlContent || '',
          text: template.textContent || ''
        })
      })

      // Default templates if none in database
      if (this.templates.size === 0) {
        this.loadDefaultTemplates()
      }

      logger.info(`Loaded ${this.templates.size} email templates`)
    } catch {
      logger.warn('Failed to load templates from database, using defaults')
      this.loadDefaultTemplates()
    }
  }

  private loadDefaultTemplates(): void {
    // Critical system alert template
    this.templates.set('critical_alert', {
      subject: '[CRITICAL] {{title}} - Matrix Flow',
      html: `
        <h2 style="color: #dc3545;">🚨 Critical Alert</h2>
        <p><strong>{{title}}</strong></p>
        <p>{{message}}</p>
        {{#if details}}
        <h3>Details:</h3>
        <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px;">{{details}}</pre>
        {{/if}}
        <hr>
        <p><small>Matrix Flow System - {{timestamp}}</small></p>
      `,
      text: `CRITICAL ALERT: {{title}}\n\n{{message}}\n\nDetails:\n{{details}}\n\nMatrix Flow System - {{timestamp}}`
    })

    // Backup notification template
    this.templates.set('backup_notification', {
      subject: '{{#if success}}✅ Backup Successful{{else}}❌ Backup Failed{{/if}} - Matrix Flow',
      html: `
        <h2 style="color: {{#if success}}#28a745{{else}}#dc3545{{/if}};">
          {{#if success}}✅ Backup Completed{{else}}❌ Backup Failed{{/if}}
        </h2>
        <p>{{message}}</p>
        {{#if backupPath}}
        <p><strong>Backup Path:</strong> {{backupPath}}</p>
        {{/if}}
        {{#if size}}
        <p><strong>Size:</strong> {{size}}</p>
        {{/if}}
        {{#if duration}}
        <p><strong>Duration:</strong> {{duration}}ms</p>
        {{/if}}
        {{#if error}}
        <div style="background: #f8d7da; padding: 10px; border-radius: 4px; color: #721c24;">
          <strong>Error:</strong> {{error}}
        </div>
        {{/if}}
      `,
      text: `Backup {{#if success}}Successful{{else}}Failed{{/if}}: {{message}}`
    })

    // Security alert template  
    this.templates.set('security_alert', {
      subject: '🔒 Security Alert - Matrix Flow',
      html: `
        <h2 style="color: #fd7e14;">🔒 Security Alert</h2>
        <p><strong>Event:</strong> {{event}}</p>
        <p><strong>User:</strong> {{user}}</p>
        <p><strong>IP Address:</strong> {{ip}}</p>
        <p><strong>Time:</strong> {{timestamp}}</p>
        {{#if details}}
        <h3>Additional Details:</h3>
        <pre style="background: #f8f9fa; padding: 10px;">{{details}}</pre>
        {{/if}}
      `,
      text: `Security Alert: {{event}}\nUser: {{user}}\nIP: {{ip}}\nTime: {{timestamp}}`
    })

    // 2FA setup notification
    this.templates.set('2fa_enabled', {
      subject: '🔐 Two-Factor Authentication Enabled - Matrix Flow',
      html: `
        <h2 style="color: #28a745;">🔐 2FA Successfully Enabled</h2>
        <p>Two-factor authentication has been enabled for your Matrix Flow account.</p>
        <p><strong>User:</strong> {{username}}</p>
        <p><strong>Time:</strong> {{timestamp}}</p>
        <div style="background: #d4edda; padding: 10px; border-radius: 4px; color: #155724;">
          <strong>Security Tip:</strong> Make sure to save your recovery codes in a safe place.
        </div>
      `,
      text: `2FA enabled for your Matrix Flow account ({{username}}) at {{timestamp}}`
    })
  }

  async sendNotification(data: NotificationEmailData): Promise<boolean> {
    if (!this.transporter || !this.settings?.enabled) {
      logger.info('Email notifications disabled, skipping send')
      return false
    }

    try {
      const template = this.templates.get(data.templateId)
      if (!template) {
        logger.error(`Email template not found: ${data.templateId}`)
        return false
      }

      const subject = this.renderTemplate(template.subject, data.variables)
      const html = this.renderTemplate(template.html, data.variables)
      const text = this.renderTemplate(template.text, data.variables)

      const recipients = Array.isArray(data.to) ? data.to : [data.to]

      const mailOptions = {
        from: `${this.settings.fromName} <${this.settings.fromEmail}>`,
        to: recipients.join(', '),
        subject,
        html,
        text,
        priority: this.getPriority(data.priority || 'normal')
      }

      const info = await this.transporter.sendMail(mailOptions)
      
      logger.info('Email notification sent', {
        messageId: info.messageId,
        recipients: recipients.length,
        template: data.templateId,
        priority: data.priority
      })

      return true
    } catch (error) {
      logger.error('Failed to send email notification', error as Error, {
        template: data.templateId,
        recipients: Array.isArray(data.to) ? data.to.length : 1
      })
      return false
    }
  }

  private renderTemplate(template: string, variables: Record<string, unknown>): string {
    // Simple template rendering (could be enhanced with handlebars)
    let rendered = template
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      rendered = rendered.replace(regex, String(value))
    })

    // Handle conditional blocks (basic implementation)
    rendered = rendered.replace(/\{\{#if (\w+)\}\}(.*?)\{\{\/if\}\}/gs, (match, condition, content) => {
      return variables[condition] ? content : ''
    })

    rendered = rendered.replace(/\{\{#unless (\w+)\}\}(.*?)\{\{\/unless\}\}/gs, (match, condition, content) => {
      return !variables[condition] ? content : ''
    })

    return rendered
  }

  private getPriority(priority: string): 'high' | 'normal' | 'low' {
    switch (priority) {
      case 'critical':
      case 'high':
        return 'high'
      case 'low':
        return 'low'
      default:
        return 'normal'
    }
  }

  async sendEmail(options: {
    to: string | string[]
    subject: string
    html: string
    text?: string
  }): Promise<boolean> {
    if (!this.transporter || !this.settings?.enabled) {
      logger.info('Email service disabled, skipping send')
      return false
    }

    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to]
      let allSent = true

      for (const recipient of recipients) {
        const mailOptions = {
          from: this.settings.fromEmail,
          to: recipient,
          subject: options.subject,
          html: options.html,
          text: options.text || options.html.replace(/<[^>]*>/g, '')
        }

        await this.transporter.sendMail(mailOptions)
        logger.info(`Email sent successfully to ${recipient}: ${options.subject}`)

        // Log to database
        if (this.settings.enableLogging) {
          await prisma.emailLog.create({
            data: {
              recipient,
              subject: options.subject,
              templateType: 'custom',
              status: 'sent',
              sentAt: new Date()
            }
          }).catch((err: Error) => {
            logger.error('Failed to log email:', err)
          })
        }
      }

      return allSent
    } catch (error) {
      logger.error('Failed to send email:', error instanceof Error ? error : new Error(String(error)))
      return false
    }
  }

  // Convenience methods for common notifications
  async sendCriticalAlert(title: string, message: string, details?: Record<string, unknown>): Promise<boolean> {
    if (!this.settings?.adminEmails.length) {
      logger.warn('No admin emails configured for critical alerts')
      return false
    }

    return this.sendNotification({
      to: this.settings.adminEmails,
      subject: `[CRITICAL] ${title}`,
      templateId: 'critical_alert',
      priority: 'critical',
      variables: {
        title,
        message,
        details: details ? JSON.stringify(details, null, 2) : '',
        timestamp: new Date().toISOString()
      }
    })
  }

  async sendBackupNotification(success: boolean, data: {
    message: string
    backupPath?: string
    size?: string
    duration?: number
    error?: string
  }): Promise<boolean> {
    if (!this.settings?.adminEmails.length) return false

    return this.sendNotification({
      to: this.settings.adminEmails,
      subject: `Backup ${success ? 'Success' : 'Failure'}`,
      templateId: 'backup_notification',
      priority: success ? 'normal' : 'high',
      variables: {
        success,
        ...data,
        timestamp: new Date().toISOString()
      }
    })
  }


  async send2FAEnabledNotification(userEmail: string, username: string): Promise<boolean> {
    if (!userEmail) return false

    return this.sendNotification({
      to: userEmail,
      subject: '2FA Enabled',
      templateId: '2fa_enabled',
      priority: 'normal',
      variables: {
        username,
        timestamp: new Date().toISOString()
      }
    })
  }

  // Test email functionality
  async sendTestEmail(to: string): Promise<boolean> {
    return this.sendNotification({
      to,
      subject: 'Test Email - Matrix Flow',
      templateId: 'critical_alert', // Reuse template
      priority: 'low',
      variables: {
        title: 'Test Email',
        message: 'This is a test email to verify SMTP configuration.',
        details: 'Email service is working correctly.',
        timestamp: new Date().toISOString()
      }
    })
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    if (!this.transporter || !this.settings?.enabled) {
      return false
    }

    try {
      await this.transporter.verify()
      return true
    } catch {
      return false
    }
  }

  async getStats(): Promise<{
    enabled: boolean
    healthy: boolean
    templatesLoaded: number
    adminEmails: number
  }> {
    return {
      enabled: this.settings?.enabled || false,
      healthy: await this.isHealthy(),
      templatesLoaded: this.templates.size,
      adminEmails: this.settings?.adminEmails.length || 0
    }
  }

  // Nouvelles méthodes Phase 3 pour les notifications avancées
  async sendChangeApprovalRequest(data: {
    matrixName: string
    requesterName: string
    actionType: string
    changes?: string
    changeRequestId: number
    ipAddress?: string
  }): Promise<boolean> {
    if (!this.settings?.enabled || !this.settings.adminEmails.length) {
      return false
    }

    const templateData: EmailTemplateData = {
      ...data,
      url: `${process.env.NEXTAUTH_URL}/admin/workflow/${data.changeRequestId}`,
      timestamp: new Date().toLocaleString('fr-FR')
    }

    const template = EMAIL_TEMPLATES.CHANGE_APPROVAL
    const subject = renderTemplate(template.subject, templateData)
    const html = renderTemplate(template.html, templateData)
    const text = renderTemplate(template.text, templateData)

    let allSent = true
    for (const adminEmail of this.settings.adminEmails) {
      const sent = await this.sendEmail({
        to: adminEmail,
        subject,
        html,
        text
      })
      if (!sent) allSent = false
    }

    return allSent
  }

  async sendChangeNotification(data: {
    matrixName: string
    actionType: string
    approverName: string
    matrixId: number
    recipientEmail: string
  }): Promise<boolean> {
    const templateData: EmailTemplateData = {
      ...data,
      url: `${process.env.NEXTAUTH_URL}/matrices/${data.matrixId}`,
      timestamp: new Date().toLocaleString('fr-FR')
    }

    const template = EMAIL_TEMPLATES.CHANGE_NOTIFICATION
    const subject = renderTemplate(template.subject, templateData)
    const html = renderTemplate(template.html, templateData)
    const text = renderTemplate(template.text, templateData)

    return await this.sendEmail({
      to: data.recipientEmail,
      subject,
      html,
      text
    })
  }

  async sendChangeRejection(data: {
    matrixName: string
    actionType: string
    approverName: string
    reason?: string
    matrixId: number
    recipientEmail: string
  }): Promise<boolean> {
    const templateData: EmailTemplateData = {
      ...data,
      url: `${process.env.NEXTAUTH_URL}/matrices/${data.matrixId}`,
      timestamp: new Date().toLocaleString('fr-FR')
    }

    const template = EMAIL_TEMPLATES.CHANGE_REJECTION
    const subject = renderTemplate(template.subject, templateData)
    const html = renderTemplate(template.html, templateData)
    const text = renderTemplate(template.text, templateData)

    return await this.sendEmail({
      to: data.recipientEmail,
      subject,
      html,
      text
    })
  }

  async sendSecurityAlert(data: {
    alertType: string
    userName: string
    actionType: string
    ipAddress: string
  }): Promise<boolean> {
    if (!this.settings?.enabled || !this.settings.adminEmails.length) {
      return false
    }

    const templateData: EmailTemplateData = {
      ...data,
      url: `${process.env.NEXTAUTH_URL}/admin/audit`,
      timestamp: new Date().toLocaleString('fr-FR')
    }

    const template = EMAIL_TEMPLATES.SECURITY_ALERT
    const subject = renderTemplate(template.subject, templateData)
    const html = renderTemplate(template.html, templateData)
    const text = renderTemplate(template.text, templateData)

    let allSent = true
    for (const adminEmail of this.settings.adminEmails) {
      const sent = await this.sendEmail({
        to: adminEmail,
        subject,
        html,
        text
      })
      if (!sent) allSent = false
    }

    return allSent
  }

  async sendDailyDigest(data: {
    date: string
    totalChanges: number
    pendingApprovals: number
    recentChanges: Array<{
      matrixName: string
      actionType: string
      userName: string
      timestamp: string
    }>
    recipientEmail: string
  }): Promise<boolean> {
    const templateData: EmailTemplateData = {
      date: data.date,
      totalChanges: String(data.totalChanges),
      pendingApprovals: String(data.pendingApprovals),
      recentChanges: data.recentChanges,
      url: `${process.env.NEXTAUTH_URL}/dashboard`,
      unsubscribeUrl: `${process.env.NEXTAUTH_URL}/profile/notifications`
    }

    const template = EMAIL_TEMPLATES.DAILY_DIGEST
    const subject = renderTemplate(template.subject, templateData)
    const html = renderTemplate(template.html, templateData)
    const text = renderTemplate(template.text, templateData)

    return await this.sendEmail({
      to: data.recipientEmail,
      subject,
      html,
      text
    })
  }

  // Méthode pour obtenir le statut du service
  private static instance: EmailNotificationService | null = null

  static getInstance(): EmailNotificationService {
    if (!EmailNotificationService.instance) {
      EmailNotificationService.instance = new EmailNotificationService()
    }
    return EmailNotificationService.instance
  }

  static async getStatus(): Promise<{
    enabled: boolean
    configured: boolean
    lastTest?: Date
    error?: string
  }> {
    try {
      const instance = EmailNotificationService.getInstance()
      await instance.initialize()
      
      return {
        enabled: instance.settings?.enabled || false,
        configured: !!instance.settings?.smtpHost,
        lastTest: new Date()
      }
    } catch (error) {
      return {
        enabled: false,
        configured: false,
        error: error instanceof Error ? error.message : 'Configuration error'
      }
    }
  }
}

// Global service instance - use singleton
export const emailService = EmailNotificationService.getInstance()

// Export the class for named imports
export { EmailNotificationService }

// Initialize on import seulement si pas dans l'edge runtime
if (typeof window === 'undefined' && !process.env.NEXT_RUNTIME) {
  emailService.initialize().catch(err => {
    console.warn('Email service initialization failed:', err)
  })
}

export default emailService
// Templates email internationalisés pour Matrix Flow
import type { EmailTemplateData } from './email-templates'

export interface I18nEmailTemplate {
  subject: {
    fr: string
    en: string
    es: string
  }
  html: {
    fr: string
    en: string
    es: string
  }
  text: {
    fr: string
    en: string
    es: string
  }
}

// Template pour demande d'approbation multilingue
export const CHANGE_APPROVAL_I18N: I18nEmailTemplate = {
  subject: {
    fr: '🔔 Matrix Flow - Approbation requise: {{matrixName}}',
    en: '🔔 Matrix Flow - Approval required: {{matrixName}}',
    es: '🔔 Matrix Flow - Aprobación requerida: {{matrixName}}'
  },
  html: {
    fr: `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Approbation requise - Matrix Flow</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <table style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Matrix Flow</h1>
                <p style="color: #64748b; margin: 5px 0 0 0;">Système de gestion des flux réseau</p>
              </div>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
                <h2 style="color: #92400e; margin: 0 0 10px 0; font-size: 20px;">⚠️ Approbation requise</h2>
                <p style="color: #92400e; margin: 0;">Une modification nécessite votre validation</p>
              </div>

              <div style="margin-bottom: 25px;">
                <h3 style="color: #374151; margin: 0 0 15px 0;">Détails de la modification</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280; width: 120px;">Matrice:</td>
                    <td style="padding: 8px 0; color: #374151;">{{matrixName}}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Demandeur:</td>
                    <td style="padding: 8px 0; color: #374151;">{{requesterName}}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Type:</td>
                    <td style="padding: 8px 0; color: #374151;">{{actionType}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Date:</td>
                    <td style="padding: 8px 0; color: #374151;">{{timestamp}}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="{{url}}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; margin: 0 10px;">
                  ✅ Approuver
                </a>
                <a href="{{url}}" style="background-color: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; margin: 0 10px;">
                  ❌ Rejeter
                </a>
              </div>

              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #6b7280;">
                <p>Vous recevez cet email car vous êtes administrateur du système Matrix Flow.</p>
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    en: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Approval Required - Matrix Flow</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <table style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Matrix Flow</h1>
                <p style="color: #64748b; margin: 5px 0 0 0;">Network flow management system</p>
              </div>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
                <h2 style="color: #92400e; margin: 0 0 10px 0; font-size: 20px;">⚠️ Approval Required</h2>
                <p style="color: #92400e; margin: 0;">A modification requires your validation</p>
              </div>

              <div style="margin-bottom: 25px;">
                <h3 style="color: #374151; margin: 0 0 15px 0;">Modification Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280; width: 120px;">Matrix:</td>
                    <td style="padding: 8px 0; color: #374151;">{{matrixName}}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Requester:</td>
                    <td style="padding: 8px 0; color: #374151;">{{requesterName}}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Type:</td>
                    <td style="padding: 8px 0; color: #374151;">{{actionType}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Date:</td>
                    <td style="padding: 8px 0; color: #374151;">{{timestamp}}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="{{url}}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; margin: 0 10px;">
                  ✅ Approve
                </a>
                <a href="{{url}}" style="background-color: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; margin: 0 10px;">
                  ❌ Reject
                </a>
              </div>

              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #6b7280;">
                <p>You receive this email because you are a Matrix Flow system administrator.</p>
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    es: `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Aprobación Requerida - Matrix Flow</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <table style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Matrix Flow</h1>
                <p style="color: #64748b; margin: 5px 0 0 0;">Sistema de gestión de flujos de red</p>
              </div>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
                <h2 style="color: #92400e; margin: 0 0 10px 0; font-size: 20px;">⚠️ Aprobación Requerida</h2>
                <p style="color: #92400e; margin: 0;">Una modificación requiere su validación</p>
              </div>

              <div style="margin-bottom: 25px;">
                <h3 style="color: #374151; margin: 0 0 15px 0;">Detalles de la Modificación</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280; width: 120px;">Matriz:</td>
                    <td style="padding: 8px 0; color: #374151;">{{matrixName}}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Solicitante:</td>
                    <td style="padding: 8px 0; color: #374151;">{{requesterName}}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Tipo:</td>
                    <td style="padding: 8px 0; color: #374151;">{{actionType}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Fecha:</td>
                    <td style="padding: 8px 0; color: #374151;">{{timestamp}}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="{{url}}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; margin: 0 10px;">
                  ✅ Aprobar
                </a>
                <a href="{{url}}" style="background-color: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; margin: 0 10px;">
                  ❌ Rechazar
                </a>
              </div>

              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #6b7280;">
                <p>Recibe este email porque es administrador del sistema Matrix Flow.</p>
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  },
  text: {
    fr: `Matrix Flow - Approbation requise\n\nUne modification de la matrice "{{matrixName}}" nécessite votre validation.\n\nDétails:\n- Demandeur: {{requesterName}}\n- Type: {{actionType}}\n- Date: {{timestamp}}\n\nAccédez à Matrix Flow pour approuver ou rejeter cette demande: {{url}}`,
    en: `Matrix Flow - Approval Required\n\nA modification to matrix "{{matrixName}}" requires your validation.\n\nDetails:\n- Requester: {{requesterName}}\n- Type: {{actionType}}\n- Date: {{timestamp}}\n\nAccess Matrix Flow to approve or reject this request: {{url}}`,
    es: `Matrix Flow - Aprobación Requerida\n\nUna modificación en la matriz "{{matrixName}}" requiere su validación.\n\nDetalles:\n- Solicitante: {{requesterName}}\n- Tipo: {{actionType}}\n- Fecha: {{timestamp}}\n\nAcceda a Matrix Flow para aprobar o rechazar esta solicitud: {{url}}`
  }
}

// Template pour alerte sécurité multilingue
export const SECURITY_ALERT_I18N: I18nEmailTemplate = {
  subject: {
    fr: '🚨 Matrix Flow - Alerte sécurité: {{alertType}}',
    en: '🚨 Matrix Flow - Security Alert: {{alertType}}',
    es: '🚨 Matrix Flow - Alerta de Seguridad: {{alertType}}'
  },
  html: {
    fr: `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Alerte sécurité - Matrix Flow</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <table style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Matrix Flow</h1>
                <p style="color: #64748b; margin: 5px 0 0 0;">Système de gestion des flux réseau</p>
              </div>
              
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px;">
                <h2 style="color: #991b1b; margin: 0 0 10px 0; font-size: 20px;">🚨 Alerte sécurité</h2>
                <p style="color: #991b1b; margin: 0; font-weight: 600;">{{alertType}}</p>
              </div>

              <div style="margin-bottom: 25px;">
                <h3 style="color: #374151; margin: 0 0 15px 0;">Détails de l'incident</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280; width: 120px;">Utilisateur:</td>
                    <td style="padding: 8px 0; color: #374151;">{{userName}}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Adresse IP:</td>
                    <td style="padding: 8px 0; color: #374151;">{{ipAddress}}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Action:</td>
                    <td style="padding: 8px 0; color: #374151;">{{actionType}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Date:</td>
                    <td style="padding: 8px 0; color: #374151;">{{timestamp}}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="{{url}}" style="background-color: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                  🔍 Investiguer
                </a>
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    en: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Security Alert - Matrix Flow</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <table style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Matrix Flow</h1>
                <p style="color: #64748b; margin: 5px 0 0 0;">Network flow management system</p>
              </div>
              
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px;">
                <h2 style="color: #991b1b; margin: 0 0 10px 0; font-size: 20px;">🚨 Security Alert</h2>
                <p style="color: #991b1b; margin: 0; font-weight: 600;">{{alertType}}</p>
              </div>

              <div style="margin-bottom: 25px;">
                <h3 style="color: #374151; margin: 0 0 15px 0;">Incident Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280; width: 120px;">User:</td>
                    <td style="padding: 8px 0; color: #374151;">{{userName}}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">IP Address:</td>
                    <td style="padding: 8px 0; color: #374151;">{{ipAddress}}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Action:</td>
                    <td style="padding: 8px 0; color: #374151;">{{actionType}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Date:</td>
                    <td style="padding: 8px 0; color: #374151;">{{timestamp}}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="{{url}}" style="background-color: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                  🔍 Investigate
                </a>
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    es: `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Alerta de Seguridad - Matrix Flow</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <table style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Matrix Flow</h1>
                <p style="color: #64748b; margin: 5px 0 0 0;">Sistema de gestión de flujos de red</p>
              </div>
              
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px;">
                <h2 style="color: #991b1b; margin: 0 0 10px 0; font-size: 20px;">🚨 Alerta de Seguridad</h2>
                <p style="color: #991b1b; margin: 0; font-weight: 600;">{{alertType}}</p>
              </div>

              <div style="margin-bottom: 25px;">
                <h3 style="color: #374151; margin: 0 0 15px 0;">Detalles del Incidente</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280; width: 120px;">Usuario:</td>
                    <td style="padding: 8px 0; color: #374151;">{{userName}}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Dirección IP:</td>
                    <td style="padding: 8px 0; color: #374151;">{{ipAddress}}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Acción:</td>
                    <td style="padding: 8px 0; color: #374151;">{{actionType}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Fecha:</td>
                    <td style="padding: 8px 0; color: #374151;">{{timestamp}}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="{{url}}" style="background-color: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                  🔍 Investigar
                </a>
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  },
  text: {
    fr: `Matrix Flow - Alerte sécurité\n\nALERTE: {{alertType}}\n\nDétails:\n- Utilisateur: {{userName}}\n- IP: {{ipAddress}}\n- Action: {{actionType}}\n- Date: {{timestamp}}\n\nInvestiguer: {{url}}`,
    en: `Matrix Flow - Security Alert\n\nALERT: {{alertType}}\n\nDetails:\n- User: {{userName}}\n- IP: {{ipAddress}}\n- Action: {{actionType}}\n- Date: {{timestamp}}\n\nInvestigate: {{url}}`,
    es: `Matrix Flow - Alerta de Seguridad\n\nALERTA: {{alertType}}\n\nDetalles:\n- Usuario: {{userName}}\n- IP: {{ipAddress}}\n- Acción: {{actionType}}\n- Fecha: {{timestamp}}\n\nInvestigar: {{url}}`
  }
}

// Collection de tous les templates I18N
export const EMAIL_TEMPLATES_I18N = {
  CHANGE_APPROVAL: CHANGE_APPROVAL_I18N,
  SECURITY_ALERT: SECURITY_ALERT_I18N,
  // TODO: Ajouter les autres templates (change_notification, change_rejection, daily_digest)
} as const

export type I18nEmailTemplateType = keyof typeof EMAIL_TEMPLATES_I18N

// Fonction utilitaire pour obtenir un template dans une langue spécifique
export function getI18nTemplate(
  templateType: I18nEmailTemplateType,
  lang: 'fr' | 'en' | 'es' = 'fr'
): { subject: string; html: string; text: string } {
  const template = EMAIL_TEMPLATES_I18N[templateType]
  if (!template) {
    throw new Error(`Template ${templateType} not found`)
  }

  return {
    subject: template.subject[lang] || template.subject.fr,
    html: template.html[lang] || template.html.fr,
    text: template.text[lang] || template.text.fr
  }
}

// Fonction pour rendre un template I18N avec des données
export function renderI18nTemplate(
  template: string, 
  data: EmailTemplateData
): string {
  if (!template) return ''
  
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key as keyof EmailTemplateData]
    return value !== undefined && value !== null ? String(value) : match
  })
}
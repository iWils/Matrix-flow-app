// Templates email pour le système de notifications Matrix Flow
export interface EmailTemplateData {
  userName?: string
  matrixName?: string
  actionType?: string
  url?: string
  changes?: string
  requesterName?: string
  approverName?: string
  reason?: string
  ipAddress?: string
  timestamp?: string
  date?: string
  totalChanges?: string
  pendingApprovals?: string
  recentChanges?: any
  unsubscribeUrl?: string
  [key: string]: any
}

// Template pour approbation de changement
export const CHANGE_APPROVAL_TEMPLATE = {
  subject: '🔔 Matrix Flow - Approbation requise: {{matrixName}}',
  html: `
    <!DOCTYPE html>
    <html>
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

            {{#if changes}}
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin-bottom: 25px;">
              <h4 style="color: #475569; margin: 0 0 10px 0;">Détails des changements:</h4>
              <pre style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 0; white-space: pre-wrap;">{{changes}}</pre>
            </div>
            {{/if}}

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
              <p style="margin: 5px 0 0 0;">IP de la demande: {{ipAddress}}</p>
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `,
  text: `
Matrix Flow - Approbation requise

Une modification de la matrice "{{matrixName}}" nécessite votre validation.

Détails:
- Demandeur: {{requesterName}}
- Type: {{actionType}}
- Date: {{timestamp}}
- IP: {{ipAddress}}

{{#if changes}}
Changements:
{{changes}}
{{/if}}

Accédez à Matrix Flow pour approuver ou rejeter cette demande: {{url}}
  `
}

// Template pour notification de changement
export const CHANGE_NOTIFICATION_TEMPLATE = {
  subject: '📝 Matrix Flow - Modification approuvée: {{matrixName}}',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Modification approuvée - Matrix Flow</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding: 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Matrix Flow</h1>
              <p style="color: #64748b; margin: 5px 0 0 0;">Système de gestion des flux réseau</p>
            </div>
            
            <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 20px;">
              <h2 style="color: #065f46; margin: 0 0 10px 0; font-size: 20px;">✅ Modification approuvée</h2>
              <p style="color: #065f46; margin: 0;">Votre demande a été validée et appliquée</p>
            </div>

            <div style="margin-bottom: 25px;">
              <h3 style="color: #374151; margin: 0 0 15px 0;">Détails de l'approbation</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #6b7280; width: 120px;">Matrice:</td>
                  <td style="padding: 8px 0; color: #374151;">{{matrixName}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Approuvé par:</td>
                  <td style="padding: 8px 0; color: #374151;">{{approverName}}</td>
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
              <a href="{{url}}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                🔍 Voir la matrice
              </a>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #6b7280;">
              <p>Vous recevez cet email car vous avez créé une demande de modification.</p>
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `,
  text: `
Matrix Flow - Modification approuvée

Votre demande de modification de la matrice "{{matrixName}}" a été approuvée.

Détails:
- Approuvé par: {{approverName}}
- Type: {{actionType}}
- Date: {{timestamp}}

Accédez à la matrice: {{url}}
  `
}

// Template pour rejet de changement
export const CHANGE_REJECTION_TEMPLATE = {
  subject: '❌ Matrix Flow - Modification rejetée: {{matrixName}}',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Modification rejetée - Matrix Flow</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding: 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Matrix Flow</h1>
              <p style="color: #64748b; margin: 5px 0 0 0;">Système de gestion des flux réseau</p>
            </div>
            
            <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px;">
              <h2 style="color: #991b1b; margin: 0 0 10px 0; font-size: 20px;">❌ Modification rejetée</h2>
              <p style="color: #991b1b; margin: 0;">Votre demande n'a pas été approuvée</p>
            </div>

            <div style="margin-bottom: 25px;">
              <h3 style="color: #374151; margin: 0 0 15px 0;">Détails du rejet</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #6b7280; width: 120px;">Matrice:</td>
                  <td style="padding: 8px 0; color: #374151;">{{matrixName}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Rejeté par:</td>
                  <td style="padding: 8px 0; color: #374151;">{{approverName}}</td>
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

            {{#if reason}}
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin-bottom: 25px;">
              <h4 style="color: #991b1b; margin: 0 0 10px 0;">Motif du rejet:</h4>
              <p style="color: #7f1d1d; margin: 0; line-height: 1.5;">{{reason}}</p>
            </div>
            {{/if}}

            <div style="text-align: center; margin: 30px 0;">
              <a href="{{url}}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                📝 Créer nouvelle demande
              </a>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #6b7280;">
              <p>Vous recevez cet email car vous avez créé une demande de modification.</p>
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `,
  text: `
Matrix Flow - Modification rejetée

Votre demande de modification de la matrice "{{matrixName}}" a été rejetée.

Détails:
- Rejeté par: {{approverName}}
- Type: {{actionType}}
- Date: {{timestamp}}

{{#if reason}}
Motif: {{reason}}
{{/if}}

Vous pouvez créer une nouvelle demande: {{url}}
  `
}

// Template pour digest quotidien
export const DAILY_DIGEST_TEMPLATE = {
  subject: '📊 Matrix Flow - Résumé quotidien du {{date}}',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Résumé quotidien - Matrix Flow</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding: 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Matrix Flow</h1>
              <p style="color: #64748b; margin: 5px 0 0 0;">Résumé d'activité quotidien</p>
            </div>
            
            <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin-bottom: 20px;">
              <h2 style="color: #1e40af; margin: 0 0 10px 0; font-size: 20px;">📅 {{date}}</h2>
              <p style="color: #1e40af; margin: 0;">Voici votre résumé d'activité</p>
            </div>

            <div style="margin-bottom: 25px;">
              <h3 style="color: #374151; margin: 0 0 15px 0;">Statistiques du jour</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div style="background-color: #f8fafc; border-radius: 6px; padding: 15px; text-align: center;">
                  <div style="color: #2563eb; font-size: 24px; font-weight: bold; margin-bottom: 5px;">{{totalChanges}}</div>
                  <div style="color: #64748b; font-size: 14px;">Modifications</div>
                </div>
                <div style="background-color: #f8fafc; border-radius: 6px; padding: 15px; text-align: center;">
                  <div style="color: #10b981; font-size: 24px; font-weight: bold; margin-bottom: 5px;">{{pendingApprovals}}</div>
                  <div style="color: #64748b; font-size: 14px;">En attente</div>
                </div>
              </div>
            </div>

            {{#if recentChanges}}
            <div style="margin-bottom: 25px;">
              <h4 style="color: #374151; margin: 0 0 15px 0;">Modifications récentes</h4>
              {{#each recentChanges}}
              <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 10px;">
                <div style="font-weight: 600; color: #374151;">{{matrixName}} - {{actionType}}</div>
                <div style="color: #6b7280; font-size: 14px;">par {{userName}} • {{timestamp}}</div>
              </div>
              {{/each}}
            </div>
            {{/if}}

            <div style="text-align: center; margin: 30px 0;">
              <a href="{{url}}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                🔍 Accéder au dashboard
              </a>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #6b7280;">
              <p>Vous recevez ce digest car vous êtes abonné aux notifications Matrix Flow.</p>
              <p style="margin: 5px 0 0 0;"><a href="{{unsubscribeUrl}}" style="color: #6b7280;">Se désabonner</a></p>
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `,
  text: `
Matrix Flow - Résumé quotidien du {{date}}

Statistiques:
- {{totalChanges}} modifications
- {{pendingApprovals}} approbations en attente

{{#if recentChanges}}
Modifications récentes:
{{#each recentChanges}}
- {{matrixName}} ({{actionType}}) par {{userName}}
{{/each}}
{{/if}}

Accédez au dashboard: {{url}}
  `
}

// Template pour alerte sécurité
export const SECURITY_ALERT_TEMPLATE = {
  subject: '🚨 Matrix Flow - Alerte sécurité: {{alertType}}',
  html: `
    <!DOCTYPE html>
    <html>
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

            <div style="background-color: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin-bottom: 25px;">
              <h4 style="color: #92400e; margin: 0 0 10px 0;">🔒 Actions recommandées:</h4>
              <ul style="color: #92400e; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li>Vérifiez l'activité suspecte dans les logs d'audit</li>
                <li>Contactez l'utilisateur si nécessaire</li>
                <li>Considérez bloquer l'IP si tentatives répétées</li>
                <li>Renforcez la sécurité si besoin</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="{{url}}" style="background-color: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                🔍 Investiguer
              </a>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #6b7280;">
              <p>Vous recevez cette alerte car vous êtes administrateur du système Matrix Flow.</p>
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `,
  text: `
Matrix Flow - Alerte sécurité

ALERTE: {{alertType}}

Détails:
- Utilisateur: {{userName}}
- IP: {{ipAddress}}
- Action: {{actionType}}
- Date: {{timestamp}}

Actions recommandées:
- Vérifiez l'activité dans les logs
- Contactez l'utilisateur si nécessaire
- Considérez bloquer l'IP si répété

Investiguer: {{url}}
  `
}

// Fonction utilitaire pour remplacer les variables dans les templates
export function renderTemplate(template: string, data: EmailTemplateData): string {
  if (!template) return ''
  
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key as keyof EmailTemplateData]
    return value !== undefined && value !== null ? String(value) : match
  })
}

// Export des templates disponibles
export const EMAIL_TEMPLATES = {
  CHANGE_APPROVAL: CHANGE_APPROVAL_TEMPLATE,
  CHANGE_NOTIFICATION: CHANGE_NOTIFICATION_TEMPLATE,
  CHANGE_REJECTION: CHANGE_REJECTION_TEMPLATE,
  DAILY_DIGEST: DAILY_DIGEST_TEMPLATE,
  SECURITY_ALERT: SECURITY_ALERT_TEMPLATE
} as const

export type EmailTemplateType = keyof typeof EMAIL_TEMPLATES
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Badge } from './Badge';
import { LoadingSpinner } from './LoadingSpinner';
import { Alert } from './Alert';
import { TwoFactorSetupModal } from './TwoFactorSetupModal';

interface TwoFactorStatusProps {
  className?: string;
}

interface TFAStatus {
  enabled: boolean;
  backupCodesCount: number;
}

export const TwoFactorStatus: React.FC<TwoFactorStatusProps> = ({ className }) => {
  const [tfaStatus, setTfaStatus] = useState<TFAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/auth/2fa/setup');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load 2FA status');
      }

      setTfaStatus({
        enabled: data.enabled,
        backupCodesCount: data.backupCodesCount
      });
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable 2FA');
      }

      await loadStatus();
      setShowDisableConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
      setLoading(false);
    }
  };

  const handleGenerateBackupCodes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/backup-codes', {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate backup codes');
      }

      // Show the new backup codes
      const codesText = data.backupCodes.join('\n');
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>Nouveaux codes de récupération 2FA</title></head>
            <body style="font-family: monospace; padding: 20px;">
              <h2>⚠️ Codes de récupération 2FA</h2>
              <p><strong>Important:</strong> Sauvegardez ces codes dans un endroit sûr. Chaque code ne peut être utilisé qu'une seule fois.</p>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                ${data.backupCodes.map((code: string) => `<div style="margin: 5px 0;">${code}</div>`).join('')}
              </div>
              <button onclick="navigator.clipboard.writeText('${codesText}')" style="padding: 10px 20px; margin: 10px 0;">
                Copier tous les codes
              </button>
              <button onclick="window.close()" style="padding: 10px 20px; margin: 10px;">
                Fermer
              </button>
            </body>
          </html>
        `);
      }

      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate backup codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  if (loading && !tfaStatus) {
    return (
      <div className={`flex items-center gap-3 ${className || ''}`}>
        <LoadingSpinner size="sm" />
        <span className="text-slate-600 dark:text-slate-400">Chargement du statut 2FA...</span>
      </div>
    );
  }

  return (
    <div className={className}>
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold">Authentification à deux facteurs (2FA)</h3>
              <Badge variant={tfaStatus?.enabled ? 'success' : 'warning'}>
                {tfaStatus?.enabled ? 'Activé' : 'Désactivé'}
              </Badge>
            </div>

            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {tfaStatus?.enabled 
                ? 'Votre compte est protégé par l&apos;authentification à deux facteurs.'
                : 'Renforcez la sécurité de votre compte en activant l&apos;authentification à deux facteurs.'
              }
            </p>

            {tfaStatus?.enabled && (
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                <div className="flex items-center gap-2">
                  <span>📱 Application d&apos;authentification configurée</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span>🔑 {tfaStatus.backupCodesCount} code(s) de récupération restant(s)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          {!tfaStatus?.enabled ? (
            <Button 
              onClick={() => setShowSetupModal(true)}
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Chargement...
                </>
              ) : (
                '🔐 Activer la 2FA'
              )}
            </Button>
          ) : (
            <>
              <Button 
                variant="secondary"
                onClick={handleGenerateBackupCodes}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Génération...
                  </>
                ) : (
                  '🔑 Nouveaux codes de récupération'
                )}
              </Button>

              <Button 
                variant="danger"
                onClick={() => setShowDisableConfirm(true)}
                disabled={loading}
              >
                🚫 Désactiver la 2FA
              </Button>
            </>
          )}
        </div>

        {/* Confirmation modal for disabling 2FA */}
        {showDisableConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">⚠️ Désactiver la 2FA</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Êtes-vous sûr de vouloir désactiver l&apos;authentification à deux facteurs ? 
                Cela réduira la sécurité de votre compte.
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="danger" 
                  onClick={handleDisable2FA}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Désactivation...
                    </>
                  ) : (
                    'Oui, désactiver'
                  )}
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => setShowDisableConfirm(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <TwoFactorSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onSuccess={() => {
          loadStatus();
        }}
      />
    </div>
  );
};
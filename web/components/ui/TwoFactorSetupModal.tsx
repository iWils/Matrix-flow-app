'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { LoadingSpinner } from './LoadingSpinner';
import { Alert } from './Alert';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface SetupState {
  step: 'initial' | 'setup' | 'verify' | 'backup-codes';
  secret?: string;
  qrCode?: string;
  manualEntryKey?: string;
  backupCodes?: string[];
  loading: boolean;
  error?: string;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { t } = useTranslation('common');
  const [setupState, setSetupState] = useState<SetupState>({
    step: 'initial',
    loading: false
  });
  const [verificationCode, setVerificationCode] = useState('');

  const handleSetupStart = async () => {
    setSetupState(prev => ({ ...prev, loading: true, error: undefined }));

    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate setup');
      }

      setSetupState(prev => ({
        ...prev,
        step: 'setup',
        secret: data.secret,
        qrCode: data.qrCode,
        manualEntryKey: data.manualEntryKey,
        loading: false
      }));

    } catch (error) {
      setSetupState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Setup failed'
      }));
    }
  };

  const handleVerification = async () => {
    if (!setupState.secret || !verificationCode.trim()) return;

    setSetupState(prev => ({ ...prev, loading: true, error: undefined }));

    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          token: verificationCode.trim(),
          secret: setupState.secret
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setSetupState(prev => ({
        ...prev,
        step: 'backup-codes',
        backupCodes: data.backupCodes,
        loading: false
      }));
      setVerificationCode('');

    } catch (error) {
      setSetupState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      }));
    }
  };

  const handleComplete = () => {
    onSuccess?.();
    handleClose();
  };

  const handleClose = () => {
    setSetupState({
      step: 'initial',
      loading: false
    });
    setVerificationCode('');
    onClose();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const renderContent = () => {
    switch (setupState.step) {
      case 'initial':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">{t('twoFactorAuth.setup.title')}</h3>
              <p className="text-slate-600 dark:text-slate-400">
                {t('twoFactorAuth.setup.description')}
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                {t('twoFactorAuth.setup.beforeStart')}
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>{t('twoFactorAuth.setup.requirements.app')}</li>
                <li>{t('twoFactorAuth.setup.requirements.phone')}</li>
                <li>{t('twoFactorAuth.setup.requirements.backup')}</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleSetupStart} 
                disabled={setupState.loading}
                className="flex-1"
              >
                {setupState.loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    {t('twoFactorAuth.setup.generating')}
                  </>
                ) : (
                  t('twoFactorAuth.setup.startSetup')
                )}
              </Button>
              <Button variant="secondary" onClick={handleClose}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        );

      case 'setup':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">{t('twoFactorAuth.setup.scanQR')}</h3>
              <p className="text-slate-600 dark:text-slate-400">
                {t('twoFactorAuth.setup.scanDescription')}
              </p>
            </div>

            <div className="flex flex-col items-center space-y-4">
              {setupState.qrCode && (
                <div className="bg-white p-4 rounded-lg border">
                  <Image 
                    src={setupState.qrCode} 
                    alt="QR Code for 2FA setup"
                    width={192}
                    height={192}
                    className="w-48 h-48"
                  />
                </div>
              )}

              <div className="w-full">
                <label className="block text-sm font-medium mb-2">
                  {t('twoFactorAuth.setup.manualEntry')}
                </label>
                <div className="flex gap-2">
                  <Input 
                    value={setupState.manualEntryKey || ''} 
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="secondary"
                    onClick={() => copyToClipboard(setupState.manualEntryKey || '')}
                  >
{t('twoFactorAuth.setup.copy')}
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Code de vérification (6 chiffres):
              </label>
              <Input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="font-mono text-center text-lg"
                maxLength={6}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleVerification} 
                disabled={setupState.loading || verificationCode.length !== 6}
                className="flex-1"
              >
                {setupState.loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Vérification...
                  </>
                ) : (
                  'Vérifier et activer'
                )}
              </Button>
              <Button variant="secondary" onClick={handleClose}>
                Annuler
              </Button>
            </div>
          </div>
        );

      case 'backup-codes':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">🔐 2FA activé avec succès!</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Sauvegardez ces codes de récupération dans un endroit sûr. 
                Ils vous permettront d&apos;accéder à votre compte si vous perdez votre téléphone.
              </p>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                ⚠️ Important
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                Chaque code ne peut être utilisé qu&apos;une seule fois. Imprimez-les ou sauvegardez-les dans un gestionnaire de mots de passe.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">
                  Codes de récupération:
                </label>
                <Button 
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(setupState.backupCodes?.join('\n') || '')}
                >
                  Copier tous
                </Button>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {setupState.backupCodes?.map((code, index) => (
                    <div key={index} className="p-2 bg-white dark:bg-slate-700 rounded border">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleComplete} className="flex-1">
                J&apos;ai sauvegardé mes codes
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      className="max-w-2xl w-full"
    >
      <div className="p-6">
        {setupState.error && (
          <Alert variant="error" className="mb-6">
            {setupState.error}
          </Alert>
        )}
        
        {renderContent()}
      </div>
    </Modal>
  );
};
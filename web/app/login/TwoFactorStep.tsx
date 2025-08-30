'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface TwoFactorStepProps {
  username: string;
  onSuccess: () => void;
  onBack: () => void;
  onError: (error: string) => void;
}

export default function TwoFactorStep({ username, onSuccess, onBack, onError }: TwoFactorStepProps) {
  const { t } = useTranslation(['common', 'login']);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;

    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          code: code.replace(/\s/g, '') // Remove spaces
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      // If verification successful, complete login
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : t('twoFactorAuth.errors.verificationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const formatCode = (value: string) => {
    // Remove all non-digits and limit to 6 digits
    const digits = value.replace(/\D/g, '').slice(0, 6);
    // Add space every 3 digits for better readability
    return digits.replace(/(\d{3})(\d{1,3})/, '$1 $2');
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    setCode(formatted);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          🔐 {t('twoFactorAuth.title')}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Saisissez le code à 6 chiffres de votre application d&apos;authentification
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 2FA Code Input */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Code d&apos;authentification
          </label>
          <div className="relative">
            <input
              type="text"
              value={code}
              onChange={handleCodeChange}
              className="input text-center text-2xl font-mono tracking-wider h-14"
              placeholder="123 456"
              maxLength={7} // 6 digits + 1 space
              required
              disabled={loading}
              autoComplete="one-time-code"
              inputMode="numeric"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Le code change toutes les 30 secondes dans votre app d&apos;authentification
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            type="submit"
            disabled={loading || code.replace(/\s/g, '').length !== 6}
            className="btn-primary w-full h-12 text-base font-semibold"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <LoadingSpinner size="sm" />
                Vérification...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Vérifier et se connecter
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="btn-secondary w-full h-10 text-sm"
          >
            ← Retour
          </button>
        </div>
      </form>

      {/* Help */}
      <div className="bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">💡 Problème d&apos;accès ?</p>
            <p className="text-blue-700 dark:text-blue-300">
              Vérifiez que l&apos;heure de votre appareil est synchronisée. 
              Si vous n&apos;avez plus accès à votre téléphone, contactez un administrateur.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
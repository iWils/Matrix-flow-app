'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';

interface User2FAInfo {
  id: number;
  name: string;
  email: string;
  role: string;
  twoFactorEnabled: boolean;
  backupCodesCount?: number;
  lastTwoFactorAt?: string;
  createdAt: string;
}

interface System2FAStats {
  totalUsers: number;
  users2FAEnabled: number;
  users2FADisabled: number;
  percentage: number;
}

export default function Admin2FAPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useTranslation('common');
  const [users, setUsers] = useState<User2FAInfo[]>([]);
  const [stats, setStats] = useState<System2FAStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  // Vérifier les permissions admin
  useEffect(() => {
    if (session && session.user?.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [session, router]);

  const loadUsers2FA = async () => {
    try {
      const response = await fetch('/api/admin/2fa');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load 2FA data');
      }

      setUsers(data.users);
      setStats(data.stats);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load 2FA data');
    } finally {
      setLoading(false);
    }
  };

  const force2FADisable = async (userId: number) => {
    if (!confirm(t('twoFactorAuth.admin.actions.confirmDisable'))) {
      return;
    }

    try {
      const response = await fetch('/api/admin/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disable',
          userId
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disable 2FA');
      }

      await loadUsers2FA();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    }
  };

  const regenerateBackupCodes = async (userId: number) => {
    if (!confirm(t('twoFactorAuth.admin.actions.confirmRegenerate'))) {
      return;
    }

    try {
      const response = await fetch('/api/admin/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate-backup-codes',
          userId
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to regenerate backup codes');
      }

      const result = await response.json();
      alert(t('twoFactorAuth.admin.actions.successRegenerate', { count: result.codesCount }));
      await loadUsers2FA();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate backup codes');
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      loadUsers2FA();
    }
  }, [session]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-slate-600 dark:text-slate-400">
          {t('twoFactorAuth.admin.loading')}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          🔐 {t('twoFactorAuth.admin.title')}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {t('twoFactorAuth.admin.description')}
        </p>
      </div>

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t('twoFactorAuth.admin.stats.totalUsers')}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.totalUsers}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t('twoFactorAuth.admin.stats.enabled')}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.users2FAEnabled}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t('twoFactorAuth.admin.stats.disabled')}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.users2FADisabled}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                <span className="text-2xl">❌</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t('twoFactorAuth.admin.stats.adoptionRate')}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.percentage}%
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Actions rapides */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t('twoFactorAuth.admin.quickActions')}
          </h2>
          <Button
            variant="secondary"
            onClick={loadUsers2FA}
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="sm" /> : `🔄 ${t('twoFactorAuth.admin.refresh')}`}
          </Button>
        </div>
      </Card>

      {/* Liste des utilisateurs */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {t('twoFactorAuth.admin.userStatus')} ({users.length})
        </h2>

        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      <span className="text-lg">
                        {user.twoFactorEnabled ? '🔐' : '🔓'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900 dark:text-slate-100">
                          {user.name} ({user.email})
                        </h3>
                        <Badge variant={user.role === 'admin' ? 'success' : 'default'}>
                          {user.role}
                        </Badge>
                        <Badge variant={user.twoFactorEnabled ? 'success' : 'warning'}>
                          {user.twoFactorEnabled ? t('twoFactorAuth.admin.stats.enabled') : t('twoFactorAuth.admin.stats.disabled')}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t('twoFactorAuth.admin.memberSince')} {formatDate(user.createdAt)}
                        {user.lastTwoFactorAt && 
                          ` • ${t('twoFactorAuth.admin.lastAuth')} ${formatDate(user.lastTwoFactorAt)}`
                        }
                        {user.twoFactorEnabled && user.backupCodesCount !== undefined && 
                          ` • ${t('twoFactorAuth.admin.backupCodes', { count: user.backupCodesCount })}`
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex gap-2">
                  {user.twoFactorEnabled && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => regenerateBackupCodes(user.id)}
                      >
                        🔄 {t('twoFactorAuth.admin.actions.regenerateCodes')}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => force2FADisable(user.id)}
                      >
                        ❌ {t('twoFactorAuth.admin.actions.disable')}
                      </Button>
                    </>
                  )}
                  {!user.twoFactorEnabled && (
                    <Badge variant="warning">
                      {t('twoFactorAuth.admin.userMustEnable')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">👤</div>
              <p className="text-slate-600 dark:text-slate-400">
                {t('twoFactorAuth.admin.noUsers')}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Informations de sécurité */}
      <Card className="p-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
            💡 {t('twoFactorAuth.admin.securityInfo.title')}
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• {t('twoFactorAuth.admin.securityInfo.canOnlyEnable')}</li>
            <li>• {t('twoFactorAuth.admin.securityInfo.adminCanDisable')}</li>
            <li>• {t('twoFactorAuth.admin.securityInfo.codesEncrypted')}</li>
            <li>• {t('twoFactorAuth.admin.securityInfo.tenCodes')}</li>
            <li>• {t('twoFactorAuth.admin.securityInfo.regenerationInvalidates')}</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
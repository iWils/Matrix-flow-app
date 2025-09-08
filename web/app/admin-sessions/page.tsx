'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';

interface SessionInfo {
  id: string;
  userId: number;
  userName: string;
  userEmail?: string;
  ipAddress?: string;
  browser?: string;
  os?: string;
  isMobile?: boolean;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isActive: boolean;
}

interface SessionsStats {
  totalActiveSessions: number;
  uniqueUsers: number;
  mobileDevices: number;
  expiringSoon: number;
}

export default function AdminSessionsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useTranslation(['common', 'admin']);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [stats, setStats] = useState<SessionsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  // Vérifier les permissions admin
  useEffect(() => {
    if (session && session.user?.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [session, router]);

  const loadSessions = useCallback(async () => {
    try {
      // En attendant l'API admin, utilisons l'API utilisateur comme fallback
      const response = await fetch('/api/auth/sessions');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load sessions');
      }

      // Simuler des données admin avec les données utilisateur
      const mockSessions: SessionInfo[] = data.sessions.map((s: SessionInfo, index: number) => ({
        ...s,
        userId: parseInt(session?.user?.id || '1') + index,
        userName: session?.user?.name || 'Utilisateur',
        userEmail: session?.user?.email || 'user@example.com'
      }));

      setSessions(mockSessions);

      // Calculer les statistiques
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const statsData: SessionsStats = {
        totalActiveSessions: mockSessions.length,
        uniqueUsers: new Set(mockSessions.map(s => s.userId)).size,
        mobileDevices: mockSessions.filter(s => s.isMobile).length,
        expiringSoon: mockSessions.filter(s => new Date(s.expiresAt) <= in24Hours).length
      };

      setStats(statsData);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [session]);

  const invalidateSession = async (sessionId: string) => {
    try {
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'invalidate'
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to invalidate session');
      }

      // Refresh sessions
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invalidate session');
    }
  };

  const invalidateUserSessions = async () => {
    // Pour l'instant, invalider toutes les sessions sauf la courante
    try {
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invalidate-others'
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to invalidate user sessions');
      }

      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invalidate sessions');
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      loadSessions();
    }
  }, [session, loadSessions]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  const getDeviceIcon = (sessionInfo: SessionInfo) => {
    if (sessionInfo.isMobile) {
      return '📱';
    }
    return '🖥️';
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return expiry <= in24Hours;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-slate-600 dark:text-slate-400">
          {t('admin:loading')}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          📊 {t('admin:adminTitle')}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {t('admin:adminDescription')}
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
                  {t('admin:activeSessions')}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.totalActiveSessions}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <span className="text-2xl">🔐</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t('admin:connectedUsers')}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.uniqueUsers}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t('admin:mobileDevices')}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.mobileDevices}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <span className="text-2xl">📱</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t('admin:expiringSoon')}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.expiringSoon}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <span className="text-2xl">⏰</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Actions rapides */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t('admin:quickActions')}
          </h2>
          <Button
            variant="secondary"
            onClick={loadSessions}
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="sm" /> : `🔄 ${t('admin:refreshSessions')}`}
          </Button>
        </div>
      </Card>

      {/* Liste des sessions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {t('admin:sessions')} ({sessions.length}) - {t('admin:sessionDetails')}
        </h2>

        <div className="space-y-4">
          {sessions.map((sessionInfo) => (
            <div
              key={sessionInfo.id}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getDeviceIcon(sessionInfo)}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900 dark:text-slate-100">
                          {sessionInfo.userName} ({sessionInfo.userEmail})
                        </h3>
                        <Badge variant={sessionInfo.isActive ? 'success' : 'warning'}>
                          {sessionInfo.isActive ? t('common:active') : t('common:expired')}
                        </Badge>
                        {isExpiringSoon(sessionInfo.expiresAt) && (
                          <Badge variant="warning">{t('admin:expiringSoon')}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {sessionInfo.browser || t('admin:unknownBrowser')} sur {sessionInfo.os || t('admin:unknownOS')}
                        {sessionInfo.ipAddress && ` • IP: ${sessionInfo.ipAddress}`}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <div>
                      <span className="font-medium">{t('admin:createdOn')}</span> {formatDate(sessionInfo.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">{t('admin:lastActivity')}</span> {formatDate(sessionInfo.lastActiveAt)}
                    </div>
                    <div>
                      <span className="font-medium">{t('admin:expiresOn')}</span> {formatDate(sessionInfo.expiresAt)}
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => invalidateSession(sessionInfo.id)}
                  >
                    🚫 {t('admin:closeSession')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => invalidateUserSessions()}
                  >
                    🚫 {t('admin:closeAllSessions')}
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-slate-600 dark:text-slate-400">
                {t('admin:noSessions')}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Informations de sécurité */}
      <Card className="p-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
            💡 {t('admin:securityInfoTitle')}
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• {t('admin:autoExpire')}</li>
            <li>• {t('admin:monitorSuspicious')}</li>
            <li>• {t('admin:userManagementSecurity')}</li>
            <li>• {t('admin:noGeolocation')}</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
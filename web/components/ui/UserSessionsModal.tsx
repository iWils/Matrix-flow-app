'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Button } from './Button';
import { LoadingSpinner } from './LoadingSpinner';
import { Alert } from './Alert';
import { Badge } from './Badge';

interface UserSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SessionInfo {
  id: string;
  ipAddress?: string;
  browser?: string;
  os?: string;
  isMobile?: boolean;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isActive: boolean;
}

interface SessionsResponse {
  sessions: SessionInfo[];
  total: number;
  error?: string;
}

export const UserSessionsModal: React.FC<UserSessionsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useTranslation('common');
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/auth/sessions');
      const data: SessionsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load sessions');
      }

      setSessions(data.sessions);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

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

      // Refresh sessions list
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invalidate session');
    }
  };

  const invalidateAllOthers = async () => {
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
        throw new Error(data.error || 'Failed to invalidate sessions');
      }

      // Refresh sessions list
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invalidate sessions');
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getDeviceIcon = (session: SessionInfo) => {
    if (session.isMobile) {
      return '📱';
    } else {
      return '🖥️';
    }
  };

  const isCurrentSession = (session: SessionInfo, index: number) => {
    // Simple heuristic: most recent activity is likely current session
    return index === 0;
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      className="max-w-4xl w-full"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            📊 {t('sessions.title')}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={loadSessions}
              disabled={loading}
            >
              {loading ? <LoadingSpinner size="sm" /> : `🔄 ${t('sessions.refresh')}`}
            </Button>
            <Button
              variant="danger"
              onClick={invalidateAllOthers}
              disabled={loading || sessions.length <= 1}
            >
              🚫 {t('sessions.closeOthers')}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-slate-600 dark:text-slate-400">
              {t('sessions.loading')}
            </span>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-slate-600 dark:text-slate-400">
                {t('sessions.count', { count: sessions.length })} • {t('sessions.autoExpire')}
              </p>
            </div>

            <div className="space-y-4">
              {sessions.map((session, index) => (
                <div 
                  key={session.id}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getDeviceIcon(session)}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-slate-900 dark:text-slate-100">
                              {session.browser || t('sessions.unknownBrowser')} sur {session.os || t('sessions.unknownOS')}
                            </h3>
                            {isCurrentSession(session, index) && (
                              <Badge variant="success">{t('sessions.currentSession')}</Badge>
                            )}
                          </div>
                          {session.ipAddress && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              IP: {session.ipAddress}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <div>
                          <span className="font-medium">{t('sessions.createdOn')}</span>
                          <br />
                          {formatDate(session.createdAt)}
                        </div>
                        <div>
                          <span className="font-medium">{t('sessions.lastActivity')}</span>
                          <br />
                          {formatDate(session.lastActiveAt)}
                        </div>
                        <div>
                          <span className="font-medium">{t('sessions.expiresOn')}</span>
                          <br />
                          {formatDate(session.expiresAt)}
                        </div>
                      </div>
                    </div>

                    <div className="ml-4">
                      {!isCurrentSession(session, index) && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => invalidateSession(session.id)}
                        >
                          🚫 {t('sessions.close')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {sessions.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-slate-600 dark:text-slate-400">
                    {t('sessions.noSessions')}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              💡 {t('sessions.securityTips.title')}
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• {t('sessions.securityTips.closeSuspicious')}</li>
              <li>• {t('sessions.securityTips.checkRegularly')}</li>
              <li>• {t('sessions.securityTips.autoExpireHours', { hours: Math.floor(12) })}</li>
              <li>• {t('sessions.securityTips.logoutShared')}</li>
            </ul>
          </div>
        </div>
      </div>
    </Modal>
  );
};
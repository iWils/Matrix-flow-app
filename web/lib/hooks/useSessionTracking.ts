'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export function useSessionTracking() {
  const { data: session, status } = useSession();
  const intervalRef = useRef<NodeJS.Timeout>();
  const sessionCreatedRef = useRef(false);

  const createOrUpdateSession = useCallback(async () => {
    if (!session?.user) return;

    try {
      await fetch('/api/auth/session-hook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create'
        }),
      });
    } catch (error) {
      console.error('Failed to create/update session:', error);
    }
  }, [session?.user]);

  const updateSessionActivity = useCallback(async () => {
    if (!session?.user) return;

    try {
      await fetch('/api/auth/session-hook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update'
        }),
      });
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  }, [session?.user]);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (session?.user && !sessionCreatedRef.current) {
      // Créer une session au premier chargement
      createOrUpdateSession();
      sessionCreatedRef.current = true;

      // Mettre à jour l'activité toutes les 5 minutes
      intervalRef.current = setInterval(() => {
        updateSessionActivity();
      }, 5 * 60 * 1000); // 5 minutes
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session, status, createOrUpdateSession, updateSessionActivity]);

  // Nettoyer la session lors de la déconnexion
  useEffect(() => {
    if (status === 'unauthenticated' && sessionCreatedRef.current) {
      cleanupSession();
      sessionCreatedRef.current = false;
    }
  }, [status]);

  const cleanupSession = async () => {
    try {
      await fetch('/api/auth/session-hook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cleanup'
        }),
      });
    } catch (error) {
      console.error('Failed to cleanup session:', error);
    }
  };

  return {
    isTracking: !!session?.user && sessionCreatedRef.current
  };
}
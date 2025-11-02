/**
 * Hook pour synchroniser React Query avec Supabase Realtime
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeManager } from '@/lib/realtime/RealtimeManager';
import { queryKeys } from './useGameData';

interface UseRealtimeSyncOptions {
  sessionId?: string;
  questionId?: string;
  enabled?: boolean;
}

export const useRealtimeSync = (options: UseRealtimeSyncOptions = {}) => {
  const { sessionId, questionId, enabled = true } = options;
  const queryClient = useQueryClient();
  const realtimeManager = getRealtimeManager();

  useEffect(() => {
    if (!enabled) return;

    const unsubscribers: (() => void)[] = [];

    // Sync game_state
    if (sessionId) {
      const unsub = realtimeManager.subscribe({
        name: `game-state-sync-${sessionId}`,
        table: 'game_state',
        filter: `game_session_id=eq.${sessionId}`,
        callback: () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.gameState(sessionId) });
        },
      });
      unsubscribers.push(unsub);
    }

    // Sync teams
    const teamsUnsub = realtimeManager.subscribe({
      name: 'teams-sync',
      table: 'teams',
      callback: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.teams(sessionId) });
      },
    });
    unsubscribers.push(teamsUnsub);

    // Sync buzzers
    if (questionId && sessionId) {
      const buzzersUnsub = realtimeManager.subscribe({
        name: `buzzers-sync-${questionId}`,
        table: 'buzzer_attempts',
        filter: `question_id=eq.${questionId}`,
        callback: () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.buzzers(questionId, sessionId) });
        },
      });
      unsubscribers.push(buzzersUnsub);
    }

    // Sync sessions
    const sessionsUnsub = realtimeManager.subscribe({
      name: 'sessions-sync',
      table: 'game_sessions',
      callback: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.activeSessions() });
      },
    });
    unsubscribers.push(sessionsUnsub);

    // Cleanup
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [enabled, sessionId, questionId, queryClient, realtimeManager]);

  // Reconnect handler
  useEffect(() => {
    const unsub = realtimeManager.onReconnect(() => {
      console.log('🔄 useRealtimeSync: Reconnexion détectée, invalidation des queries');
      queryClient.invalidateQueries();
    });

    return unsub;
  }, [queryClient, realtimeManager]);
};

/**
 * Hook pour gérer le realtime de l'écran TV
 */

import { useEffect } from 'react';
import { getRealtimeManager } from '@/lib/realtime/RealtimeManager';
import { logger } from '@/lib/utils/logger';

interface UseScreenRealtimeOptions {
  onGameStateChange?: () => void;
  onTeamsChange?: () => void;
  onBuzzerInsert?: (payload: any) => void;
  onAnswerInsert?: (payload: any) => void;
}

export const useScreenRealtime = (options: UseScreenRealtimeOptions = {}) => {
  const realtimeManager = getRealtimeManager();

  useEffect(() => {
    logger.info('Screen: Setting up realtime subscriptions');

    const unsubscribers: (() => void)[] = [];

    // Game state
    if (options.onGameStateChange) {
      const unsub = realtimeManager.subscribe({
        name: 'screen-game-state',
        table: 'game_state',
        callback: options.onGameStateChange,
      });
      unsubscribers.push(unsub);
    }

    // Teams
    if (options.onTeamsChange) {
      const unsub = realtimeManager.subscribe({
        name: 'screen-teams',
        table: 'teams',
        callback: options.onTeamsChange,
      });
      unsubscribers.push(unsub);
    }

    // Buzzers
    if (options.onBuzzerInsert) {
      const unsub = realtimeManager.subscribe({
        name: 'screen-buzzers',
        table: 'buzzer_attempts',
        events: ['INSERT'],
        callback: options.onBuzzerInsert,
      });
      unsubscribers.push(unsub);
    }

    // Answers
    if (options.onAnswerInsert) {
      const unsub = realtimeManager.subscribe({
        name: 'screen-answers',
        table: 'team_answers',
        events: ['INSERT', 'UPDATE'],
        callback: options.onAnswerInsert,
      });
      unsubscribers.push(unsub);
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [realtimeManager]);
};

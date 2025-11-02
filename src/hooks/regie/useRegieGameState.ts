/**
 * Hook pour gérer l'état du jeu dans la Régie
 */

import { useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useActiveSession, useGameState } from '@/hooks/useGameData';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/utils/logger';

export const useRegieGameState = () => {
  const { data: activeSession } = useActiveSession();
  const { data: gameState } = useGameState(activeSession?.id);
  
  const setGameState = useGameStore(state => state.setGameState);
  const setSession = useGameStore(state => state.setSession);

  const updateGameState = useCallback(async (updates: any) => {
    if (!activeSession?.id) {
      logger.error('No active session to update');
      return;
    }

    try {
      const { error } = await supabase
        .from('game_state')
        .update(updates)
        .eq('game_session_id', activeSession.id);

      if (error) throw error;
      
      logger.info('Game state updated', { updates });
    } catch (error) {
      logger.error('Failed to update game state', error as Error);
      throw error;
    }
  }, [activeSession?.id]);

  return {
    session: activeSession,
    gameState,
    updateGameState,
  };
};

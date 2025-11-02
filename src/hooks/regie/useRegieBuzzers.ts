/**
 * Hook pour gérer les buzzers dans la Régie
 */

import { useCallback, useEffect, useState } from 'react';
import { useBuzzerStore } from '@/stores/buzzerStore';
import { useBuzzers, useGameState } from '@/hooks/useGameData';
import { getAudioEngine } from '@/lib/audio/AudioEngine';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/utils/logger';
import { toast } from 'sonner';

export const useRegieBuzzers = (questionId?: string, sessionId?: string) => {
  const audioEngine = getAudioEngine();
  const { data: buzzersData } = useBuzzers(questionId, sessionId);
  const { data: gameState } = useGameState(sessionId);
  
  const {
    buzzers,
    setBuzzers,
    clearBuzzers,
    lockBuzzer,
    unlockBuzzer,
    buzzerLocked,
    setTimerWhenBuzzed,
    setAudioPositionWhenBuzzed,
  } = useBuzzerStore();

  // Sync avec React Query - FILTRER les équipes bloquées
  useEffect(() => {
    if (buzzersData && gameState) {
      // Parse excluded_teams
      const excludedTeams = (gameState.excluded_teams as any) || [];
      const blockedTeamIds = new Set<string>();
      
      if (Array.isArray(excludedTeams)) {
        excludedTeams.forEach((item: any) => {
          if (typeof item === 'string') {
            blockedTeamIds.add(item);
          } else if (item && typeof item === 'object') {
            const teamId = item.team_id || item.id || item.teamId;
            if (teamId) blockedTeamIds.add(teamId);
          }
        });
      }
      
      // FILTRER les buzzers pour exclure les équipes bloquées
      const validBuzzers = buzzersData.filter(buzzer => 
        !blockedTeamIds.has(buzzer.team_id || '')
      );
      
      setBuzzers(validBuzzers);
      
      // Auto-lock UNIQUEMENT sur les buzzers valides
      if (validBuzzers.length > 0 && !buzzerLocked) {
        const firstBuzzer = validBuzzers[0];
        lockBuzzer();
        audioEngine.stopWithFade(30);
        
        toast.success(`🔔 ${firstBuzzer.teams?.name} a buzzé !`);
        logger.buzzer('First valid buzzer locked', { team: firstBuzzer.teams?.name });
      }
    }
  }, [buzzersData, gameState, buzzerLocked]);

  const resetBuzzers = useCallback(async () => {
    if (!questionId || !sessionId) return;

    try {
      await supabase
        .from('buzzer_attempts')
        .delete()
        .eq('question_id', questionId)
        .eq('game_session_id', sessionId);

      clearBuzzers();
      logger.buzzer('Buzzers reset', { questionId, sessionId });
    } catch (error) {
      logger.error('Failed to reset buzzers', error as Error);
    }
  }, [questionId, sessionId, clearBuzzers]);

  return {
    buzzers,
    buzzerLocked,
    resetBuzzers,
    lockBuzzer,
    unlockBuzzer,
  };
};

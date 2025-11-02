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

export const useRegieBuzzers = (questionInstanceId?: string, sessionId?: string) => {
  const audioEngine = getAudioEngine();
  const { data: buzzersData } = useBuzzers(questionInstanceId, sessionId);
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

  // Sync avec React Query - FILTRER IMMÉDIATEMENT les équipes bloquées
  useEffect(() => {
    if (!buzzersData || !gameState) {
      return;
    }
    
    // 1. FILTRER D'ABORD avant toute autre opération
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
    
    // 2. Ne garder QUE les buzzers valides (non bloqués)
    const validBuzzers = buzzersData.filter(buzzer => {
      const buzzTeamId = buzzer.team_id || '';
      const isBlocked = blockedTeamIds.has(buzzTeamId);
      
      if (isBlocked) {
        console.log(`🚫 Buzzer IGNORÉ de ${buzzer.teams?.name} (équipe bloquée)`);
      }
      
      return !isBlocked;
    });
    
    console.log(`🔔 Buzzers reçus: ${buzzersData.length}, valides: ${validBuzzers.length}`, {
      blocked: Array.from(blockedTeamIds),
      validTeams: validBuzzers.map(b => b.teams?.name)
    });
    
    // 3. Mettre à jour UNIQUEMENT avec les buzzers valides
    setBuzzers(validBuzzers);
    
    // 4. Lock et arrêt audio UNIQUEMENT si buzzers valides > 0
    if (validBuzzers.length > 0 && !buzzerLocked) {
      const firstBuzzer = validBuzzers[0];
      lockBuzzer();
      audioEngine.stopWithFade(30);
      
      toast.success(`🔔 ${firstBuzzer.teams?.name} a buzzé !`);
      logger.buzzer('First valid buzzer locked', { 
        team: firstBuzzer.teams?.name,
        totalBuzzers: buzzersData.length,
        validBuzzers: validBuzzers.length
      });
    }
  }, [buzzersData, gameState, buzzerLocked, setBuzzers, lockBuzzer]);

  const resetBuzzers = useCallback(async () => {
    if (!questionInstanceId || !sessionId) return;

    try {
      await supabase
        .from('buzzer_attempts')
        .delete()
        .eq('question_instance_id', questionInstanceId)
        .eq('game_session_id', sessionId);

      clearBuzzers();
      logger.buzzer('Buzzers reset', { questionInstanceId, sessionId });
    } catch (error) {
      logger.error('Failed to reset buzzers', error as Error);
    }
  }, [questionInstanceId, sessionId, clearBuzzers]);

  return {
    buzzers,
    buzzerLocked,
    resetBuzzers,
    lockBuzzer,
    unlockBuzzer,
  };
};

/**
 * Hook pour gérer les buzzers dans la Régie
 */

import { useCallback, useEffect } from 'react';
import { useBuzzerStore } from '@/stores/buzzerStore';
import { useBuzzers } from '@/hooks/useGameData';
import { getAudioEngine } from '@/lib/audio/AudioEngine';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/utils/logger';
import { toast } from 'sonner';

export const useRegieBuzzers = (questionId?: string, sessionId?: string) => {
  const audioEngine = getAudioEngine();
  const { data: buzzersData } = useBuzzers(questionId, sessionId);
  
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

  // Sync avec React Query
  useEffect(() => {
    if (buzzersData) {
      setBuzzers(buzzersData);
      
      // Auto-lock quand premier buzzer arrive
      if (buzzersData.length > 0 && !buzzerLocked) {
        const firstBuzzer = buzzersData[0];
        lockBuzzer();
        audioEngine.stopWithFade(30);
        
        toast.success(`🔔 ${firstBuzzer.teams?.name} a buzzé !`);
        logger.buzzer('First buzzer locked', { team: firstBuzzer.teams?.name });
      }
    }
  }, [buzzersData, buzzerLocked]);

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

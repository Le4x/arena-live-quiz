/**
 * Hook pour gérer le buzzer côté client
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playSound } from '@/lib/sounds';
import { logger } from '@/lib/utils/logger';
import { toast } from 'sonner';

export const useClientBuzzer = (
  teamId?: string,
  questionId?: string,
  questionInstanceId?: string,
  sessionId?: string
) => {
  const [hasBuzzed, setHasBuzzed] = useState(false);

  const buzz = useCallback(async () => {
    if (!teamId || !questionId || !questionInstanceId || !sessionId || hasBuzzed) {
      return;
    }

    try {
      // Vérifier si déjà buzzé
      const { data: existing } = await supabase
        .from('buzzer_attempts')
        .select('id')
        .eq('team_id', teamId)
        .eq('question_instance_id', questionInstanceId)
        .maybeSingle();

      if (existing) {
        logger.warn('Already buzzed', { teamId, questionInstanceId });
        return;
      }

      // Créer buzzer
      const { error } = await supabase
        .from('buzzer_attempts')
        .insert({
          team_id: teamId,
          question_id: questionId,
          question_instance_id: questionInstanceId,
          game_session_id: sessionId,
          buzzed_at: new Date().toISOString(),
        });

      if (error) throw error;

      setHasBuzzed(true);
      playSound('buzz');
      toast.success('🔔 Buzzer appuyé !');
      
      logger.buzzer('Buzzed', { teamId, questionId });
    } catch (error) {
      logger.error('Buzz failed', error as Error);
      toast.error('Erreur lors du buzzer');
    }
  }, [teamId, questionId, questionInstanceId, sessionId, hasBuzzed]);

  const reset = useCallback(() => {
    setHasBuzzed(false);
  }, []);

  return {
    hasBuzzed,
    buzz,
    reset,
  };
};

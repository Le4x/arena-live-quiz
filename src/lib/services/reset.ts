/**
 * Reset Service - Purge complète des données volatiles par question_instance
 * Garantit qu'aucune donnée résiduelle ne pollue la nouvelle question
 */

import { supabase } from "@/integrations/supabase/client";

export interface PurgeOptions {
  sessionId: string;
  questionInstanceId: string;
}

/**
 * Purge toutes les données volatiles pour une question_instance donnée
 */
export async function purgeVolatileForQuestion({ 
  sessionId, 
  questionInstanceId 
}: PurgeOptions): Promise<void> {
  console.log('🧹 [Reset] Purge complète pour', { sessionId, questionInstanceId });

  try {
    // Supprimer en parallèle tous les buzzers et réponses
    await Promise.all([
      // Buzzers
      supabase
        .from('buzzer_attempts')
        .delete()
        .eq('game_session_id', sessionId)
        .eq('question_instance_id', questionInstanceId),
      
      // Réponses texte et QCM
      supabase
        .from('team_answers')
        .delete()
        .eq('game_session_id', sessionId)
        .eq('question_instance_id', questionInstanceId),
    ]);

    console.log('✅ [Reset] Purge terminée avec succès');
  } catch (error) {
    console.error('❌ [Reset] Erreur lors de la purge:', error);
    throw error;
  }
}

/**
 * Reset complet du game_state (exclusions, résultats, buzzers actifs)
 */
export async function resetGameState(sessionId: string): Promise<void> {
  console.log('🔄 [Reset] Reset game_state pour session', sessionId);

  try {
    await supabase
      .from('game_state')
      .update({
        excluded_teams: [],
        answer_result: null,
        is_buzzer_active: false,
        timer_active: false,
        show_answer: false,
      })
      .eq('game_session_id', sessionId);

    console.log('✅ [Reset] Game state réinitialisé');
  } catch (error) {
    console.error('❌ [Reset] Erreur reset game_state:', error);
    throw error;
  }
}

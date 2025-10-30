/**
 * Snapshot Service - Re-sync complet de l'état du jeu
 * Permet à un client de récupérer tout l'état après une reconnexion
 */

import { supabase } from "@/integrations/supabase/client";

export interface CompleteGameState {
  gameState: any;
  teams: any[];
  currentQuestion: any | null;
  currentRound: any | null;
  buzzers: any[];
  answers: any[];
  final: any | null;
}

/**
 * Récupère un snapshot complet de l'état du jeu
 */
export async function fetchSnapshot(sessionId: string): Promise<CompleteGameState> {
  console.log('📸 [Snapshot] Récupération pour session', sessionId);

  try {
    // D'abord charger le game state
    const { data: gameState } = await supabase
      .from('game_state')
      .select('*')
      .eq('game_session_id', sessionId)
      .maybeSingle();

    // Puis charger le reste en parallèle
    const [
      { data: teams },
      { data: currentQuestion },
      { data: currentRound },
      { data: buzzers },
      { data: answers },
      { data: final },
    ] = await Promise.all([
      // Équipes avec scores
      supabase
        .from('teams')
        .select('*')
        .order('score', { ascending: false }),
      
      // Question courante (si définie)
      gameState?.current_question_id
        ? supabase
            .from('questions')
            .select('*')
            .eq('id', gameState.current_question_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      
      // Manche courante (si définie)
      gameState?.current_round_id
        ? supabase
            .from('rounds')
            .select('*')
            .eq('id', gameState.current_round_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      
      // Buzzers actifs
      gameState?.current_question_id && sessionId
        ? supabase
            .from('buzzer_attempts')
            .select('*, teams(*)')
            .eq('question_id', gameState.current_question_id)
            .eq('game_session_id', sessionId)
            .order('buzzed_at', { ascending: true })
        : Promise.resolve({ data: [] }),
      
      // Réponses actives
      gameState?.current_question_id && sessionId
        ? supabase
            .from('team_answers')
            .select('*')
            .eq('question_id', gameState.current_question_id)
            .eq('game_session_id', sessionId)
        : Promise.resolve({ data: [] }),
      
      // Finale (si active)
      gameState?.final_mode && gameState?.final_id
        ? supabase
            .from('finals')
            .select('*')
            .eq('id', gameState.final_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const snapshot: CompleteGameState = {
      gameState: gameState || null,
      teams: teams || [],
      currentQuestion: currentQuestion || null,
      currentRound: currentRound || null,
      buzzers: buzzers || [],
      answers: answers || [],
      final: final || null,
    };

    console.log('✅ [Snapshot] Récupéré:', {
      hasGameState: !!snapshot.gameState,
      teamsCount: snapshot.teams.length,
      hasQuestion: !!snapshot.currentQuestion,
      buzzersCount: snapshot.buzzers.length,
    });

    return snapshot;
  } catch (error) {
    console.error('❌ [Snapshot] Erreur:', error);
    throw error;
  }
}

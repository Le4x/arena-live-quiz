/**
 * Hooks React Query pour la gestion des données du jeu
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { GameSession, Team, Round, Question, GameState, BuzzerAttempt } from '@/types/game.types';

// ==================== QUERY KEYS ====================

export const queryKeys = {
  session: (id?: string) => ['session', id] as const,
  activeSessions: () => ['sessions', 'active'] as const,
  allSessions: () => ['sessions'] as const,
  teams: (sessionId?: string) => ['teams', sessionId] as const,
  team: (id: string) => ['team', id] as const,
  rounds: () => ['rounds'] as const,
  round: (id: string) => ['round', id] as const,
  questions: (roundId?: string) => ['questions', roundId] as const,
  question: (id: string) => ['question', id] as const,
  gameState: (sessionId?: string) => ['gameState', sessionId] as const,
  buzzers: (questionId?: string, sessionId?: string) => ['buzzers', questionId, sessionId] as const,
};

// ==================== SESSION HOOKS ====================

export const useActiveSession = () => {
  return useQuery({
    queryKey: queryKeys.activeSessions(),
    queryFn: async (): Promise<GameSession | null> => {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      return data as GameSession | null;
    },
    staleTime: 30000, // 30 secondes
  });
};

export const useSession = (id?: string) => {
  return useQuery({
    queryKey: queryKeys.session(id),
    queryFn: async (): Promise<GameSession | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as GameSession;
    },
    enabled: !!id,
  });
};

// ==================== TEAM HOOKS ====================

export const useTeams = (sessionId?: string) => {
  return useQuery({
    queryKey: queryKeys.teams(sessionId),
    queryFn: async (): Promise<Team[]> => {
      let query = supabase.from('teams').select('*').order('score', { ascending: false });

      if (sessionId) {
        query = query.eq('game_session_id', sessionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as Team[]) || [];
    },
    staleTime: 10000, // 10 secondes
  });
};

export const useTeam = (id?: string) => {
  return useQuery({
    queryKey: queryKeys.team(id!),
    queryFn: async (): Promise<Team | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

// ==================== ROUND HOOKS ====================

export const useRounds = () => {
  return useQuery({
    queryKey: queryKeys.rounds(),
    queryFn: async (): Promise<Round[]> => {
      const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data as Round[]) || [];
    },
  });
};

// ==================== QUESTION HOOKS ====================

export const useQuestions = (roundId?: string) => {
  return useQuery({
    queryKey: queryKeys.questions(roundId),
    queryFn: async (): Promise<Question[]> => {
      let query = supabase
        .from('questions')
        .select('*')
        .order('display_order', { ascending: true });

      if (roundId) {
        query = query.eq('round_id', roundId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as unknown as Question[]) || [];
    },
  });
};

export const useQuestion = (id?: string) => {
  return useQuery({
    queryKey: queryKeys.question(id!),
    queryFn: async (): Promise<Question | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as unknown as Question;
    },
    enabled: !!id,
  });
};

// ==================== GAME STATE HOOKS ====================

export const useGameState = (sessionId?: string) => {
  return useQuery({
    queryKey: queryKeys.gameState(sessionId),
    queryFn: async (): Promise<GameState | null> => {
      if (!sessionId) return null;

      const { data, error } = await supabase
        .from('game_state')
        .select('*')
        .eq('game_session_id', sessionId)
        .maybeSingle();

      if (error) throw error;
      return data as GameState | null;
    },
    enabled: !!sessionId,
    staleTime: 5000, // 5 secondes
  });
};

// ==================== BUZZER HOOKS ====================

export const useBuzzers = (questionId?: string, sessionId?: string) => {
  return useQuery({
    queryKey: queryKeys.buzzers(questionId, sessionId),
    queryFn: async (): Promise<BuzzerAttempt[]> => {
      if (!questionId || !sessionId) return [];

      const { data, error } = await supabase
        .from('buzzer_attempts')
        .select('*, teams(*)')
        .eq('question_id', questionId)
        .eq('game_session_id', sessionId)
        .order('buzzed_at', { ascending: true });

      if (error) throw error;
      return (data as BuzzerAttempt[]) || [];
    },
    enabled: !!questionId && !!sessionId,
    staleTime: 3000, // 3 secondes
  });
};

// ==================== MUTATIONS ====================

export const useUpdateGameState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, updates }: { sessionId: string; updates: Partial<GameState> }) => {
      const { error } = await supabase
        .from('game_state')
        .update(updates)
        .eq('game_session_id', sessionId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gameState(variables.sessionId) });
    },
  });
};

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, updates }: { teamId: string; updates: Partial<Team> }) => {
      const { error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', teamId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams() });
    },
  });
};

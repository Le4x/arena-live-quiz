/**
 * Store Zustand pour l'état du jeu
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { GameState, GameSession, Round, Question, Team } from '@/types/game.types';

interface GameStore {
  // État
  session: GameSession | null;
  gameState: GameState | null;
  currentRound: Round | null;
  currentQuestion: Question | null;
  teams: Team[];
  
  // Actions
  setSession: (session: GameSession | null) => void;
  setGameState: (state: GameState | null) => void;
  setCurrentRound: (round: Round | null) => void;
  setCurrentQuestion: (question: Question | null) => void;
  setTeams: (teams: Team[]) => void;
  updateTeam: (teamId: string, updates: Partial<Team>) => void;
  
  // Computed
  getTeamById: (id: string) => Team | undefined;
  getSortedTeams: () => Team[];
  getActiveTeams: () => Team[];
}

export const useGameStore = create<GameStore>()(
  devtools(
    (set, get) => ({
      // État initial
      session: null,
      gameState: null,
      currentRound: null,
      currentQuestion: null,
      teams: [],

      // Actions
      setSession: (session) => set({ session }, false, 'setSession'),
      
      setGameState: (gameState) => set({ gameState }, false, 'setGameState'),
      
      setCurrentRound: (currentRound) => set({ currentRound }, false, 'setCurrentRound'),
      
      setCurrentQuestion: (currentQuestion) => set({ currentQuestion }, false, 'setCurrentQuestion'),
      
      setTeams: (teams) => set({ teams }, false, 'setTeams'),
      
      updateTeam: (teamId, updates) => set((state) => ({
        teams: state.teams.map(team => 
          team.id === teamId ? { ...team, ...updates } : team
        )
      }), false, 'updateTeam'),

      // Computed
      getTeamById: (id) => {
        return get().teams.find(team => team.id === id);
      },

      getSortedTeams: () => {
        return [...get().teams].sort((a, b) => b.score - a.score);
      },

      getActiveTeams: () => {
        return get().teams.filter(team => team.is_active && !team.is_excluded);
      },
    }),
    { name: 'GameStore' }
  )
);

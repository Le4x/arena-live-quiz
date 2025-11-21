/**
 * GameEvents - Système d'événements temps-réel pour MusicArena
 * Gère tous les événements du jeu (buzzer reset, start question, etc.)
 */

import { getTransport, TransportPayload } from './Transport';

export type GameEventType = 
  | 'BUZZER_RESET'
  | 'START_QUESTION'
  | 'STOP_QUESTION'
  | 'SHOW_LEADERBOARD'
  | 'HIDE_LEADERBOARD'
  | 'PLAY_JINGLE'
  | 'SYNC_STATE'
  | 'RESET_ALL'
  | 'KICK_ALL'
  | 'KICK_TEAM'
  | 'WAITING_SHOW'
  | 'WAITING_HIDE'
  | 'TOGGLE_BUZZER'
  | 'REVEAL_ANSWER'
  | 'TEAM_BLOCKED'
  | 'SHOW_PUBLIC_VOTES'
  | 'HIDE_PUBLIC_VOTES'
  | 'JOKER_ACTIVATED';

export interface GameEvent {
  type: GameEventType;
  timestamp: number;
  data?: any;
}

export interface StartQuestionEvent extends GameEvent {
  type: 'START_QUESTION';
  data: {
    questionId: string;
    questionInstanceId: string;
    sessionId: string;
    timerDuration: number;
  };
}

export interface BuzzerResetEvent extends GameEvent {
  type: 'BUZZER_RESET';
  data: {
    questionInstanceId: string;
  };
}

export interface KickTeamEvent extends GameEvent {
  type: 'KICK_TEAM';
  data: {
    teamId: string;
  };
}

// Type pour tous les jokers disponibles
export type JokerType = 'fifty_fifty' | 'team_call' | 'public_vote' | 'double_points' | 'shield' | 'time_bonus' | 'second_chance';

export interface JokerActivatedEvent extends GameEvent {
  type: 'JOKER_ACTIVATED';
  data: {
    teamId: string;
    jokerType: JokerType;
    finalId: string;
    questionOptions?: any; // Options de la question pour le 50-50
    correctAnswer?: string; // Bonne réponse pour le 50-50
  };
}

type EventHandler<T extends GameEvent = GameEvent> = (event: T) => void;

/**
 * Gestionnaire d'événements temps-réel
 */
export class GameEventsManager {
  private transport = getTransport();
  private handlers: Map<GameEventType, Set<EventHandler>> = new Map();
  private unsubscribe: (() => void) | null = null;

  constructor(private channel: string = 'arena-runtime') {
    this.connect();
  }

  /**
   * Se connecter au canal d'événements
   */
  private connect(): void {
    this.unsubscribe = this.transport.subscribe(this.channel, (payload: TransportPayload) => {
      const event = payload as GameEvent;
      this.handleEvent(event);
    });
  }

  /**
   * Publier un événement
   */
  async emit<T extends GameEvent>(event: Omit<T, 'timestamp'>): Promise<void> {
    console.log('📤 [GameEvents.emit] Reçu:', event);
    const fullEvent = {
      ...event,
      timestamp: this.transport.now(),
    } as GameEvent;
    console.log('📤 [GameEvents.emit] Event complet:', fullEvent);
    await this.transport.publish(this.channel, fullEvent);
    console.log('📤 [GameEvents.emit] Publié sur canal:', this.channel);
  }

  /**
   * S'abonner à un type d'événement
   */
  on<T extends GameEvent>(type: GameEventType, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as EventHandler);

    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        handlers.delete(handler as EventHandler);
      }
    };
  }

  /**
   * Dispatcher un événement reçu
   */
  private handleEvent(event: GameEvent): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }
  }

  /**
   * Déconnecter
   */
  disconnect(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.handlers.clear();
  }
}

// Instance globale singleton
let globalEventsManager: GameEventsManager | null = null;

export const getGameEvents = (): GameEventsManager => {
  if (!globalEventsManager) {
    globalEventsManager = new GameEventsManager();
  }
  return globalEventsManager;
};

/**
 * Helpers pour émettre des événements courants
 */
export const gameEvents = {
  resetBuzzer: async (questionInstanceId: string) => {
    await getGameEvents().emit<BuzzerResetEvent>({
      type: 'BUZZER_RESET',
      data: { questionInstanceId },
    });
  },

  startQuestion: async (questionId: string, questionInstanceId: string, sessionId: string, timerDuration: number = 30) => {
    await getGameEvents().emit<StartQuestionEvent>({
      type: 'START_QUESTION',
      data: { questionId, questionInstanceId, sessionId, timerDuration },
    });
  },

  stopQuestion: async () => {
    await getGameEvents().emit({
      type: 'STOP_QUESTION',
    });
  },

  resetAll: async () => {
    await getGameEvents().emit({
      type: 'RESET_ALL',
    });
  },

  kickAll: async () => {
    await getGameEvents().emit({
      type: 'KICK_ALL',
    });
  },

  kickTeam: async (teamId: string) => {
    await getGameEvents().emit<KickTeamEvent>({
      type: 'KICK_TEAM',
      data: { teamId },
    });
  },

  showWaiting: async () => {
    await getGameEvents().emit({
      type: 'WAITING_SHOW',
    });
  },

  hideWaiting: async () => {
    await getGameEvents().emit({
      type: 'WAITING_HIDE',
    });
  },

  toggleBuzzer: async (isActive: boolean) => {
    await getGameEvents().emit({
      type: 'TOGGLE_BUZZER',
      data: { isActive },
    });
  },

  revealAnswer: async (teamId: string, isCorrect: boolean, correctAnswer?: string) => {
    await getGameEvents().emit({
      type: 'REVEAL_ANSWER',
      data: { teamId, isCorrect, correctAnswer },
    });
  },

  blockTeam: async (teamId: string) => {
    await getGameEvents().emit({
      type: 'TEAM_BLOCKED',
      data: { teamId },
    });
  },

  activateJoker: async (teamId: string, jokerType: JokerType, finalId: string, questionOptions?: any, correctAnswer?: string) => {
    console.log('🎮 [gameEvents.activateJoker] Appelé avec:', { teamId, jokerType, finalId, questionOptions, correctAnswer });
    await getGameEvents().emit({
      type: 'JOKER_ACTIVATED',
      data: { teamId, jokerType, finalId, questionOptions, correctAnswer },
    });
    console.log('🎮 [gameEvents.activateJoker] Emit terminé');
  },
};

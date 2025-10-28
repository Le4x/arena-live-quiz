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
  | 'SYNC_STATE';

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
  };
}

export interface BuzzerResetEvent extends GameEvent {
  type: 'BUZZER_RESET';
  data: {
    questionInstanceId: string;
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
    const fullEvent: GameEvent = {
      ...event,
      timestamp: this.transport.now(),
    };
    await this.transport.publish(this.channel, fullEvent);
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

  startQuestion: async (questionId: string, questionInstanceId: string, sessionId: string) => {
    await getGameEvents().emit<StartQuestionEvent>({
      type: 'START_QUESTION',
      data: { questionId, questionInstanceId, sessionId },
    });
  },

  stopQuestion: async () => {
    await getGameEvents().emit({
      type: 'STOP_QUESTION',
    });
  },
};

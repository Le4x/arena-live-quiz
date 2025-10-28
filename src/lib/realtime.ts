import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export interface GameState {
  sessionId: string | null;
  teams: Array<{ id: string; name: string; score: number; color?: string }>;
  question: {
    id: string;
    text: string;
    type: 'buzzer' | 'qcm' | 'texte';
    options?: string[];
  } | null;
  phase: 'idle' | 'playing' | 'locked';
  timer: { running: boolean; seconds: number };
  firstBuzz: string | null;
  buzzerLocked: boolean;
  showLeaderboard: boolean;
  showRoundIntro: boolean;
  currentRound: any;
  answers: any[];
}

type StateCallback = (state: GameState) => void;
type PartialCallback = (partial: Partial<GameState>) => void;
type BuzzCallback = (data: { teamId: string; ts: number }) => void;
type ScoreCallback = (data: { teamId: string; score: number }) => void;

const listeners: {
  fullState: StateCallback[];
  partial: PartialCallback[];
  buzzFirst: BuzzCallback[];
  buzzLate: BuzzCallback[];
  scoreUpdate: ScoreCallback[];
  locked: Array<() => void>;
  unlocked: Array<() => void>;
  connected: Array<() => void>;
  disconnected: Array<() => void>;
} = {
  fullState: [],
  partial: [],
  buzzFirst: [],
  buzzLate: [],
  scoreUpdate: [],
  locked: [],
  unlocked: [],
  connected: [],
  disconnected: []
};

export function connectRealtime(baseUrl: string) {
  if (socket?.connected) {
    console.log('✅ Déjà connecté');
    return socket;
  }

  console.log(`🔌 Connexion au serveur WebSocket: ${baseUrl}`);
  
  socket = io(baseUrl, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity
  });

  socket.on('connect', () => {
    console.log('✅ Connecté au serveur local');
    listeners.connected.forEach(cb => cb());
  });

  socket.on('disconnect', () => {
    console.log('❌ Déconnecté du serveur');
    listeners.disconnected.forEach(cb => cb());
  });

  socket.on('state:full', (state: GameState) => {
    console.log('📦 État complet reçu');
    listeners.fullState.forEach(cb => cb(state));
  });

  socket.on('state:update', (partial: Partial<GameState>) => {
    console.log('🔄 Mise à jour partielle');
    listeners.partial.forEach(cb => cb(partial));
  });

  socket.on('buzz:first', (data: { teamId: string; ts: number }) => {
    console.log('🔔 Premier buzz!', data);
    listeners.buzzFirst.forEach(cb => cb(data));
  });

  socket.on('buzz:late', (data: { teamId: string; ts: number }) => {
    console.log('⏱️ Buzz tardif', data);
    listeners.buzzLate.forEach(cb => cb(data));
  });

  socket.on('score:update', (data: { teamId: string; score: number }) => {
    listeners.scoreUpdate.forEach(cb => cb(data));
  });

  socket.on('regie:locked', () => {
    listeners.locked.forEach(cb => cb());
  });

  socket.on('regie:unlocked', () => {
    listeners.unlocked.forEach(cb => cb());
  });

  return socket;
}

// Listeners
export function onFullState(callback: StateCallback) {
  listeners.fullState.push(callback);
}

export function onPartial(callback: PartialCallback) {
  listeners.partial.push(callback);
}

export function onBuzzFirst(callback: BuzzCallback) {
  listeners.buzzFirst.push(callback);
}

export function onBuzzLate(callback: BuzzCallback) {
  listeners.buzzLate.push(callback);
}

export function onScoreUpdate(callback: ScoreCallback) {
  listeners.scoreUpdate.push(callback);
}

export function onLocked(callback: () => void) {
  listeners.locked.push(callback);
}

export function onUnlocked(callback: () => void) {
  listeners.unlocked.push(callback);
}

export function onConnected(callback: () => void) {
  listeners.connected.push(callback);
}

export function onDisconnected(callback: () => void) {
  listeners.disconnected.push(callback);
}

// Actions Régie
export function regieUpdate(partial: Partial<GameState>) {
  socket?.emit('regie:update', partial);
}

export function regieLock() {
  socket?.emit('regie:lock');
}

export function regieUnlock() {
  socket?.emit('regie:unlock');
}

export function regieScore(teamId: string, delta: number) {
  socket?.emit('regie:score', { teamId, delta });
}

export function regieTimer(action: 'start' | 'stop' | 'reset', seconds?: number) {
  socket?.emit('regie:timer', { action, seconds });
}

// Actions Client
export function clientBuzz(teamId: string) {
  socket?.emit('client:buzz', { teamId, ts: Date.now() });
}

export function clientAnswer(teamId: string, payload: any) {
  socket?.emit('client:answer', { teamId, payload });
}

// Gestion équipes
export function createTeam(team: any) {
  socket?.emit('team:create', { team });
}

export function updateTeam(teamId: string, updates: any) {
  socket?.emit('team:update', { teamId, updates });
}

export function getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
  if (!socket) return 'disconnected';
  if (socket.connected) return 'connected';
  return 'connecting';
}

export function disconnect() {
  socket?.disconnect();
  socket = null;
}

// Export/Import via API REST
export async function exportState(baseUrl: string): Promise<GameState> {
  const response = await fetch(`${baseUrl}/api/export`);
  return response.json();
}

export async function importState(baseUrl: string, state: GameState): Promise<void> {
  await fetch(`${baseUrl}/api/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state)
  });
}

/**
 * Transport - Interface abstraction pour Supabase / WebSocket LAN
 * Permet de switcher entre online (Supabase) et offline (LAN) sans changer le code
 */

export type TransportPayload = Record<string, any>;
export type TransportHandler = (payload: TransportPayload) => void;

export interface Transport {
  /**
   * Publier un message sur un canal
   */
  publish(channel: string, payload: TransportPayload): Promise<void>;

  /**
   * S'abonner à un canal
   * @returns Fonction de désabonnement
   */
  subscribe(channel: string, handler: TransportHandler): () => void;

  /**
   * Horloge synchronisée (timestamp ms)
   */
  now(): number;

  /**
   * Fermer la connexion
   */
  disconnect(): void;
}

/**
 * Implémentation Supabase (mode online par défaut)
 */
import { supabase } from "@/integrations/supabase/client";

export class SupabaseTransport implements Transport {
  private channels: Map<string, any> = new Map();
  private heartbeatInterval: number | null = null;
  private presenceChannel: any = null;

  async publish(channel: string, payload: TransportPayload): Promise<void> {
    const ch = this.getOrCreateChannel(channel);
    
    // S'assurer que le canal est souscrit
    if (ch.state !== 'joined') {
      await new Promise((resolve) => {
        ch.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            resolve(undefined);
          }
        });
      });
    }
    
    await ch.send({
      type: 'broadcast',
      event: 'message',
      payload,
    });
  }

  subscribe(channel: string, handler: TransportHandler): () => void {
    const ch = this.getOrCreateChannel(channel);
    
    ch.on('broadcast', { event: 'message' }, (data: any) => {
      handler(data.payload);
    }).subscribe();

    // Démarrer le heartbeat si pas déjà actif
    this.startHeartbeat(channel);

    return () => {
      supabase.removeChannel(ch);
      this.channels.delete(channel);
      this.stopHeartbeat();
    };
  }

  /**
   * Démarrer le heartbeat pour la présence (track toutes les 3s)
   */
  private startHeartbeat(sessionId: string): void {
    if (this.heartbeatInterval) return;

    // Créer canal de présence global
    this.presenceChannel = supabase.channel('presence:global');
    
    this.presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = this.presenceChannel.presenceState();
        console.log('👥 [Transport] Présence sync:', state);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          // Track immédiatement
          await this.presenceChannel.track({
            last_seen_at: Date.now(),
            online_at: new Date().toISOString(),
          });
        }
      });

    // Heartbeat toutes les 3 secondes
    this.heartbeatInterval = window.setInterval(async () => {
      if (this.presenceChannel) {
        await this.presenceChannel.track({
          last_seen_at: Date.now(),
          online_at: new Date().toISOString(),
        });
      }
    }, 3000);

    console.log('💓 [Transport] Heartbeat démarré');
  }

  /**
   * Arrêter le heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.presenceChannel) {
      supabase.removeChannel(this.presenceChannel);
      this.presenceChannel = null;
    }
    console.log('💔 [Transport] Heartbeat arrêté');
  }

  now(): number {
    return Date.now();
  }

  disconnect(): void {
    this.channels.forEach(ch => supabase.removeChannel(ch));
    this.channels.clear();
  }

  private getOrCreateChannel(name: string): any {
    if (!this.channels.has(name)) {
      const ch = supabase.channel(name);
      this.channels.set(name, ch);
    }
    return this.channels.get(name);
  }
}

/**
 * Implémentation WebSocket LAN (pour mode offline avec Socket.IO)
 * Utilise le serveur LAN local (server/index.ts)
 */
import { io, Socket } from 'socket.io-client';

export class LocalWSTransport implements Transport {
  private socket: Socket | null = null;
  private handlers: Map<string, Set<TransportHandler>> = new Map();
  private connected: boolean = false;

  constructor(serverUrl: string = 'ws://localhost:8787') {
    console.log('🌐 [LocalWSTransport] Connexion à', serverUrl);
    
    this.socket = io(serverUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ [LocalWSTransport] Connecté au serveur LAN');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('❌ [LocalWSTransport] Déconnecté du serveur LAN');
      this.connected = false;
    });

    this.socket.on('event', (data: any) => {
      console.log('📥 [LocalWSTransport] Événement reçu:', data);
      // Dispatcher aux handlers correspondants
      this.handlers.forEach((handlerSet, channel) => {
        handlerSet.forEach(handler => handler(data));
      });
    });
  }

  async publish(channel: string, payload: TransportPayload): Promise<void> {
    if (!this.socket || !this.connected) {
      console.warn('⚠️ [LocalWSTransport] Socket pas connecté');
      return;
    }

    console.log('📤 [LocalWSTransport] Envoi sur', channel, ':', payload);
    this.socket.emit('event', { room: channel, data: payload });
  }

  subscribe(channel: string, handler: TransportHandler): () => void {
    console.log('📡 [LocalWSTransport] Subscribe sur', channel);
    
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
      // Rejoindre la room sur le serveur
      if (this.socket) {
        this.socket.emit('join', channel);
      }
    }
    
    this.handlers.get(channel)!.add(handler);

    return () => {
      const handlers = this.handlers.get(channel);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(channel);
        }
      }
    };
  }

  now(): number {
    return Date.now();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.handlers.clear();
    this.connected = false;
  }
}

// Instance globale
let globalTransport: Transport | null = null;

export const getTransport = (mode: 'supabase' | 'local' = 'supabase'): Transport => {
  if (!globalTransport) {
    globalTransport = mode === 'supabase' 
      ? new SupabaseTransport() 
      : new LocalWSTransport();
  }
  return globalTransport;
};

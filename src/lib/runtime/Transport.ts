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

  async publish(channel: string, payload: TransportPayload): Promise<void> {
    const ch = this.getOrCreateChannel(channel);
    console.log('📡 [Transport.publish] Envoi sur canal', channel, ':', payload);
    
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
    console.log('📡 [Transport.publish] Envoyé');
  }

  subscribe(channel: string, handler: TransportHandler): () => void {
    const ch = this.getOrCreateChannel(channel);
    
    ch.on('broadcast', { event: 'message' }, (data: any) => {
      console.log('📥 [Transport.subscribe] Reçu sur canal', channel, ':', data.payload);
      handler(data.payload);
    }).subscribe();

    return () => {
      supabase.removeChannel(ch);
      this.channels.delete(channel);
    };
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
 * Implémentation WebSocket LAN (pour mode offline)
 * TODO: implémenter plus tard avec WebSocket natif
 */
export class LocalWSTransport implements Transport {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<TransportHandler>> = new Map();

  constructor(serverUrl: string = 'ws://localhost:8080') {
    this.ws = new WebSocket(serverUrl);
    this.ws.onmessage = (event) => {
      const { channel, payload } = JSON.parse(event.data);
      const handlers = this.handlers.get(channel);
      if (handlers) {
        handlers.forEach(h => h(payload));
      }
    };
  }

  async publish(channel: string, payload: TransportPayload): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ channel, payload }));
    }
  }

  subscribe(channel: string, handler: TransportHandler): () => void {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers.clear();
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

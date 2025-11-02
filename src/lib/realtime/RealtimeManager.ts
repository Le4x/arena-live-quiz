/**
 * Gestionnaire centralisé de connexions Real-time Supabase
 * Gère la reconnexion automatique, le heartbeat et les subscriptions
 */

import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ChannelConfig {
  name: string;
  table?: string;
  filter?: string;
  events?: ('INSERT' | 'UPDATE' | 'DELETE' | '*')[];
  callback: (payload: any) => void;
}

export class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private isReconnecting: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private onReconnectCallbacks: Set<() => void> = new Set();

  constructor() {
    this.setupVisibilityListener();
    this.startHeartbeat();
  }

  /**
   * Subscribe à un channel avec configuration
   */
  subscribe(config: ChannelConfig): () => void {
    const { name, table, filter, events = ['*'], callback } = config;

    // Si le channel existe déjà, le retourner
    if (this.channels.has(name)) {
      console.log(`📡 RealtimeManager: Channel ${name} existe déjà`);
      return () => this.unsubscribe(name);
    }

    console.log(`📡 RealtimeManager: Création du channel ${name}`);

    const channel = supabase.channel(name);

    // Si c'est un channel de table
    if (table) {
      const eventConfig: any = {
        event: events.length === 1 ? events[0] : '*',
        schema: 'public',
        table,
      };

      if (filter) {
        eventConfig.filter = filter;
      }

      channel.on('postgres_changes', eventConfig, (payload) => {
        console.log(`📥 RealtimeManager: ${name} reçu:`, payload);
        callback(payload);
      });
    } else {
      // Channel de broadcast
      channel.on('broadcast', { event: 'message' }, (data) => {
        console.log(`📥 RealtimeManager: ${name} broadcast reçu:`, data);
        callback(data);
      });
    }

    // Subscribe avec retry
    this.subscribeWithRetry(channel, name);

    this.channels.set(name, channel);

    return () => this.unsubscribe(name);
  }

  /**
   * Subscribe avec retry automatique
   */
  private async subscribeWithRetry(channel: RealtimeChannel, name: string, attempt: number = 1): Promise<void> {
    try {
      const status = await new Promise<string>((resolve) => {
        channel.subscribe((status) => resolve(status));
      });

      if (status === 'SUBSCRIBED') {
        console.log(`✅ RealtimeManager: ${name} connecté`);
        this.reconnectAttempts = 0;
      } else {
        throw new Error(`Subscription failed with status: ${status}`);
      }
    } catch (error) {
      console.error(`❌ RealtimeManager: Erreur ${name}, tentative ${attempt}:`, error);

      if (attempt < this.maxReconnectAttempts) {
        const delay = this.reconnectDelay * Math.pow(2, attempt - 1);
        console.log(`🔄 RealtimeManager: Nouvelle tentative dans ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        await this.subscribeWithRetry(channel, name, attempt + 1);
      } else {
        console.error(`❌ RealtimeManager: ${name} échec après ${attempt} tentatives`);
      }
    }
  }

  /**
   * Unsubscribe d'un channel
   */
  unsubscribe(name: string): void {
    const channel = this.channels.get(name);
    if (channel) {
      console.log(`📡 RealtimeManager: Déconnexion ${name}`);
      supabase.removeChannel(channel);
      this.channels.delete(name);
    }
  }

  /**
   * Unsubscribe de tous les channels
   */
  unsubscribeAll(): void {
    console.log(`📡 RealtimeManager: Déconnexion de tous les channels (${this.channels.size})`);
    this.channels.forEach((channel, name) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
  }

  /**
   * Reconnexion de tous les channels
   */
  async reconnectAll(): Promise<void> {
    if (this.isReconnecting) {
      console.log('🔄 RealtimeManager: Reconnexion déjà en cours...');
      return;
    }

    this.isReconnecting = true;
    console.log('🔄 RealtimeManager: Reconnexion de tous les channels...');

    // Sauvegarder les configs avant de déconnecter
    const channelConfigs = Array.from(this.channels.entries()).map(([name, channel]) => ({
      name,
      channel
    }));

    // Déconnecter tous les channels
    this.unsubscribeAll();

    // Attendre un peu pour stabiliser la connexion
    await new Promise(resolve => setTimeout(resolve, 500));

    // Notifier les listeners
    this.onReconnectCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('❌ RealtimeManager: Erreur callback reconnexion:', error);
      }
    });

    this.isReconnecting = false;
    console.log('✅ RealtimeManager: Reconnexion terminée');
  }

  /**
   * Ajouter un callback de reconnexion
   */
  onReconnect(callback: () => void): () => void {
    this.onReconnectCallbacks.add(callback);
    return () => this.onReconnectCallbacks.delete(callback);
  }

  /**
   * Configurer le listener de visibilité
   */
  private setupVisibilityListener(): void {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('📱 RealtimeManager: App revenue au premier plan');
        
        // Attendre un peu pour s'assurer que le réseau est stable
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Reconnexion
        await this.reconnectAll();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Focus listener
    window.addEventListener('focus', () => {
      if (document.visibilityState === 'visible') {
        handleVisibilityChange();
      }
    });
  }

  /**
   * Heartbeat pour maintenir la connexion active
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const channelCount = this.channels.size;
      const allChannels = supabase.getChannels();
      
      console.log(`💓 RealtimeManager: Heartbeat - ${channelCount} channels locaux, ${allChannels.length} channels Supabase`);

      // Vérifier si des channels sont déconnectés
      this.channels.forEach((channel, name) => {
        if (channel.state === 'closed') {
          console.warn(`⚠️ RealtimeManager: Channel ${name} fermé, reconnexion...`);
          this.reconnectAll();
        }
      });
    }, 30000); // Toutes les 30 secondes
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.unsubscribeAll();
    this.onReconnectCallbacks.clear();
  }

  /**
   * Obtenir les stats
   */
  getStats() {
    return {
      channelCount: this.channels.size,
      reconnectAttempts: this.reconnectAttempts,
      isReconnecting: this.isReconnecting,
      channels: Array.from(this.channels.keys())
    };
  }
}

// Instance singleton
let instance: RealtimeManager | null = null;

export const getRealtimeManager = (): RealtimeManager => {
  if (!instance) {
    instance = new RealtimeManager();
  }
  return instance;
};

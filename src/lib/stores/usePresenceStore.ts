/**
 * Presence Store - Gestion centralisée de la présence avec heartbeat + TTL
 * Détecte automatiquement les déconnexions après ~10-12s
 * 
 * Note: Utilise un Map simple sans Zustand pour éviter la dépendance
 */

import { useState, useEffect } from 'react';

export interface PresenceData {
  teamId?: string;
  role: 'team' | 'regie' | 'screen';
  last_seen_at: number;
}

const TTL_MS = 12000; // 12 secondes

/**
 * Store de présence global (singleton simple)
 */
class PresenceStore {
  private presences: Map<string, PresenceData> = new Map();

  updatePresence(key: string, data: PresenceData): void {
    this.presences.set(key, data);
  }

  removePresence(key: string): void {
    this.presences.delete(key);
  }

  isOnline(key: string, ttlMs: number = TTL_MS): boolean {
    const presence = this.presences.get(key);
    if (!presence) return false;
    const elapsed = Date.now() - presence.last_seen_at;
    return elapsed < ttlMs;
  }

  getConnectedTeams(): string[] {
    const teams: string[] = [];
    this.presences.forEach((data, key) => {
      if (data.role === 'team' && data.teamId && this.isOnline(key)) {
        teams.push(data.teamId);
      }
    });
    return teams;
  }

  getAllPresences(): Map<string, PresenceData> {
    return new Map(this.presences);
  }

  clear(): void {
    this.presences.clear();
  }
}

// Instance globale
let globalPresenceStore: PresenceStore | null = null;

export const getPresenceStore = (): PresenceStore => {
  if (!globalPresenceStore) {
    globalPresenceStore = new PresenceStore();
  }
  return globalPresenceStore;
};

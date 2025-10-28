import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GameStateCache {
  teams: any[];
  gameState: any;
  currentQuestion: any;
  timestamp: number;
}

export function useSupabaseResilience() {
  const [isOnline, setIsOnline] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const { toast } = useToast();

  // Gestion du cache localStorage
  const saveToCache = (key: string, data: any) => {
    try {
      const cache: GameStateCache = {
        ...data,
        timestamp: Date.now()
      };
      localStorage.setItem(`arena_cache_${key}`, JSON.stringify(cache));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  const loadFromCache = (key: string): any | null => {
    try {
      const cached = localStorage.getItem(`arena_cache_${key}`);
      if (cached) {
        const data = JSON.parse(cached);
        // Cache valide pendant 5 minutes
        if (Date.now() - data.timestamp < 5 * 60 * 1000) {
          return data;
        }
      }
    } catch (error) {
      console.error('Error loading from cache:', error);
    }
    return null;
  };

  const clearCache = () => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('arena_cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  // Surveillance de la connexion
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsReconnecting(false);
      toast({
        title: "✅ Connexion rétablie",
        description: "Synchronisation en cours...",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "⚠️ Connexion perdue",
        description: "Mode dégradé activé. Les données seront synchronisées à la reconnexion.",
        variant: "destructive"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Vérifier l'état initial
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Test périodique de la connexion Supabase
  useEffect(() => {
    const testConnection = async () => {
      try {
        const { error } = await supabase.from('game_state').select('id').limit(1);
        if (error) {
          console.error('Supabase connection error:', error);
          if (!isReconnecting) {
            setIsReconnecting(true);
            toast({
              title: "🔄 Reconnexion en cours...",
              description: "Tentative de reconnexion à la base de données",
            });
          }
        } else {
          if (isReconnecting) {
            setIsReconnecting(false);
            toast({
              title: "✅ Connexion rétablie",
              description: "Synchronisation réussie",
            });
          }
        }
      } catch (error) {
        console.error('Connection test error:', error);
      }
    };

    const interval = setInterval(testConnection, 3000);
    return () => clearInterval(interval);
  }, [isReconnecting, toast]);

  return {
    isOnline,
    isReconnecting,
    saveToCache,
    loadFromCache,
    clearCache
  };
}

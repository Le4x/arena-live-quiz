/**
 * Hook pour gérer la reconnexion automatique des channels Supabase
 * quand l'app revient au premier plan après une mise en veille
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeReconnectOptions {
  onReconnect?: () => void;
}

export const useRealtimeReconnect = (options?: UseRealtimeReconnectOptions) => {
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('📱 App revenue au premier plan - Reconnexion des channels...');
        
        // Attendre un peu pour s'assurer que le réseau est stable
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(async () => {
          // Fermer tous les anciens channels
          const allChannels = supabase.getChannels();
          console.log('🔌 Fermeture de', allChannels.length, 'channels');
          
          for (const channel of allChannels) {
            await supabase.removeChannel(channel);
          }
          
          // Callback pour que le composant parent recrée ses channels
          if (options?.onReconnect) {
            console.log('🔄 Reconnexion des channels...');
            options.onReconnect();
          }
        }, 500);
      }
    };

    // Écouter les changements de visibilité
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Écouter également les événements focus (quand l'utilisateur revient sur l'onglet)
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        handleVisibilityChange();
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [options?.onReconnect]);

  return {
    registerChannel: (channel: RealtimeChannel) => {
      channelsRef.current.push(channel);
    }
  };
};

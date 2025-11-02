/**
 * Hook pour gérer la connexion client
 */

import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/utils/logger';
import { getRealtimeManager } from '@/lib/realtime/RealtimeManager';

export const useClientConnection = (teamId?: string, teamName?: string) => {
  const realtimeManager = getRealtimeManager();

  // Track presence
  useEffect(() => {
    if (!teamId) return;

    logger.info('Client connecting', { teamId, teamName });

    // Subscribe to presence
    const unsubscribe = realtimeManager.subscribe({
      name: `client-presence-${teamId}`,
      callback: () => {
        // Presence updates
      },
    });

    // Update last_seen_at
    const updatePresence = async () => {
      await supabase
        .from('teams')
        .update({ 
          last_seen_at: new Date().toISOString(),
          is_active: true 
        })
        .eq('id', teamId);
    };

    updatePresence();
    const interval = setInterval(updatePresence, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
      
      // Mark as inactive
      supabase
        .from('teams')
        .update({ is_active: false })
        .eq('id', teamId);
    };
  }, [teamId, teamName, realtimeManager]);

  const disconnect = useCallback(async () => {
    if (!teamId) return;
    
    await supabase
      .from('teams')
      .update({ 
        is_active: false,
        connected_device_id: null 
      })
      .eq('id', teamId);
      
    logger.info('Client disconnected', { teamId });
  }, [teamId]);

  return {
    disconnect,
  };
};

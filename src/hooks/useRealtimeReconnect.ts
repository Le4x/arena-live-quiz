/**
 * Hook de compatibilité pour utiliser le nouveau RealtimeManager
 */

import { useEffect } from 'react';
import { getRealtimeManager } from '@/lib/realtime/RealtimeManager';

interface UseRealtimeReconnectOptions {
  onReconnect?: () => void;
}

export const useRealtimeReconnect = (options?: UseRealtimeReconnectOptions) => {
  const realtimeManager = getRealtimeManager();

  useEffect(() => {
    if (options?.onReconnect) {
      const unsub = realtimeManager.onReconnect(options.onReconnect);
      return unsub;
    }
  }, [options?.onReconnect, realtimeManager]);

  return {};
};

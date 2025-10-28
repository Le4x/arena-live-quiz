import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const SupabaseNetworkStatus = () => {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setStatus('connected');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const testConnection = async () => {
      if (!isOnline) {
        setStatus('disconnected');
        return;
      }

      try {
        const { error } = await supabase.from('game_state').select('id').limit(1);
        if (error) {
          setStatus('reconnecting');
        } else {
          setStatus('connected');
        }
      } catch (error) {
        setStatus('reconnecting');
      }
    };

    const interval = setInterval(testConnection, 3000);
    testConnection();

    return () => clearInterval(interval);
  }, [isOnline]);

  if (status === 'connected') return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center font-semibold ${
      status === 'reconnecting' ? 'bg-yellow-500/90 text-yellow-950' : 'bg-red-500/90 text-white'
    }`}>
      <div className="flex items-center justify-center gap-2">
        {status === 'reconnecting' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Tentative de reconnexion...
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            Connexion perdue - Mode dégradé
          </>
        )}
      </div>
    </div>
  );
};

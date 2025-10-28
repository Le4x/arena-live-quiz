import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { getConnectionStatus, onConnected, onDisconnected } from '@/lib/realtime';

export const NetworkStatus = () => {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');

  useEffect(() => {
    setStatus(getConnectionStatus());

    const updateStatus = () => setStatus(getConnectionStatus());
    
    onConnected(updateStatus);
    onDisconnected(updateStatus);

    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  if (status === 'connected') return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center font-semibold ${
      status === 'connecting' ? 'bg-yellow-500/90 text-yellow-950' : 'bg-red-500/90 text-white'
    }`}>
      <div className="flex items-center justify-center gap-2">
        {status === 'connecting' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Tentative de reconnexion au serveur local...
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            Déconnecté du serveur local
          </>
        )}
      </div>
    </div>
  );
};

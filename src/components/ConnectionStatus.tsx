import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

type ConnectionState = 'online' | 'offline' | 'reconnecting';

export const ConnectionStatus = () => {
  const [state, setState] = useState<ConnectionState>('online');
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => {
      setState('online');
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = () => {
      setState('offline');
      setShowStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor Supabase realtime status
    const channel = supabase.channel('connection-monitor');

    channel
      .on('system', {}, (payload) => {
        if (payload.status === 'CHANNEL_ERROR') {
          setState('reconnecting');
          setShowStatus(true);
        } else if (payload.status === 'SUBSCRIBED') {
          setState('online');
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusConfig = () => {
    switch (state) {
      case 'online':
        return {
          icon: Wifi,
          text: 'Connecté',
          color: 'text-green-500',
          bg: 'bg-green-500/10',
          border: 'border-green-500/30',
        };
      case 'offline':
        return {
          icon: WifiOff,
          text: 'Hors ligne',
          color: 'text-red-500',
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
        };
      case 'reconnecting':
        return {
          icon: Cloud,
          text: 'Reconnexion...',
          color: 'text-yellow-500',
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/30',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  // Always show a subtle indicator, expand on state change
  return (
    <>
      {/* Persistent indicator */}
      <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full ${config.bg} ${config.border} border backdrop-blur-sm transition-all`}>
        <Icon className={`w-4 h-4 ${config.color} ${state === 'reconnecting' ? 'animate-pulse' : ''}`} />
        {state !== 'online' && (
          <span className={`text-xs font-medium ${config.color}`}>
            {config.text}
          </span>
        )}
      </div>

      {/* Toast notification on state change */}
      <AnimatePresence>
        {showStatus && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className={`fixed top-16 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg ${config.bg} ${config.border} border-2 backdrop-blur-md shadow-lg`}
          >
            <Icon className={`w-5 h-5 ${config.color} ${state === 'reconnecting' ? 'animate-pulse' : ''}`} />
            <span className={`text-sm font-semibold ${config.color}`}>
              {config.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

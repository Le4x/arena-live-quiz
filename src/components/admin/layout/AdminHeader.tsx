/**
 * AdminHeader - En-tête de l'interface admin
 * Affiche les infos de session et stats rapides
 */

import { motion } from 'framer-motion';
import { Users, Monitor, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminHeaderProps {
  sessionName?: string;
  connectedTeamsCount?: number;
}

export const AdminHeader = ({ sessionName, connectedTeamsCount = 0 }: AdminHeaderProps) => {
  const [isConnected, setIsConnected] = useState(true);

  // Monitorer la connexion Supabase
  useEffect(() => {
    const channel = supabase.channel('connection-status');

    channel
      .on('system', { event: 'offline' }, () => setIsConnected(false))
      .on('system', { event: 'online' }, () => setIsConnected(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <header className="bg-card/80 backdrop-blur-xl border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Session Info */}
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight">
              {sessionName || 'Aucune session active'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Régie de contrôle professionnelle
            </p>
          </div>
        </div>

        {/* Stats & Status */}
        <div className="flex items-center gap-3">
          {/* Équipes connectées */}
          <motion.div
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30"
            whileHover={{ scale: 1.05 }}
          >
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">
              {connectedTeamsCount} équipe{connectedTeamsCount > 1 ? 's' : ''}
            </span>
          </motion.div>

          {/* Statut connexion */}
          <motion.div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
              isConnected
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
            animate={{
              opacity: isConnected ? 1 : [1, 0.5, 1],
            }}
            transition={{
              duration: 1,
              repeat: isConnected ? 0 : Infinity,
            }}
          >
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-sm font-semibold ${
              isConnected ? 'text-green-600' : 'text-red-600'
            }`}>
              {isConnected ? 'Connecté' : 'Hors ligne'}
            </span>
          </motion.div>

          {/* Écran actif */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 border border-accent/30">
            <Monitor className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold">Écran TV actif</span>
          </div>
        </div>
      </div>
    </header>
  );
};

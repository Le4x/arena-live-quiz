/**
 * WaitingScreen - Écran d'attente entre les rounds
 */

import { motion } from 'framer-motion';
import { Users, Wifi } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  color: string;
}

interface WaitingScreenProps {
  sessionName?: string;
  connectedTeams: Team[];
}

export const WaitingScreen = ({ sessionName, connectedTeams }: WaitingScreenProps) => {
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center overflow-hidden">
      {/* Background particles - plus subtiles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary/10 rounded-full blur-sm"
            initial={{ 
              x: Math.random() * window.innerWidth,
              y: -20,
              opacity: 0.3,
            }}
            animate={{
              y: window.innerHeight + 20,
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: Math.random() * 15 + 15,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* Halos lumineux pulsants */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl"
        animate={{
          opacity: [0.3, 0.5, 0.3],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-secondary/5 blur-3xl"
        animate={{
          opacity: [0.3, 0.5, 0.3],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      <div className="relative z-10 text-center space-y-16 px-8 w-full max-w-7xl">
        {/* Logo - Centré et grand */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-9xl font-black bg-gradient-arena bg-clip-text text-transparent drop-shadow-2xl mb-8">
            {sessionName || 'ARENA'}
          </h1>
          <p className="text-3xl text-muted-foreground font-medium">
            En attente du début de la partie...
          </p>
        </motion.div>

        {/* Liste des équipes connectées */}
        {connectedTeams.length > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-center gap-3 mb-8">
              <Wifi className="w-8 h-8 text-primary animate-pulse" />
              <h2 className="text-3xl font-bold text-primary">
                {connectedTeams.length} équipe{connectedTeams.length > 1 ? 's' : ''} connectée{connectedTeams.length > 1 ? 's' : ''}
              </h2>
            </div>

            {/* Grille des équipes */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto px-4">
              {connectedTeams.map((team, index) => (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + index * 0.05, duration: 0.3 }}
                  className="bg-card/70 backdrop-blur-xl rounded-2xl p-4 border-2 hover:scale-105 transition-transform"
                  style={{ borderColor: team.color }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex-shrink-0 animate-pulse"
                      style={{ backgroundColor: team.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lg truncate" title={team.name}>
                        {team.name}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-green-500">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Connecté
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Message si aucune équipe */}
        {connectedTeams.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-2xl text-muted-foreground"
          >
            Aucune équipe connectée pour le moment
          </motion.div>
        )}

        {/* Pulse central */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          animate={{
            opacity: [0.05, 0.15, 0.05],
            scale: [0.95, 1.05, 0.95],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="w-[600px] h-[600px] rounded-full bg-gradient-arena blur-3xl" />
        </motion.div>
      </div>
    </div>
  );
};
/**
 * WaitingScreen - Écran d'attente entre les rounds
 */

import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

interface WaitingScreenProps {
  sessionName?: string;
  connectedTeams: number;
  totalTeams: number;
}

export const WaitingScreen = ({ sessionName, connectedTeams, totalTeams }: WaitingScreenProps) => {
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center">
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

      <div className="relative z-10 text-center space-y-16 px-8">
        {/* Logo - Centré et grand */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-9xl font-black bg-gradient-arena bg-clip-text text-transparent drop-shadow-2xl">
            {sessionName || 'ARENA'}
          </h1>
        </motion.div>

        {/* Pulse central */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          animate={{
            opacity: [0.1, 0.3, 0.1],
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

      {/* Compteur discret en bas */}
      {connectedTeams > 0 && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-20"
        >
          <div className="bg-card/70 backdrop-blur-xl rounded-full px-6 py-3 border border-primary/20 flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-lg font-bold text-foreground">
              {connectedTeams} équipe{connectedTeams > 1 ? 's' : ''}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
};
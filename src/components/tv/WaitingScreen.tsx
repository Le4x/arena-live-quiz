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
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center">
      {/* Background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 bg-primary/20 rounded-full"
            initial={{ 
              x: Math.random() * window.innerWidth,
              y: -20,
            }}
            animate={{
              y: window.innerHeight + 20,
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center space-y-12 px-8">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-8xl font-black bg-gradient-arena bg-clip-text text-transparent drop-shadow-2xl">
            {sessionName || 'ARENA'}
          </h1>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="space-y-4"
        >
          <p className="text-4xl font-bold text-foreground">
            Scannez le QR code pour rejoindre la partie
          </p>
          <p className="text-2xl text-muted-foreground">
            En attente du début du jeu...
          </p>
        </motion.div>

        {/* Teams counter */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, type: "spring" }}
          className="inline-flex items-center gap-4 bg-card/90 backdrop-blur-xl rounded-full px-12 py-6 border-2 border-primary/30"
        >
          <Users className="w-12 h-12 text-primary" />
          <div className="text-left">
            <div className="text-5xl font-black text-primary">
              {connectedTeams}/{totalTeams}
            </div>
            <div className="text-lg text-muted-foreground">
              équipes connectées
            </div>
          </div>
        </motion.div>

        {/* Pulse animation */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          animate={{
            opacity: [0.2, 0.4, 0.2],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="w-96 h-96 rounded-full bg-gradient-arena blur-3xl" />
        </motion.div>
      </div>
    </div>
  );
};
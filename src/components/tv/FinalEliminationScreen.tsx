import { motion, AnimatePresence } from "framer-motion";
import { Skull, Trophy, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface FinalEliminationScreenProps {
  eliminatedTeam: {
    id: string;
    name: string;
    color: string;
    score: number;
    rank: number;
  };
  remainingTeams: number;
  onComplete?: () => void;
}

export const FinalEliminationScreen = ({
  eliminatedTeam,
  remainingTeams,
  onComplete
}: FinalEliminationScreenProps) => {
  const [phase, setPhase] = useState<'dramatic' | 'reveal' | 'farewell'>('dramatic');

  useEffect(() => {
    // Phase dramatique (suspense)
    const timer1 = setTimeout(() => setPhase('reveal'), 2000);
    // Phase révélation
    const timer2 = setTimeout(() => setPhase('farewell'), 4000);
    // Fin de l'animation
    const timer3 = setTimeout(() => onComplete?.(), 6000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 overflow-hidden">
      {/* Fond dramatique avec particules */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-red-500 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: 0
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
              opacity: [0, 0.8, 0],
              scale: [0, 1.5, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      {/* Rayons lumineux */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${eliminatedTeam.color}20 0%, transparent 70%)`
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      <AnimatePresence mode="wait">
        {phase === 'dramatic' && (
          <motion.div
            key="dramatic"
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Skull className="w-32 h-32 text-red-500 mx-auto" />
            </motion.div>
            <motion.h1
              className="text-6xl font-black text-red-500 mt-6"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              ÉLIMINATION...
            </motion.h1>
          </motion.div>
        )}

        {phase === 'reveal' && (
          <motion.div
            key="reveal"
            className="text-center"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 15 }}
          >
            {/* Croix d'élimination */}
            <motion.div
              className="relative mb-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              <div
                className="w-40 h-40 rounded-full mx-auto border-8 flex items-center justify-center"
                style={{
                  borderColor: eliminatedTeam.color,
                  backgroundColor: `${eliminatedTeam.color}30`
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <XCircle className="w-24 h-24 text-red-500" />
                </motion.div>
              </div>
            </motion.div>

            {/* Nom de l'équipe */}
            <motion.h1
              className="text-7xl font-black text-white mb-4"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{
                textShadow: `0 0 30px ${eliminatedTeam.color}`
              }}
            >
              {eliminatedTeam.name}
            </motion.h1>

            <motion.div
              className="text-3xl text-red-400 font-bold mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              EST ÉLIMINÉ(E) !
            </motion.div>

            <motion.div
              className="flex items-center justify-center gap-4 text-2xl text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <span>Score final:</span>
              <span className="text-white font-bold">{eliminatedTeam.score} pts</span>
              <span className="text-gray-500">|</span>
              <span>Classement:</span>
              <span className="text-amber-400 font-bold">#{eliminatedTeam.rank}</span>
            </motion.div>
          </motion.div>
        )}

        {phase === 'farewell' && (
          <motion.div
            key="farewell"
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -100 }}
          >
            <motion.div
              className="text-6xl mb-8"
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              👋
            </motion.div>

            <h2 className="text-5xl font-bold text-white mb-4">
              Au revoir <span style={{ color: eliminatedTeam.color }}>{eliminatedTeam.name}</span>
            </h2>

            <motion.div
              className="mt-8 flex items-center justify-center gap-3 text-3xl text-green-400"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
            >
              <Trophy className="w-10 h-10" />
              <span className="font-bold">
                Il reste {remainingTeams} équipe{remainingTeams > 1 ? 's' : ''} en lice !
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barre de progression */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-1/2">
        <motion.div
          className="h-2 bg-red-500 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 6, ease: "linear" }}
        />
      </div>
    </div>
  );
};

export default FinalEliminationScreen;

/**
 * JingleReveal - Animation de révélation bonne/mauvaise réponse
 * Style TV show avec effets dramatiques (10s fixes, pas de countdown)
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface JingleRevealProps {
  result: 'correct' | 'incorrect';
  onComplete?: () => void;
  duration?: number;
}

export const JingleReveal = ({ result, onComplete, duration = 12000 }: JingleRevealProps) => {
  const isCorrect = result === 'correct';

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 90 }}
        transition={{ 
          type: "spring", 
          stiffness: 200, 
          damping: 15 
        }}
        className={`fixed inset-0 z-50 flex items-center justify-center ${
          isCorrect 
            ? 'bg-gradient-to-br from-green-500/90 to-emerald-600/90' 
            : 'bg-gradient-to-br from-red-500/90 to-rose-600/90'
        }`}
      >
        {/* Particles explosion */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className={`absolute w-4 h-4 ${
                isCorrect ? 'bg-yellow-300' : 'bg-orange-300'
              } rounded-full`}
              initial={{ 
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                scale: 0,
              }}
              animate={{
                x: window.innerWidth / 2 + (Math.random() - 0.5) * 800,
                y: window.innerHeight / 2 + (Math.random() - 0.5) * 600,
                scale: [0, 1.5, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 1.5,
                ease: "easeOut",
                delay: Math.random() * 0.3,
              }}
            />
          ))}
        </div>

        {/* Main content */}
        <div className="relative z-10 text-center">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ 
              scale: [0, 1.2, 1],
              rotate: [0, 360, 360] 
            }}
            transition={{ 
              duration: 0.8,
              times: [0, 0.6, 1] 
            }}
          >
            {isCorrect ? (
              <Check className="w-64 h-64 mx-auto text-white drop-shadow-2xl" strokeWidth={3} />
            ) : (
              <X className="w-64 h-64 mx-auto text-white drop-shadow-2xl" strokeWidth={3} />
            )}
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12 space-y-6"
          >
            <motion.h1 
              className="text-9xl font-black text-white drop-shadow-2xl"
              animate={{ 
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                duration: 0.5,
                repeat: Infinity,
                repeatDelay: 0.5,
              }}
            >
              {isCorrect ? 'BONNE' : 'MAUVAISE'}
            </motion.h1>
            <motion.h2 
              className="text-8xl font-black text-white drop-shadow-2xl"
              animate={{ 
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                duration: 0.5,
                repeat: Infinity,
                repeatDelay: 0.5,
                delay: 0.1,
              }}
            >
              RÉPONSE !
            </motion.h2>
          </motion.div>

          {/* Pulse rings */}
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border-8 border-white"
              initial={{ scale: 0, opacity: 1 }}
              animate={{ 
                scale: 3,
                opacity: 0 
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                delay,
                ease: "easeOut" 
              }}
            />
          ))}
        </div>

        {/* Effet lumineux pulsé */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className={`w-96 h-96 rounded-full blur-3xl ${
            isCorrect ? 'bg-yellow-400/50' : 'bg-orange-400/50'
          }`} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
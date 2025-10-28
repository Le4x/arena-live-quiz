/**
 * JingleRoundIntro - Animation d'intro de manche style TV
 * Transition cinématique avec logo, titre, countdown
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface JingleRoundIntroProps {
  roundTitle: string;
  roundNumber?: number;
  onComplete?: () => void;
  duration?: number;
}

export const JingleRoundIntro = ({ 
  roundTitle, 
  roundNumber,
  onComplete, 
  duration = 10000 
}: JingleRoundIntroProps) => {
  const [countdown, setCountdown] = useState(Math.floor(duration / 1000));

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, duration);

    const interval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [duration, onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20"
      >
        {/* Background particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-primary/30 rounded-full"
              initial={{ 
                x: Math.random() * window.innerWidth,
                y: -20,
                scale: Math.random() * 0.5 + 0.5,
              }}
              animate={{
                y: window.innerHeight + 20,
                rotate: Math.random() * 360,
              }}
              transition={{
                duration: Math.random() * 5 + 5,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          ))}
        </div>

        {/* Main content */}
        <div className="relative z-10 text-center space-y-12 px-8">
          {/* Logo ARENA */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 20,
              delay: 0.2 
            }}
          >
            <h1 className="text-9xl font-black bg-gradient-arena bg-clip-text text-transparent drop-shadow-2xl">
              ARENA
            </h1>
          </motion.div>

          {/* Round number */}
          {roundNumber && (
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-6xl font-bold text-primary animate-pulse-glow"
            >
              MANCHE {roundNumber}
            </motion.div>
          )}

          {/* Round title */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 blur-xl bg-gradient-arena opacity-50" />
            <h2 className="relative text-7xl font-black text-foreground tracking-wider uppercase">
              {roundTitle}
            </h2>
          </motion.div>

          {/* Countdown circle */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.2, type: "spring" }}
            className="relative mx-auto w-32 h-32"
          >
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-muted opacity-20"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                className="text-primary"
                initial={{ pathLength: 1 }}
                animate={{ pathLength: 0 }}
                transition={{ duration: duration / 1000, ease: "linear" }}
                style={{
                  strokeDasharray: "283",
                  strokeDashoffset: 0,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.span 
                key={countdown}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-5xl font-black text-primary"
              >
                {countdown}
              </motion.span>
            </div>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-2xl text-muted-foreground font-light"
          >
            Préparez-vous...
          </motion.p>
        </div>

        {/* Bottom light beams */}
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-primary/20 to-transparent pointer-events-none" />
      </motion.div>
    </AnimatePresence>
  );
};

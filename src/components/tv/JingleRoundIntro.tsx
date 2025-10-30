/**
 * JingleRoundIntro - Animation d'intro de manche style TV premium
 * Transition cinématique avec logo, titre, audio et effets avancés
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface JingleRoundIntroProps {
  roundTitle: string;
  roundNumber?: number;
  sessionName?: string;
  jingleUrl?: string;
  onComplete?: () => void;
  duration?: number;
}

export const JingleRoundIntro = ({ 
  roundTitle, 
  roundNumber,
  sessionName = "ARENA",
  jingleUrl,
  onComplete, 
  duration = 6000 
}: JingleRoundIntroProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Lecture de l'audio du jingle
    if (jingleUrl) {
      const audio = new Audio(jingleUrl);
      audioRef.current = audio;
      audio.volume = 1;
      audio.play().catch(err => console.log('Could not play jingle:', err));
    }

    // Timer pour le fondu et la fin
    const fadeStartTime = duration - 1000; // Démarrer le fondu 1s avant la fin
    const fadeTimer = setTimeout(() => {
      if (audioRef.current) {
        // Fondu progressif sur 1 seconde
        const fadeInterval = setInterval(() => {
          if (audioRef.current && audioRef.current.volume > 0.05) {
            audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.05);
          } else {
            clearInterval(fadeInterval);
          }
        }, 50);
      }
    }, fadeStartTime);

    const completeTimer = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [duration, onComplete, jingleUrl]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.15) 0%, hsl(var(--background)) 50%, hsl(var(--secondary) / 0.2) 100%)'
        }}
      >
        {/* Animated gradient overlay */}
        <motion.div 
          className="absolute inset-0"
          animate={{
            background: [
              'radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.3) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 50%, hsl(var(--secondary) / 0.3) 0%, transparent 50%)',
              'radial-gradient(circle at 50% 80%, hsl(var(--accent) / 0.3) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.3) 0%, transparent 50%)',
            ]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Premium light rays */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`ray-${i}`}
            className="absolute top-1/2 left-1/2 w-1 origin-left"
            style={{
              height: '150vh',
              background: `linear-gradient(to bottom, transparent, hsl(var(--primary) / 0.1), transparent)`,
              transform: `rotate(${i * 45}deg)`,
            }}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ 
              scaleY: [0, 1, 1, 0],
              opacity: [0, 0.6, 0.6, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}

        {/* Enhanced particles with depth */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: Math.random() * 4 + 2,
                height: Math.random() * 4 + 2,
                background: i % 3 === 0 
                  ? 'hsl(var(--primary) / 0.4)' 
                  : i % 3 === 1 
                  ? 'hsl(var(--secondary) / 0.4)'
                  : 'hsl(var(--accent) / 0.4)',
                boxShadow: `0 0 ${Math.random() * 20 + 10}px currentColor`,
              }}
              initial={{ 
                x: Math.random() * window.innerWidth,
                y: -20,
                scale: Math.random() * 0.5 + 0.5,
                opacity: 0
              }}
              animate={{
                y: window.innerHeight + 20,
                x: Math.random() * window.innerWidth,
                rotate: Math.random() * 720,
                opacity: [0, 1, 1, 0],
                scale: [Math.random() * 0.5 + 0.5, Math.random() * 1.5 + 1, 0]
              }}
              transition={{
                duration: Math.random() * 4 + 3,
                repeat: Infinity,
                ease: "linear",
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>

        {/* Main content with premium animations */}
        <div className="relative z-10 text-center space-y-8 px-8 max-w-6xl">
          {/* Logo avec nom de session */}
          <motion.div
            initial={{ scale: 0, rotateY: -180, z: -200 }}
            animate={{ 
              scale: 1, 
              rotateY: 0,
              z: 0
            }}
            transition={{ 
              type: "spring", 
              stiffness: 150, 
              damping: 15,
              delay: 0.1 
            }}
            style={{ perspective: 1000 }}
          >
            <motion.h1 
              className="text-[12rem] font-black tracking-tighter leading-none"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--accent)))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 30px hsl(var(--primary) / 0.5)) drop-shadow(0 0 60px hsl(var(--secondary) / 0.3))',
              }}
              animate={{
                filter: [
                  'drop-shadow(0 0 30px hsl(var(--primary) / 0.5)) drop-shadow(0 0 60px hsl(var(--secondary) / 0.3))',
                  'drop-shadow(0 0 40px hsl(var(--primary) / 0.7)) drop-shadow(0 0 80px hsl(var(--secondary) / 0.5))',
                  'drop-shadow(0 0 30px hsl(var(--primary) / 0.5)) drop-shadow(0 0 60px hsl(var(--secondary) / 0.3))',
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              {sessionName}
            </motion.h1>
          </motion.div>

          {/* Séparateur lumineux animé */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="relative h-1 mx-auto max-w-md"
          >
            <motion.div 
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), hsl(var(--secondary)), transparent)',
              }}
              animate={{
                opacity: [0.5, 1, 0.5],
                boxShadow: [
                  '0 0 20px hsl(var(--primary) / 0.5)',
                  '0 0 40px hsl(var(--primary) / 0.8)',
                  '0 0 20px hsl(var(--primary) / 0.5)',
                ]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>

          {/* Round number avec effet premium */}
          {roundNumber && (
            <motion.div
              initial={{ x: -100, opacity: 0, scale: 0.5 }}
              animate={{ 
                x: 0, 
                opacity: 1,
                scale: 1
              }}
              transition={{ 
                delay: 0.5,
                type: "spring",
                stiffness: 200
              }}
            >
              <motion.div 
                className="inline-block text-7xl font-black px-12 py-4 rounded-2xl relative"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--secondary) / 0.2))',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid hsl(var(--primary) / 0.3)',
                  boxShadow: '0 0 40px hsl(var(--primary) / 0.3), inset 0 0 40px hsl(var(--primary) / 0.1)',
                }}
                animate={{
                  boxShadow: [
                    '0 0 40px hsl(var(--primary) / 0.3), inset 0 0 40px hsl(var(--primary) / 0.1)',
                    '0 0 60px hsl(var(--primary) / 0.5), inset 0 0 60px hsl(var(--primary) / 0.2)',
                    '0 0 40px hsl(var(--primary) / 0.3), inset 0 0 40px hsl(var(--primary) / 0.1)',
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="relative z-10 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  MANCHE {roundNumber}
                </span>
              </motion.div>
            </motion.div>
          )}

          {/* Round title avec effet spectaculaire */}
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ 
              delay: 0.7,
              type: "spring",
              stiffness: 150
            }}
            className="relative py-8"
          >
            {/* Glow background */}
            <motion.div 
              className="absolute inset-0 blur-3xl rounded-full"
              style={{
                background: 'radial-gradient(ellipse, hsl(var(--primary) / 0.4), hsl(var(--secondary) / 0.3), transparent)',
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.6, 0.8, 0.6]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            
            {/* Title */}
            <h2 className="relative text-8xl font-black tracking-tight uppercase leading-tight px-8"
                style={{
                  color: 'hsl(var(--foreground))',
                  textShadow: '0 0 20px hsl(var(--primary) / 0.5), 0 0 40px hsl(var(--secondary) / 0.3), 0 2px 4px rgba(0,0,0,0.5)',
                }}>
              {roundTitle}
            </h2>

            {/* Decorative corner elements */}
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-16 h-16 border-primary"
                style={{
                  [i < 2 ? 'top' : 'bottom']: 0,
                  [i % 2 === 0 ? 'left' : 'right']: 0,
                  borderTopWidth: i < 2 ? 3 : 0,
                  borderBottomWidth: i >= 2 ? 3 : 0,
                  borderLeftWidth: i % 2 === 0 ? 3 : 0,
                  borderRightWidth: i % 2 === 1 ? 3 : 0,
                  boxShadow: '0 0 20px hsl(var(--primary) / 0.5)',
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ 
                  delay: 1 + i * 0.1,
                  opacity: { duration: 2, repeat: Infinity }
                }}
              />
            ))}
          </motion.div>

          {/* Subtitle avec effet élégant */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: [0, 1, 1, 0.7], y: 0 }}
            transition={{ 
              delay: 1.2,
              opacity: { duration: 3, times: [0, 0.3, 0.7, 1] }
            }}
            className="text-3xl font-light tracking-wide"
            style={{
              color: 'hsl(var(--muted-foreground))',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            }}
          >
            Préparez-vous...
          </motion.p>
        </div>

        {/* Bottom elegant gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-96 pointer-events-none"
             style={{
               background: 'linear-gradient(to top, hsl(var(--primary) / 0.3), hsl(var(--secondary) / 0.2), transparent)',
             }} />
        
        {/* Top elegant gradient */}
        <div className="absolute top-0 left-0 right-0 h-96 pointer-events-none"
             style={{
               background: 'linear-gradient(to bottom, hsl(var(--background) / 0.8), transparent)',
             }} />
      </motion.div>
    </AnimatePresence>
  );
};

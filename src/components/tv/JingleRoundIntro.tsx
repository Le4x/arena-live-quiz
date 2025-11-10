/**
 * JingleRoundIntro - Animation d'intro de manche style TV premium
 * Design moderne et épuré pour un look professionnel
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

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
    const fadeStartTime = duration - 1000;
    const fadeTimer = setTimeout(() => {
      if (audioRef.current) {
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
      <div className="fixed inset-0 z-50 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Rideaux qui s'ouvrent */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900"
          initial={{ clipPath: 'inset(0 0 0 0)' }}
          animate={{ clipPath: 'inset(0 50% 0 50%)' }}
          transition={{ duration: 1.5, ease: [0.65, 0, 0.35, 1] }}
        />

        {/* Lumières d'ambiance subtiles */}
        <div className="absolute inset-0">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-[800px] h-[800px] rounded-full blur-[120px]"
              style={{
                left: `${20 + i * 30}%`,
                top: `${30}%`,
                background: i === 0
                  ? 'radial-gradient(circle, hsl(var(--primary) / 0.15), transparent)'
                  : i === 1
                  ? 'radial-gradient(circle, hsl(var(--secondary) / 0.15), transparent)'
                  : 'radial-gradient(circle, hsl(var(--accent) / 0.15), transparent)',
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 0.8,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Rayons de lumière élégants */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`ray-${i}`}
            className="absolute top-0 left-1/2 w-1 origin-top"
            style={{
              height: '100%',
              background: `linear-gradient(to bottom, hsl(var(--primary) / 0.2), transparent 70%)`,
              transform: `translateX(-50%) rotate(${-30 + i * 20}deg)`,
            }}
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{
              opacity: [0, 0.6, 0.6, 0],
              scaleY: [0, 1, 1, 0],
            }}
            transition={{
              duration: 3,
              times: [0, 0.3, 0.7, 1],
              delay: 0.5 + i * 0.1,
            }}
          />
        ))}

        {/* Contenu principal */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center max-w-5xl px-8">
            {/* Badge "MANCHE" avec effet néon */}
            {roundNumber && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
                className="mb-8"
              >
                <div className="inline-flex items-center gap-3 px-8 py-3 rounded-full bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-2 border-primary/30 backdrop-blur-xl">
                  <Sparkles className="w-6 h-6 text-primary" />
                  <span className="text-2xl font-bold text-primary tracking-widest">
                    MANCHE {roundNumber}
                  </span>
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
              </motion.div>
            )}

            {/* Titre de la manche - Animation élégante */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Ligne décorative du haut */}
              <motion.div
                className="h-1 mb-8 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1.4, duration: 0.8 }}
              />

              {/* Titre principal */}
              <h1
                className="text-8xl font-black mb-8 leading-none tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 50%, hsl(var(--accent)) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: '0 0 60px hsl(var(--primary) / 0.3)',
                }}
              >
                {roundTitle}
              </h1>

              {/* Ligne décorative du bas */}
              <motion.div
                className="h-1 mt-8 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1.6, duration: 0.8 }}
              />
            </motion.div>

            {/* Sous-titre élégant */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0.7] }}
              transition={{
                delay: 1.8,
                duration: 2,
                times: [0, 0.3, 0.7, 1]
              }}
              className="mt-12"
            >
              <p className="text-3xl font-light tracking-wider text-muted-foreground">
                Préparez-vous...
              </p>
            </motion.div>

            {/* Nom de la session en bas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 0.6, y: 0 }}
              transition={{ delay: 2, duration: 0.6 }}
              className="absolute bottom-12 left-0 right-0 text-center"
            >
              <p className="text-xl font-bold text-muted-foreground/60 tracking-[0.3em]">
                {sessionName}
              </p>
            </motion.div>
          </div>
        </div>

        {/* Effet de vignette */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
        </div>

        {/* Particules flottantes subtiles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary/30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0, 0.6, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </div>
    </AnimatePresence>
  );
};

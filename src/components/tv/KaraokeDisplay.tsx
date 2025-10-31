import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import type { LyricLine } from "@/components/admin/LyricsEditor";

interface KaraokeDisplayProps {
  lyrics: LyricLine[];
  audioUrl: string;
  isPlaying: boolean;
  stopTime?: number;
  sessionId?: string;
}

export const KaraokeDisplay = ({ lyrics, stopTime, sessionId }: KaraokeDisplayProps) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  // Synchroniser le temps depuis game_state (broadcast par la Régie)
  useEffect(() => {
    if (!sessionId) {
      console.log('⚠️ KaraokeDisplay - Pas de sessionId');
      return;
    }
    
    console.log('🎵 KaraokeDisplay - Écoute audio_current_time pour session:', sessionId);
    
    // Channel pour écouter les changements de game_state en temps réel
    const channel = supabase
      .channel(`karaoke-sync-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_state',
          filter: `game_session_id=eq.${sessionId}`
        },
        (payload: any) => {
          if (payload.new.audio_current_time !== undefined) {
            setCurrentTime(payload.new.audio_current_time);
            
            // Log occasionnel
            if (Math.floor(payload.new.audio_current_time) % 5 === 0) {
              console.log('🎵 KaraokeDisplay - Temps reçu:', payload.new.audio_current_time.toFixed(2));
            }
          }
        }
      )
      .subscribe();
    
    // Écouter l'événement de reprise karaoké
    const handleResumeKaraoke = () => {
      console.log('▶️ KaraokeDisplay - Révélation reçue');
      setIsRevealed(true);
    };
    
    window.addEventListener('resumeKaraoke', handleResumeKaraoke);
    
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('resumeKaraoke', handleResumeKaraoke);
    };
  }, [sessionId]);

  // Trouver la ligne actuelle
  const getCurrentLine = () => {
    return lyrics.find(l => 
      currentTime >= l.startTime && currentTime < l.endTime
    );
  };

  const getProgressForLine = (line: LyricLine) => {
    if (currentTime < line.startTime) return 0;
    if (currentTime > line.endTime) return 100;
    
    const duration = line.endTime - line.startTime;
    const elapsed = currentTime - line.startTime;
    return (elapsed / duration) * 100;
  };

  const currentLine = getCurrentLine();
  const isPaused = stopTime ? currentTime >= stopTime && !isRevealed : false;

  // Préparer le texte avec coloration des mots révélés
  const renderLyricText = (text: string) => {
    return text.split(' ').map((word, i) => {
      const isMissingWord = word === '___';
      
      if (isMissingWord && !isRevealed) {
        // Mot manquant avant révélation : tirets jaunes
        return (
          <span key={i} className="inline-block mx-2">
            <span className="text-yellow-400 font-bold tracking-widest">
              _ _ _ _ _
            </span>
          </span>
        );
      } else if (isMissingWord && isRevealed) {
        // Mot révélé : afficher "___" en vert (le vrai mot sera dans les paroles complètes)
        return (
          <span key={i} className="inline-block mx-2">
            <span className="text-green-400 font-bold">
              _ _ _ _ _
            </span>
          </span>
        );
      } else {
        // Mot normal
        return (
          <span key={i} className="inline-block mx-2">
            {word}
          </span>
        );
      }
    });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-950/90 via-purple-900/80 to-blue-950/90">
      {/* Effet d'étoiles en arrière-plan */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-6xl px-8 space-y-8">
        <AnimatePresence mode="wait">
          {currentLine && (
            <motion.div
              key={currentLine.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Texte dans une barre style Music Arena */}
              <div className="relative">
                {/* Barre de fond avec bordure néon */}
                <div 
                  className="relative px-12 py-8 rounded-3xl border-4 overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.95), rgba(88, 28, 135, 0.95))',
                    borderColor: 'hsl(var(--primary))',
                    boxShadow: '0 0 40px hsl(var(--primary) / 0.6), inset 0 0 60px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  {/* Texte des paroles */}
                  <div className="text-center text-5xl md:text-6xl font-black text-white uppercase tracking-wide leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                    {renderLyricText(currentLine.text)}
                  </div>
                </div>
              </div>

              {/* Barre de progression sous le texte */}
              {!isPaused && (
                <div className="relative">
                  <Progress 
                    value={getProgressForLine(currentLine)} 
                    className="h-6 bg-white/20 border-2 border-primary/50 rounded-full shadow-lg"
                    indicatorClassName="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 transition-all duration-100 ease-linear rounded-full shadow-[0_0_20px_rgba(250,204,21,0.8)]"
                  />
                </div>
              )}
              
              {/* Indicateur de pause */}
              {isPaused && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center"
                >
                  <div className="inline-block px-12 py-6 rounded-2xl border-4 border-yellow-400/60 bg-black/70 backdrop-blur-md shadow-2xl">
                    <p className="text-3xl md:text-4xl text-yellow-300 font-black uppercase animate-pulse">
                      ⏸️ En attente de la révélation...
                    </p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* État d'attente */}
          {!currentLine && (
            <motion.div 
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="inline-block px-12 py-8 rounded-3xl border-4 border-primary bg-black/50 backdrop-blur-md">
                <p className="text-5xl text-primary font-black uppercase">
                  🎵 Prêt à chanter...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

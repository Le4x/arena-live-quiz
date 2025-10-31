import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LyricLine } from "@/components/admin/LyricsEditor";

interface KaraokeDisplayProps {
  lyrics: LyricLine[];
  audioUrl: string;
  isPlaying: boolean;
  stopTime?: number;
}

export const KaraokeDisplay = ({ lyrics, audioUrl, isPlaying, stopTime }: KaraokeDisplayProps) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      console.log('⚠️ KaraokeDisplay - Pas d\'audio ref');
      return;
    }

    if (!audioUrl) {
      console.log('⚠️ KaraokeDisplay - Pas d\'URL audio');
      return;
    }
    
    console.log('🎵 KaraokeDisplay - Init audio:', { audioUrl, isPlaying, stopTime, lyricsCount: lyrics.length });
    
    // Réinitialiser l'état
    setCurrentTime(0);
    setIsPaused(false);
    
    // Charger le nouvel audio
    audio.src = audioUrl;
    audio.currentTime = 0;
    audio.load();
    
    const handleCanPlay = () => {
      console.log('✅ Audio prêt, démarrage lecture...', { isPlaying, paused: audio.paused, currentSrc: audio.src });
      if (isPlaying && audio.paused) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ Audio démarré avec succès');
            })
            .catch(error => {
              console.error('❌ Erreur lecture:', error);
              // Retry après une courte pause
              setTimeout(() => {
                audio.play().catch(e => console.error('❌ Retry échoué:', e));
              }, 100);
            });
        }
      }
    };
    
    const handlePlay = () => {
      console.log('▶️ Audio en lecture');
    };
    
    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      
      // Arrêter la musique au stopTime si défini ET valide (> 0)
      if (stopTime && stopTime > 0 && time >= stopTime && !isPaused && !audio.paused) {
        console.log('⏸️ PAUSE AUTO - stopTime atteint:', { currentTime: time, stopTime });
        audio.pause();
        setIsPaused(true);
      }
    };
    
    const handleError = (e: Event) => {
      console.error('❌ Erreur audio:', e, audio.error);
    };
    
    // Écouter l'événement de reprise karaoké
    const handleResumeKaraoke = () => {
      console.log('▶️ Événement reprise karaoké reçu');
      setIsPaused(false);
      
      // Si on a un stopTime valide et qu'on est dessus, reprendre après
      if (stopTime && stopTime > 0 && audio.currentTime >= stopTime) {
        audio.currentTime = stopTime + 0.1;
      }
      
      audio.play().catch(error => {
        console.error('❌ Erreur reprise:', error);
      });
    };
    
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('error', handleError);
    window.addEventListener('resumeKaraoke', handleResumeKaraoke);
    
    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('error', handleError);
      window.removeEventListener('resumeKaraoke', handleResumeKaraoke);
    };
  }, [audioUrl, isPlaying, stopTime]);

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

  // Debug render - Log toutes les 0.5s pour éviter le spam
  useEffect(() => {
    const shouldLog = Math.floor(currentTime * 2) % 10 === 0; // Log toutes les 5 secondes
    if (shouldLog) {
      console.log('🎵 Rendu karaoké:', {
        currentTime: currentTime.toFixed(1),
        hasCurrentLine: !!currentLine,
        currentLineText: currentLine?.text,
        currentLineStart: currentLine?.startTime,
        currentLineEnd: currentLine?.endTime,
        isPaused,
        totalLyrics: lyrics.length
      });
    }
  }, [currentTime, currentLine, isPaused, lyrics.length]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
      <audio
        ref={audioRef}
        preload="auto"
        loop={false}
      />

      <div className="w-full max-w-5xl px-8">
        <AnimatePresence mode="wait">
          {/* Ligne actuelle avec barre de progression */}
          {currentLine && (
            <motion.div
              key={currentLine.id}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-6"
            >
              {/* Texte des paroles */}
              <div className="relative">
                <div className="text-6xl font-bold text-center text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] leading-tight">
                  {currentLine.text.split(' ').map((word, i) => (
                    <span key={i} className="inline-block mx-2 my-1">
                      {word === '___' ? (
                        <span className="inline-block px-10 py-3 bg-primary/40 backdrop-blur-sm rounded-xl border-2 border-primary/60 animate-pulse shadow-lg">
                          ___
                        </span>
                      ) : word}
                    </span>
                  ))}
                </div>
              </div>

              {/* Barre de progression karaoké */}
              {!isPaused && (
                <div className="relative h-5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm shadow-lg">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-accent to-primary rounded-full shadow-[0_0_20px_rgba(var(--primary),0.5)]"
                    style={{ width: `${getProgressForLine(currentLine)}%` }}
                    transition={{ duration: 0.1, ease: "linear" }}
                  />
                </div>
              )}
              
              {/* Indicateur de pause */}
              {isPaused && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-3xl text-white font-bold bg-black/50 backdrop-blur-md py-6 px-10 rounded-xl shadow-2xl animate-pulse"
                >
                  ⏸️ En attente de la révélation...
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
              className="text-5xl text-center text-white/60 font-bold"
            >
              🎵 En attente du démarrage...
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

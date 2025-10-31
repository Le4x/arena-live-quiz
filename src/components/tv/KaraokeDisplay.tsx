import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import type { LyricLine } from "@/components/admin/LyricsEditor";

interface KaraokeDisplayProps {
  lyrics: LyricLine[];
  audioUrl: string;
  isPlaying: boolean;
  stopTime?: number; // Temps où arrêter la musique
}

export const KaraokeDisplay = ({ lyrics, audioUrl, isPlaying, stopTime }: KaraokeDisplayProps) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioRef.current || !audioUrl) {
      console.log('⚠️ KaraokeDisplay - Pas d\'audio ref ou URL', { hasRef: !!audioRef.current, audioUrl });
      return;
    }

    const audio = audioRef.current;
    
    console.log('🎵 KaraokeDisplay - Init audio:', { audioUrl, isPlaying, stopTime, lyricsCount: lyrics.length });
    
    // Réinitialiser l'audio et l'état de pause
    setCurrentTime(0);
    setIsPaused(false);
    audio.currentTime = 0;
    audio.load();
    
    const handleCanPlay = () => {
      console.log('✅ Audio prêt, démarrage lecture...', { isPlaying, paused: audio.paused });
      if (isPlaying) {
        audio.play().catch(error => {
          console.error('❌ Erreur lecture:', error);
        });
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

  // Trouver la ligne suivante
  const getNextLine = () => {
    const currentIndex = lyrics.findIndex(l => 
      currentTime >= l.startTime && currentTime < l.endTime
    );
    
    if (currentIndex !== -1 && currentIndex + 1 < lyrics.length) {
      return lyrics[currentIndex + 1];
    }
    
    // Si pas de ligne actuelle, chercher la prochaine
    return lyrics.find(line => line.startTime > currentTime);
  };

  const getProgressForLine = (line: LyricLine) => {
    if (currentTime < line.startTime) return 0;
    if (currentTime > line.endTime) return 100;
    
    const duration = line.endTime - line.startTime;
    const elapsed = currentTime - line.startTime;
    return (elapsed / duration) * 100;
  };

  const currentLine = getCurrentLine();
  const nextLine = getNextLine();

  // Debug render
  useEffect(() => {
    console.log('🎵 Rendu karaoké:', {
      currentTime: currentTime.toFixed(1),
      hasCurrentLine: !!currentLine,
      hasNextLine: !!nextLine,
      isPaused,
      totalLyrics: lyrics.length
    });
  }, [currentTime, currentLine, nextLine, isPaused, lyrics.length]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        loop={false}
      />

      <div className="w-full max-w-4xl px-8 space-y-8">
        {/* Ligne actuelle avec barre de progression */}
        {currentLine && (
          <motion.div
            key={currentLine.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="relative">
              <div className="text-5xl font-bold text-center text-white drop-shadow-lg">
                {currentLine.text.split(' ').map((word, i) => (
                  <span key={i} className="inline-block mx-2">
                    {word === '___' ? (
                      <span className="inline-block px-8 py-2 bg-primary/30 backdrop-blur-sm rounded-lg border-2 border-primary animate-pulse">
                        ___
                      </span>
                    ) : word}
                  </span>
                ))}
              </div>
            </div>

            {/* Barre de progression karaoké (seulement si pas en pause) */}
            {!isPaused && (
              <div className="relative h-3 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent"
                  style={{ width: `${getProgressForLine(currentLine)}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            )}
            
            {/* Indicateur de pause */}
            {isPaused && (
              <div className="text-center text-2xl text-white/80 animate-pulse">
                ⏸️ En attente de la révélation...
              </div>
            )}
          </motion.div>
        )}

        {/* Ligne suivante en aperçu */}
        {nextLine && !isPaused && (
          <motion.div
            key={`next-${nextLine.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            className="text-3xl text-center text-white/60 mt-12"
          >
            {nextLine.text.replace(/___/g, '______')}
          </motion.div>
        )}

        {/* État d'attente */}
        {!currentLine && !nextLine && (
          <div className="text-4xl text-center text-white/40">
            🎵 En attente...
          </div>
        )}
      </div>
    </div>
  );
};

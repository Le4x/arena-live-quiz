import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import type { LyricLine } from "@/components/admin/LyricsEditor";

interface KaraokeDisplayProps {
  lyrics: LyricLine[];
  audioUrl: string;
  isPlaying: boolean;
}

export const KaraokeDisplay = ({ lyrics, audioUrl, isPlaying }: KaraokeDisplayProps) => {
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    
    console.log('🎵 KaraokeDisplay - Chargement audio:', audioUrl);
    
    // Réinitialiser l'audio quand on charge une nouvelle chanson
    audio.currentTime = 0;
    audio.load();
    
    const handleCanPlay = () => {
      console.log('✅ Audio karaoké chargé et prêt');
      if (isPlaying) {
        audio.play().catch(error => {
          console.error('❌ Erreur lecture audio karaoké:', error);
        });
      }
    };
    
    const handlePlay = () => {
      console.log('▶️ Audio karaoké en lecture');
    };
    
    const handleError = (e: Event) => {
      console.error('❌ Erreur chargement audio karaoké:', e);
    };
    
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('error', handleError);
    
    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('error', handleError);
    };
  }, [isPlaying, audioUrl]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const newTime = audioRef.current.currentTime;
      setCurrentTime(newTime);
      // Log périodique pour debug
      if (Math.floor(newTime) !== Math.floor(currentTime)) {
        console.log('⏱️ Temps karaoké:', newTime.toFixed(1), 's');
      }
    }
  };

  // Trouver la ligne actuelle (celle qui est en cours de lecture)
  const getCurrentLine = () => {
    return lyrics.find(line => 
      currentTime >= line.startTime && currentTime <= line.endTime
    );
  };

  // Trouver la prochaine ligne à afficher en aperçu
  const getNextLine = () => {
    const currentLine = getCurrentLine();
    if (!currentLine) {
      // Si pas de ligne actuelle, trouver la première ligne à venir
      return lyrics.find(line => line.startTime > currentTime);
    }
    
    // Trouver la ligne qui vient juste après la ligne actuelle
    const currentIndex = lyrics.indexOf(currentLine);
    return lyrics[currentIndex + 1];
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

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        preload="auto"
        loop={false}
      />

      <div className="w-full max-w-4xl px-8 space-y-6">
        {/* Ligne actuelle avec barre de progression */}
        {currentLine && (
          <motion.div
            key={currentLine.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            <div className="relative">
              <div className="text-5xl font-bold text-center text-white drop-shadow-lg">
                {currentLine.text.split(' ').map((word, i) => (
                  <span key={i} className="inline-block mx-2">
                    {word === '___' ? (
                      <span className="inline-block px-8 py-2 bg-white/20 backdrop-blur-sm rounded-lg border-2 border-white/40">
                        ___
                      </span>
                    ) : word}
                  </span>
                ))}
              </div>
            </div>

            {/* Barre de progression karaoké */}
            <div className="relative h-3 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent"
                style={{ width: `${getProgressForLine(currentLine)}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </motion.div>
        )}

        {/* Ligne suivante en aperçu */}
        {nextLine && (
          <motion.div
            key={`next-${nextLine.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            className="text-3xl text-center text-white/60 mt-8"
          >
            {nextLine.text}
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

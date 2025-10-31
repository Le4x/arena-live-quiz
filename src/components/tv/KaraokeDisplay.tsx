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
    
    console.log('🎵 KaraokeDisplay - Init audio:', { audioUrl, isPlaying, lyricsCount: lyrics.length });
    
    // Réinitialiser l'audio
    audio.currentTime = 0;
    audio.load();
    
    const handleCanPlay = () => {
      console.log('✅ Audio prêt, démarrage lecture...');
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
    };
    
    const handleError = (e: Event) => {
      console.error('❌ Erreur audio:', e);
    };
    
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('error', handleError);
    
    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, isPlaying, lyrics.length]);

  // Trouver la ligne actuelle (celle qui est en cours de lecture)
  const getCurrentLine = () => {
    const line = lyrics.find(l => 
      currentTime >= l.startTime && currentTime <= l.endTime
    );
    if (line) {
      console.log('🎤 Ligne actuelle:', line.text, '| temps:', currentTime.toFixed(1));
    }
    return line;
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

  console.log('🎵 Rendu karaoké:', { 
    currentTime: currentTime.toFixed(1),
    hasCurrentLine: !!currentLine, 
    hasNextLine: !!nextLine,
    totalLyrics: lyrics.length 
  });

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        loop={false}
      />

      <div className="w-full max-w-4xl px-8 space-y-8">
        {/* Ligne actuelle avec barre de progression (texte complet sans ___) */}
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
                {currentLine.text.replace(/___/g, '______')}
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

        {/* Ligne suivante avec les mots manquants (___ visibles) */}
        {nextLine && (
          <motion.div
            key={`next-${nextLine.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            className="text-4xl text-center text-white/70 mt-12"
          >
            {nextLine.text.split(' ').map((word, i) => (
              <span key={i} className="inline-block mx-2">
                {word === '___' ? (
                  <span className="inline-block px-6 py-1 bg-white/20 backdrop-blur-sm rounded-lg border-2 border-white/40">
                    ___
                  </span>
                ) : word}
              </span>
            ))}
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

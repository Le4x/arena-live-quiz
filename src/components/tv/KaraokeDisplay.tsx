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
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    
    console.log('🎵 KaraokeDisplay - Init audio:', { audioUrl, isPlaying, lyricsCount: lyrics.length });
    
    // Réinitialiser l'audio et l'état de pause
    audio.currentTime = 0;
    audio.load();
    setIsPaused(false);
    
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
    
    // Écouter l'événement de reprise karaoké
    const handleResumeKaraoke = () => {
      console.log('▶️ Événement reprise karaoké reçu');
      setIsPaused(false);
      const currentLine = lyrics.find(l => 
        audio.currentTime >= l.startTime && audio.currentTime <= l.endTime
      );
      if (currentLine) {
        audio.currentTime = currentLine.endTime + 0.1;
        audio.play();
      }
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
  }, [audioUrl, isPlaying, lyrics]);

  // Trouver la ligne actuelle (celle qui est en cours de lecture)
  const getCurrentLine = () => {
    const line = lyrics.find(l => 
      currentTime >= l.startTime && currentTime <= l.endTime
    );
    
    if (line) {
      // Vérifier si cette ligne contient des mots manquants et mettre en pause
      if (line.text.includes('___') && !isPaused && audioRef.current && !audioRef.current.paused) {
        console.log('⏸️ PAUSE AUTO - ligne avec mots manquants:', line.text);
        audioRef.current.pause();
        setIsPaused(true);
      }
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
    isPaused,
    totalLyrics: lyrics.length 
  });

  // Fonction pour révéler et continuer
  const handleReveal = () => {
    console.log('▶️ Révélation et reprise');
    setIsPaused(false);
    if (audioRef.current && currentLine) {
      // Reprendre juste après la ligne actuelle
      audioRef.current.currentTime = currentLine.endTime;
      audioRef.current.play();
    }
  };

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

            {/* Barre de progression karaoké (seulement si pas de mots manquants) */}
            {!currentLine.text.includes('___') && (
              <div className="relative h-3 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent"
                  style={{ width: `${getProgressForLine(currentLine)}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            )}
          </motion.div>
        )}

        {/* Ligne suivante en aperçu (seulement si pas en pause) */}
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

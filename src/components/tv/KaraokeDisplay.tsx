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

    if (isPlaying) {
      audioRef.current.play().catch(console.error);
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const getCurrentLines = () => {
    return lyrics.filter(line => 
      currentTime >= line.startTime && currentTime <= line.endTime
    );
  };

  const getUpcomingLines = () => {
    return lyrics.filter(line => 
      line.startTime > currentTime && line.startTime <= currentTime + 3
    );
  };

  const getProgressForLine = (line: LyricLine) => {
    if (currentTime < line.startTime) return 0;
    if (currentTime > line.endTime) return 100;
    
    const duration = line.endTime - line.startTime;
    const elapsed = currentTime - line.startTime;
    return (elapsed / duration) * 100;
  };

  const currentLines = getCurrentLines();
  const upcomingLines = getUpcomingLines();

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
      />

      <div className="w-full max-w-4xl px-8 space-y-8">
        {/* Lignes actuelles avec barre de progression */}
        {currentLines.map((line) => (
          <motion.div
            key={line.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-2"
          >
            <div className="relative">
              <div className="text-5xl font-bold text-center text-white drop-shadow-lg">
                {line.text.split(' ').map((word, i) => (
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
            <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent"
                style={{ width: `${getProgressForLine(line)}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </motion.div>
        ))}

        {/* Lignes à venir (aperçu) */}
        {upcomingLines.length > 0 && currentLines.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            className="text-3xl text-center text-white/60"
          >
            {upcomingLines[0].text}
          </motion.div>
        )}

        {currentLines.length === 0 && upcomingLines.length === 0 && (
          <div className="text-4xl text-center text-white/40">
            🎵 En attente...
          </div>
        )}
      </div>
    </div>
  );
};

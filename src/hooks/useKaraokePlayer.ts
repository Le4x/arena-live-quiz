import { useState, useEffect, useRef } from 'react';

interface UseKaraokePlayerProps {
  audioUrl: string;
  stopTime?: number;
  isPlaying: boolean;
  isRevealed: boolean;
}

export const useKaraokePlayer = ({ 
  audioUrl, 
  stopTime, 
  isPlaying,
  isRevealed 
}: UseKaraokePlayerProps) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Créer et charger l'audio
  useEffect(() => {
    console.log('🎵 KaraokePlayer: Création audio element', audioUrl);
    
    const audio = new Audio(audioUrl);
    audio.preload = 'auto';
    
    audio.addEventListener('loadedmetadata', () => {
      console.log('✅ KaraokePlayer: Audio chargé, durée:', audio.duration);
      setDuration(audio.duration);
      setIsReady(true);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('error', (e) => {
      console.error('❌ KaraokePlayer: Erreur audio', e);
    });

    audioRef.current = audio;

    return () => {
      console.log('🧹 KaraokePlayer: Cleanup audio');
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [audioUrl]);

  // Gérer play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isReady) return;

    console.log('▶️ KaraokePlayer: isPlaying changé:', isPlaying);

    if (isPlaying) {
      audio.play().catch(e => console.error('Erreur play:', e));
    } else {
      audio.pause();
    }
  }, [isPlaying, isReady]);

  // Arrêt automatique au stopTime (avant révélation)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !stopTime || isRevealed || !isPlaying) return;

    const checkStop = () => {
      if (audio.currentTime >= stopTime) {
        console.log('⏸️ KaraokePlayer: Arrêt automatique au stopTime');
        audio.pause();
      }
    };

    const interval = setInterval(checkStop, 100);
    return () => clearInterval(interval);
  }, [stopTime, isRevealed, isPlaying]);

  // Reprendre depuis stopTime après révélation
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isRevealed || !stopTime) return;

    console.log('🎉 KaraokePlayer: Révélation! Reprise au stopTime');
    audio.currentTime = stopTime;
    audio.play().catch(e => console.error('Erreur play après reveal:', e));
  }, [isRevealed, stopTime]);

  return {
    currentTime,
    duration,
    isReady,
    isPaused: stopTime ? currentTime >= stopTime && !isRevealed : false
  };
};

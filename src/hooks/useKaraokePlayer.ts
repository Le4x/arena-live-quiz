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
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number>();

  // Créer et charger l'audio
  useEffect(() => {
    console.log('🎵 useKaraokePlayer: Initialisation', { audioUrl, stopTime });
    setHasError(false);
    setIsReady(false);
    setCurrentTime(0);
    
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    
    const handleLoadedMetadata = () => {
      console.log('✅ useKaraokePlayer: Métadonnées chargées', { duration: audio.duration });
      setDuration(audio.duration);
      setIsReady(true);
    };

    const handleCanPlay = () => {
      console.log('✅ useKaraokePlayer: Audio prêt à jouer');
    };

    const handleError = (e: Event) => {
      console.error('❌ useKaraokePlayer: Erreur chargement', e);
      setHasError(true);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    
    // Charger l'audio
    audio.src = audioUrl;
    audioRef.current = audio;

    return () => {
      console.log('🧹 useKaraokePlayer: Cleanup');
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.src = '';
      audioRef.current = null;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioUrl]);

  // Mettre à jour currentTime en continu avec requestAnimationFrame
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isPlaying || !isReady) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      animationFrameRef.current = requestAnimationFrame(updateTime);
    };

    animationFrameRef.current = requestAnimationFrame(updateTime);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isReady]);

  // Gérer play/pause depuis game_state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isReady || hasError) return;

    console.log('▶️ useKaraokePlayer: Changement isPlaying:', isPlaying);

    if (isPlaying) {
      // Vérifier si on doit s'arrêter au stopTime
      if (stopTime && !isRevealed && audio.currentTime >= stopTime) {
        console.log('⏸️ useKaraokePlayer: Déjà au stopTime, pas de lecture');
        return;
      }
      
      audio.play()
        .then(() => console.log('✅ useKaraokePlayer: Lecture démarrée'))
        .catch(e => console.error('❌ useKaraokePlayer: Erreur play:', e));
    } else {
      audio.pause();
      console.log('⏸️ useKaraokePlayer: Lecture mise en pause');
    }
  }, [isPlaying, isReady, hasError, stopTime, isRevealed]);

  // Arrêter automatiquement au stopTime (avant révélation)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !stopTime || isRevealed) return;

    const checkStop = () => {
      if (audio.currentTime >= stopTime && !audio.paused) {
        console.log('⏸️ useKaraokePlayer: Arrêt au stopTime', stopTime);
        audio.pause();
      }
    };

    const interval = setInterval(checkStop, 50); // Check plus fréquent
    return () => clearInterval(interval);
  }, [stopTime, isRevealed]);

  // Reprendre après révélation
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isRevealed || !stopTime || !isReady) return;

    console.log('🎉 useKaraokePlayer: Révélation! Reprise depuis', stopTime);
    
    // Attendre un peu pour que l'UI se mette à jour
    setTimeout(() => {
      audio.currentTime = stopTime;
      audio.play()
        .then(() => console.log('✅ useKaraokePlayer: Reprise après révélation OK'))
        .catch(e => console.error('❌ useKaraokePlayer: Erreur reprise:', e));
    }, 100);
  }, [isRevealed, stopTime, isReady]);

  return {
    currentTime,
    duration,
    isReady: isReady && !hasError,
    isPaused: stopTime ? currentTime >= stopTime && !isRevealed : false
  };
};

/**
 * Store Zustand pour l'audio
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AudioTrack } from '@/types/game.types';

interface AudioStore {
  // État
  tracks: AudioTrack[];
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isPreloaded: boolean;
  isPreloading: boolean;
  clipStartTime: number;
  
  // Actions
  setTracks: (tracks: AudioTrack[]) => void;
  setCurrentTrack: (track: AudioTrack | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setIsPreloaded: (preloaded: boolean) => void;
  setIsPreloading: (preloading: boolean) => void;
  setClipStartTime: (time: number) => void;
  
  // Computed
  getTrackById: (id: string) => AudioTrack | undefined;
}

export const useAudioStore = create<AudioStore>()(
  devtools(
    (set, get) => ({
      // État initial
      tracks: [],
      currentTrack: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      isPreloaded: false,
      isPreloading: false,
      clipStartTime: 0,

      // Actions
      setTracks: (tracks) => set({ tracks }, false, 'setTracks'),
      
      setCurrentTrack: (currentTrack) => set({ currentTrack }, false, 'setCurrentTrack'),
      
      setIsPlaying: (isPlaying) => set({ isPlaying }, false, 'setIsPlaying'),
      
      setCurrentTime: (currentTime) => set({ currentTime }, false, 'setCurrentTime'),
      
      setDuration: (duration) => set({ duration }, false, 'setDuration'),
      
      setVolume: (volume) => set({ volume }, false, 'setVolume'),
      
      setIsPreloaded: (isPreloaded) => set({ isPreloaded }, false, 'setIsPreloaded'),
      
      setIsPreloading: (isPreloading) => set({ isPreloading }, false, 'setIsPreloading'),
      
      setClipStartTime: (clipStartTime) => set({ clipStartTime }, false, 'setClipStartTime'),

      // Computed
      getTrackById: (id) => {
        return get().tracks.find(track => track.id === id);
      },
    }),
    { name: 'AudioStore' }
  )
);

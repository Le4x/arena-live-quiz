/**
 * Store Zustand pour les buzzers
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { BuzzerAttempt } from '@/types/game.types';

interface BuzzerStore {
  // État
  buzzers: BuzzerAttempt[];
  buzzerLocked: boolean;
  timerWhenBuzzed: number;
  audioPositionWhenBuzzed: number;
  
  // Actions
  setBuzzers: (buzzers: BuzzerAttempt[]) => void;
  addBuzzer: (buzzer: BuzzerAttempt) => void;
  clearBuzzers: () => void;
  lockBuzzer: () => void;
  unlockBuzzer: () => void;
  setTimerWhenBuzzed: (time: number) => void;
  setAudioPositionWhenBuzzed: (position: number) => void;
  
  // Computed
  getFirstBuzzer: () => BuzzerAttempt | undefined;
  hasBuzzers: () => boolean;
}

export const useBuzzerStore = create<BuzzerStore>()(
  devtools(
    (set, get) => ({
      // État initial
      buzzers: [],
      buzzerLocked: false,
      timerWhenBuzzed: 0,
      audioPositionWhenBuzzed: 0,

      // Actions
      setBuzzers: (buzzers) => set({ buzzers }, false, 'setBuzzers'),
      
      addBuzzer: (buzzer) => set((state) => ({
        buzzers: [...state.buzzers, buzzer]
      }), false, 'addBuzzer'),
      
      clearBuzzers: () => set({ 
        buzzers: [],
        buzzerLocked: false,
        timerWhenBuzzed: 0,
        audioPositionWhenBuzzed: 0
      }, false, 'clearBuzzers'),
      
      lockBuzzer: () => set({ buzzerLocked: true }, false, 'lockBuzzer'),
      
      unlockBuzzer: () => set({ buzzerLocked: false }, false, 'unlockBuzzer'),
      
      setTimerWhenBuzzed: (time) => set({ timerWhenBuzzed: time }, false, 'setTimerWhenBuzzed'),
      
      setAudioPositionWhenBuzzed: (position) => set({ 
        audioPositionWhenBuzzed: position 
      }, false, 'setAudioPositionWhenBuzzed'),

      // Computed
      getFirstBuzzer: () => {
        const buzzers = get().buzzers;
        return buzzers.length > 0 ? buzzers[0] : undefined;
      },

      hasBuzzers: () => {
        return get().buzzers.length > 0;
      },
    }),
    { name: 'BuzzerStore' }
  )
);

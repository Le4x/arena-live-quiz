/**
 * AudioEngine - Moteur audio professionnel pour MusicArena
 * Gère lecture, fade, crossfade, cue points avec AudioContext
 */

export interface CuePoint {
  label: string;
  time: number;
}

export interface Track {
  id: string;
  name: string;
  url: string;
  cues: CuePoint[];
  duration?: number;
}

export interface AudioEngineState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  currentTrack: Track | null;
}

type StateListener = (state: AudioEngineState) => void;

export class AudioEngine {
  private audioContext: AudioContext;
  private gainNode: GainNode;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private currentTrack: Track | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private isPlaying: boolean = false;
  private volume: number = 1;
  private listeners: Set<StateListener> = new Set();
  private animationFrame: number | null = null;
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private isFading: boolean = false;
  private autoStopTimeout: number | null = null;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    this.startTimeUpdate();
  }

  /**
   * Précharger une track en mémoire
   */
  async preloadTrack(track: Track): Promise<void> {
    if (this.bufferCache.has(track.url)) return;

    try {
      console.log('🎵 AudioEngine: Préchargement de', track.name, 'depuis', track.url);
      const response = await fetch(track.url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('✅ AudioEngine: Fichier téléchargé, taille:', arrayBuffer.byteLength, 'bytes');
      
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      console.log('✅ AudioEngine: Audio décodé, durée:', audioBuffer.duration, 'secondes');
      
      this.bufferCache.set(track.url, audioBuffer);
      track.duration = audioBuffer.duration;
    } catch (error) {
      console.error('❌ AudioEngine: Erreur préchargement', track.name, error);
      throw error;
    }
  }

  /**
   * Charger une track sans la jouer
   */
  async loadTrack(track: Track): Promise<void> {
    this.currentTrack = track;

    // Précharger si pas en cache
    if (!this.bufferCache.has(track.url)) {
      await this.preloadTrack(track);
    }

    // Assigner le buffer
    const buffer = this.bufferCache.get(track.url);
    if (!buffer) {
      throw new Error('Impossible de charger le fichier audio');
    }

    this.currentBuffer = buffer;
    this.notifyListeners();
  }

  /**
   * Charger et lire une track
   */
  async loadAndPlay(track: Track, startAt: number = 0): Promise<void> {
    await this.stop();
    await this.loadTrack(track);
    await this.play(startAt);
  }

  /**
   * Lire depuis la position actuelle ou une position spécifique
   */
  async play(startAt?: number): Promise<void> {
    // Activer l'AudioContext si suspendu (requis par les navigateurs)
    if (this.audioContext.state === 'suspended') {
      console.log('🔊 AudioEngine: Activation AudioContext...');
      await this.audioContext.resume();
      console.log('✅ AudioEngine: AudioContext activé');
    }

    if (!this.currentBuffer) {
      console.warn('⚠️ AudioEngine: Pas de buffer chargé');
      return;
    }

    this.stop();

    console.log('▶️ AudioEngine: Démarrage lecture à', startAt || this.pauseTime, 'secondes');
    
    this.currentSource = this.audioContext.createBufferSource();
    this.currentSource.buffer = this.currentBuffer;
    this.currentSource.connect(this.gainNode);

    const offset = startAt !== undefined ? startAt : this.pauseTime;
    this.currentSource.start(0, offset);
    this.startTime = this.audioContext.currentTime - offset;
    this.isPlaying = true;
    this.notifyListeners();
  }

  /**
   * Pause
   */
  pause(): void {
    if (this.currentSource && this.isPlaying) {
      this.pauseTime = this.audioContext.currentTime - this.startTime;
      this.currentSource.stop();
      this.currentSource = null;
      this.isPlaying = false;
      this.notifyListeners();
    }
  }

  /**
   * Stop complet
   */
  stop(): void {
    // Annuler tous les timeouts automatiques
    if (this.autoStopTimeout) {
      clearTimeout(this.autoStopTimeout);
      this.autoStopTimeout = null;
    }
    
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource.disconnect();
      this.currentSource = null;
    }
    this.isPlaying = false;
    this.pauseTime = 0;
    this.startTime = 0;
    this.notifyListeners();
  }

  /**
   * Fade in progressif (ms)
   */
  async fadeIn(duration: number = 1000): Promise<void> {
    if (this.isFading) return;
    this.isFading = true;

    this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(
      this.volume,
      this.audioContext.currentTime + duration / 1000
    );

    await new Promise(resolve => setTimeout(resolve, duration));
    this.isFading = false;
  }

  /**
   * Fade out progressif (ms)
   */
  async fadeOut(duration: number = 1000): Promise<void> {
    if (this.isFading) return;
    this.isFading = true;

    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.audioContext.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(
      0,
      this.audioContext.currentTime + duration / 1000
    );

    await new Promise(resolve => setTimeout(resolve, duration));
    this.pause();
    this.gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
    this.isFading = false;
  }

  /**
   * Arrêter avec fade out
   */
  async stopWithFade(duration: number = 300): Promise<void> {
    await this.fadeOut(duration);
    this.stop();
    this.gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
  }

  /**
   * Jouer depuis un cue point
   */
  async playFromCue(cueIndex: number): Promise<void> {
    if (!this.currentTrack || !this.currentTrack.cues[cueIndex]) {
      console.warn('Cue point invalide');
      return;
    }
    const cueTime = this.currentTrack.cues[cueIndex].time;
    await this.play(cueTime);
  }

  /**
   * Jouer un clip de temps défini (avec auto-stop)
   */
  async playFromTo(startTime: number, endTime: number, fadeOutDuration: number = 300): Promise<void> {
    if (this.autoStopTimeout) clearTimeout(this.autoStopTimeout);
    
    await this.play(startTime);
    
    const duration = (endTime - startTime) * 1000;
    this.autoStopTimeout = window.setTimeout(async () => {
      await this.stopWithFade(fadeOutDuration);
    }, duration - fadeOutDuration);
  }

  /**
   * Clip mode 30s : démarre au CUE#1 et s'arrête à 30s
   */
  async playClip30s(fadeOutDuration: number = 300): Promise<void> {
    if (!this.currentTrack || !this.currentTrack.cues[0]) {
      console.warn('Pas de CUE#1 défini');
      return;
    }
    const startTime = this.currentTrack.cues[0].time;
    await this.playFromTo(startTime, startTime + 30, fadeOutDuration);
  }

  /**
   * Jouer la solution (CUE#2) pendant X secondes
   */
  async playSolution(durationSeconds: number = 8, fadeInDuration: number = 300, fadeOutDuration: number = 300): Promise<void> {
    if (!this.currentTrack || !this.currentTrack.cues[1]) {
      console.warn('Pas de CUE#2 défini pour la solution');
      return;
    }
    const startTime = this.currentTrack.cues[1].time;
    await this.play(startTime);
    await this.fadeIn(fadeInDuration);
    
    if (this.autoStopTimeout) clearTimeout(this.autoStopTimeout);
    this.autoStopTimeout = window.setTimeout(async () => {
      await this.stopWithFade(fadeOutDuration);
    }, durationSeconds * 1000 - fadeOutDuration);
  }

  /**
   * Jouer un jingle exactement 10s avec fade in/out
   */
  async playJingle(url: string, options: { fadeInMs?: number; fadeOutMs?: number; durationMs?: number } = {}): Promise<void> {
    const { fadeInMs = 150, fadeOutMs = 150, durationMs = 10000 } = options;
    
    try {
      // Créer une track temporaire pour le jingle
      const jingleTrack: Track = {
        id: 'jingle-temp',
        name: 'Jingle',
        url,
        cues: []
      };

      // Charger et jouer
      await this.loadAndPlay(jingleTrack);
      await this.fadeIn(fadeInMs);

      // Auto-stop après durée avec fade out
      if (this.autoStopTimeout) clearTimeout(this.autoStopTimeout);
      this.autoStopTimeout = window.setTimeout(async () => {
        await this.stopWithFade(fadeOutMs);
      }, durationMs - fadeOutMs);
    } catch (error) {
      console.error('Erreur lecture jingle:', error);
    }
  }

  /**
   * Obtenir la position actuelle
   */
  getPosition(): number {
    return this.isPlaying 
      ? this.audioContext.currentTime - this.startTime 
      : this.pauseTime;
  }

  /**
   * Crossfade vers une nouvelle track
   */
  async crossfadeTo(newTrack: Track, duration: number = 2000): Promise<void> {
    const fadePromise = this.fadeOut(duration);
    
    // Précharger la nouvelle track pendant le fade
    await this.preloadTrack(newTrack);
    await fadePromise;
    
    await this.loadAndPlay(newTrack);
    await this.fadeIn(duration);
  }

  /**
   * Sauter à un cue point
   */
  async jumpToCue(cueIndex: number): Promise<void> {
    if (!this.currentTrack || !this.currentTrack.cues[cueIndex]) return;
    const cueTime = this.currentTrack.cues[cueIndex].time;
    
    const wasPlaying = this.isPlaying;
    await this.play(cueTime);
    if (!wasPlaying) {
      this.pause();
      this.pauseTime = cueTime;
    }
  }

  /**
   * Seek à une position (secondes)
   */
  async seek(time: number): Promise<void> {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      await this.play(time);
    } else {
      this.pauseTime = time;
      this.notifyListeners();
    }
  }

  /**
   * Ajuster le volume (0-1)
   */
  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    this.gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
    this.notifyListeners();
  }

  /**
   * Obtenir l'état actuel
   */
  getState(): AudioEngineState {
    const currentTime = this.isPlaying 
      ? this.audioContext.currentTime - this.startTime 
      : this.pauseTime;

    return {
      isPlaying: this.isPlaying,
      currentTime,
      duration: this.currentBuffer?.duration || 0,
      volume: this.volume,
      currentTrack: this.currentTrack,
    };
  }

  /**
   * S'abonner aux changements d'état
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  private startTimeUpdate(): void {
    const update = () => {
      if (this.isPlaying) {
        this.notifyListeners();
      }
      this.animationFrame = requestAnimationFrame(update);
    };
    update();
  }

  /**
   * Nettoyer les ressources
   */
  dispose(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.autoStopTimeout) clearTimeout(this.autoStopTimeout);
    this.stop();
    this.bufferCache.clear();
    this.gainNode.disconnect();
    this.audioContext.close();
  }
}

// Instance globale singleton
let globalEngine: AudioEngine | null = null;

export const getAudioEngine = (): AudioEngine => {
  if (!globalEngine) {
    globalEngine = new AudioEngine();
  }
  return globalEngine;
};

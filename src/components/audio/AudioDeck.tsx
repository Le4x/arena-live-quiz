/**
 * AudioDeck - Interface deck audio pro pour la régie
 * Waveform, cue points, hotkeys, fade controls
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { getAudioEngine, type Track, type AudioEngineState } from '@/lib/audio/AudioEngine';
import { useToast } from '@/hooks/use-toast';

interface AudioDeckProps {
  tracks: Track[];
  onTrackChange?: (track: Track) => void;
}

export const AudioDeck = ({ tracks, onTrackChange }: AudioDeckProps) => {
  const { toast } = useToast();
  const engine = getAudioEngine();
  const [state, setState] = useState<AudioEngineState>(engine.getState());
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(tracks[0] || null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // S'abonner aux changements d'état
    const unsubscribe = engine.subscribe(setState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Précharger toutes les tracks au chargement
    tracks.forEach(track => {
      engine.preloadTrack(track).catch(err => {
        console.error('Erreur préchargement:', track.name, err);
      });
    });
  }, [tracks]);

  useEffect(() => {
    // Raccourcis clavier
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'p':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'arrowup':
          e.preventDefault();
          engine.setVolume(Math.min(1, state.volume + 0.1));
          break;
        case 'arrowdown':
          e.preventDefault();
          engine.setVolume(Math.max(0, state.volume - 0.1));
          break;
        case 'f':
          handleFadeToggle();
          break;
        default:
          // Cue points 1-8
          const num = parseInt(e.key);
          if (!isNaN(num) && num >= 1 && num <= 8) {
            engine.jumpToCue(num - 1);
          }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [state]);

  const handlePlayPause = async () => {
    if (!selectedTrack) return;

    if (!state.currentTrack || state.currentTrack.id !== selectedTrack.id) {
      await engine.loadAndPlay(selectedTrack);
      onTrackChange?.(selectedTrack);
      toast({ title: `▶️ ${selectedTrack.name}` });
    } else {
      if (state.isPlaying) {
        engine.pause();
        toast({ title: '⏸️ Pause' });
      } else {
        await engine.play();
        toast({ title: '▶️ Lecture' });
      }
    }
  };

  const handleFadeToggle = async () => {
    if (state.isPlaying) {
      await engine.fadeOut(1500);
      toast({ title: '🔉 Fade out' });
    } else if (selectedTrack) {
      await engine.loadAndPlay(selectedTrack);
      await engine.fadeIn(1500);
      toast({ title: '🔊 Fade in' });
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-6 bg-card/90 backdrop-blur-sm border-primary/20">
      <div className="space-y-4">
        {/* Track selector */}
        <div className="flex gap-2 flex-wrap">
          {tracks.map((track) => (
            <Button
              key={track.id}
              variant={selectedTrack?.id === track.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTrack(track)}
              className="text-xs"
            >
              {track.name}
            </Button>
          ))}
        </div>

        {/* Waveform placeholder */}
        <div className="relative h-24 bg-muted/50 rounded-lg overflow-hidden">
          <canvas 
            ref={canvasRef}
            className="w-full h-full"
          />
          {state.duration > 0 && (
            <div 
              className="absolute top-0 bottom-0 w-1 bg-primary"
              style={{ 
                left: `${(state.currentTime / state.duration) * 100}%` 
              }}
            />
          )}
        </div>

        {/* Cue points */}
        {selectedTrack && selectedTrack.cues.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {selectedTrack.cues.map((cue, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => engine.jumpToCue(idx)}
                className="text-xs"
              >
                {idx + 1}. {cue.label} ({formatTime(cue.time)})
              </Button>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="outline"
            onClick={() => engine.seek(0)}
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            size="lg"
            onClick={handlePlayPause}
            className="bg-primary hover:bg-primary/90"
          >
            {state.isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>

          <Button
            size="icon"
            variant="outline"
            onClick={() => engine.seek(state.currentTime + 10)}
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          {/* Time display */}
          <div className="flex-1 text-center font-mono text-sm">
            {formatTime(state.currentTime)} / {formatTime(state.duration)}
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 w-32">
            <Volume2 className="h-4 w-4" />
            <Slider
              value={[state.volume * 100]}
              onValueChange={([value]) => engine.setVolume(value / 100)}
              max={100}
              step={1}
            />
          </div>
        </div>

        {/* Fade controls */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleFadeToggle}
            className="flex-1"
          >
            Fade {state.isPlaying ? 'Out' : 'In'}
          </Button>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="text-xs text-muted-foreground text-center">
          Raccourcis: Space/P = Play/Pause • ↑/↓ = Volume • F = Fade • 1-8 = Cues
        </div>
      </div>
    </Card>
  );
};

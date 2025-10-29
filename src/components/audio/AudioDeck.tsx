/**
 * AudioDeck - Interface deck audio pro pour la régie
 * Waveform, cue points, hotkeys, fade controls
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, SkipBack, SkipForward, Volume2, TrendingUp, TrendingDown, Zap } from 'lucide-react';
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
  const [fadeInDuration, setFadeInDuration] = useState(300);
  const [fadeOutDuration, setFadeOutDuration] = useState(300);

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
        case 'i':
          handleFadeIn();
          break;
        case 'o':
          handleFadeOut();
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

  const handleFadeIn = async () => {
    if (selectedTrack) {
      await engine.loadAndPlay(selectedTrack);
      await engine.fadeIn(fadeInDuration);
      toast({ title: `🔊 Fade in ${fadeInDuration}ms` });
    }
  };

  const handleFadeOut = async () => {
    if (state.isPlaying) {
      await engine.stopWithFade(fadeOutDuration);
      toast({ title: `🔉 Fade out ${fadeOutDuration}ms` });
    }
  };

  const handleClip30s = async () => {
    if (!selectedTrack) return;
    await engine.loadAndPlay(selectedTrack);
    await engine.playClip30s(fadeOutDuration);
    onTrackChange?.(selectedTrack);
    toast({ title: '🎵 Extrait 30s lancé' });
  };

  const handlePlaySolution = async () => {
    if (!selectedTrack) return;
    if (!state.currentTrack || state.currentTrack.id !== selectedTrack.id) {
      await engine.loadAndPlay(selectedTrack);
    }
    await engine.playSolution(8, fadeInDuration, fadeOutDuration);
    toast({ title: '🎼 Solution lancée (8s)' });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-4 bg-card/90 backdrop-blur-sm border-primary/20">
      <div className="space-y-3">
        {/* Header: Track selector + Status */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2 flex-wrap flex-1">
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
          {state.isPlaying && (
            <Badge variant="default" className="animate-pulse">
              <Zap className="h-3 w-3 mr-1" />
              EN COURS
            </Badge>
          )}
        </div>

        {/* Waveform with Cue Points */}
        <div className="relative h-20 bg-muted/50 rounded-lg overflow-hidden border border-border">
          <canvas 
            ref={canvasRef}
            className="w-full h-full"
          />
          
          {/* Playhead */}
          {state.duration > 0 && (
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-primary shadow-lg z-20"
              style={{ 
                left: `${(state.currentTime / state.duration) * 100}%` 
              }}
            />
          )}
          
          {/* Cue markers on waveform */}
          {selectedTrack && selectedTrack.cues.length > 0 && state.duration > 0 && (
            <>
              {selectedTrack.cues.map((cue, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0 w-0.5 bg-accent/60 hover:bg-accent cursor-pointer z-10"
                  style={{ 
                    left: `${(cue.time / state.duration) * 100}%` 
                  }}
                  onClick={() => engine.jumpToCue(idx)}
                  title={`${cue.label} - ${formatTime(cue.time)}`}
                >
                  <div className="absolute -top-5 left-0 transform -translate-x-1/2 text-[10px] font-bold text-accent whitespace-nowrap">
                    {idx + 1}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Main Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => engine.seek(0)}
            className="h-9 w-9"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            onClick={handlePlayPause}
            className="bg-primary hover:bg-primary/90 h-11 w-11"
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
            className="h-9 w-9"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          {/* Time display */}
          <div className="flex-1 text-center font-mono text-sm font-bold">
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

        {/* Cue Points Buttons */}
        {selectedTrack && selectedTrack.cues.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {selectedTrack.cues.map((cue, idx) => (
              <Button
                key={idx}
                variant="secondary"
                size="sm"
                onClick={() => engine.jumpToCue(idx)}
                className="text-xs font-mono"
              >
                CUE {idx + 1}: {cue.label} ({formatTime(cue.time)})
              </Button>
            ))}
          </div>
        )}

        {/* Fade Controls */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border border-border">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Fade In</span>
              <span className="text-xs font-mono">{fadeInDuration}ms</span>
            </div>
            <Slider
              value={[fadeInDuration]}
              onValueChange={([value]) => setFadeInDuration(value)}
              min={100}
              max={2000}
              step={50}
              className="w-full"
            />
            <Button
              size="sm"
              onClick={handleFadeIn}
              disabled={!selectedTrack}
              className="w-full"
              variant="outline"
            >
              <TrendingUp className="h-3 w-3 mr-2" />
              Fade In
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Fade Out</span>
              <span className="text-xs font-mono">{fadeOutDuration}ms</span>
            </div>
            <Slider
              value={[fadeOutDuration]}
              onValueChange={([value]) => setFadeOutDuration(value)}
              min={100}
              max={2000}
              step={50}
              className="w-full"
            />
            <Button
              size="sm"
              onClick={handleFadeOut}
              disabled={!state.isPlaying}
              className="w-full"
              variant="outline"
            >
              <TrendingDown className="h-3 w-3 mr-2" />
              Fade Out
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleClip30s}
            disabled={!selectedTrack}
            className="bg-accent hover:bg-accent/90"
          >
            🎵 Extrait 30s (CUE#1)
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handlePlaySolution}
            disabled={!selectedTrack}
            className="bg-secondary hover:bg-secondary/90"
          >
            🎼 Solution 8s (CUE#2)
          </Button>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="text-[10px] text-muted-foreground text-center pt-1 border-t border-border/50">
          ⌨️ Space/P: Play/Pause • ↑/↓: Volume • I: Fade In • O: Fade Out • 1-8: Cues
        </div>
      </div>
    </Card>
  );
};

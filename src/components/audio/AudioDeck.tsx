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
    console.log('📦 AudioDeck: Préchargement de', tracks.length, 'tracks...');
    const preloadPromises = tracks.map(track => {
      return engine.preloadTrack(track)
        .then(() => {
          console.log('✅ Préchargé:', track.name);
        })
        .catch(err => {
          console.error('❌ Échec préchargement:', track.name, err);
          toast({ 
            title: `❌ Erreur: ${track.name}`,
            description: `Impossible de charger le fichier. Vérifiez l'URL.`,
            variant: 'destructive'
          });
        });
    });

    Promise.all(preloadPromises).then(() => {
      console.log('✅ Tous les fichiers audio sont préchargés');
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

    try {
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
    } catch (error) {
      console.error('Erreur lecture audio:', error);
      toast({ 
        title: '❌ Erreur audio', 
        description: 'Impossible de lire le fichier. Vérifiez l\'URL.',
        variant: 'destructive' 
      });
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
    <Card className="p-3 bg-card/90 backdrop-blur-sm border-primary/20">
      <div className="space-y-2">
        {/* Header: Track selector + Status - Compact */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1 flex-wrap flex-1 max-h-16 overflow-y-auto">
            {tracks.map((track) => (
              <Button
                key={track.id}
                variant={selectedTrack?.id === track.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTrack(track)}
                className="text-xs h-7 px-2"
              >
                {track.name}
              </Button>
            ))}
          </div>
          {state.isPlaying && (
            <Badge variant="default" className="animate-pulse text-xs">
              <Zap className="h-3 w-3 mr-1" />
              PLAY
            </Badge>
          )}
        </div>

        {/* Waveform with Cue Points - Compact */}
        <div className="relative h-12 bg-muted/50 rounded overflow-hidden border border-border">
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

        {/* Main Controls - Compact */}
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => engine.seek(0)}
            className="h-8 w-8"
          >
            <SkipBack className="h-3 w-3" />
          </Button>

          <Button
            size="icon"
            onClick={handlePlayPause}
            className="bg-primary hover:bg-primary/90 h-9 w-9"
          >
            {state.isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Button
            size="icon"
            variant="outline"
            onClick={() => engine.seek(state.currentTime + 10)}
            className="h-8 w-8"
          >
            <SkipForward className="h-3 w-3" />
          </Button>

          {/* Time display */}
          <div className="flex-1 text-center font-mono text-xs font-bold">
            {formatTime(state.currentTime)} / {formatTime(state.duration)}
          </div>

          {/* Volume - Compact */}
          <div className="flex items-center gap-1 w-24">
            <Volume2 className="h-3 w-3" />
            <Slider
              value={[state.volume * 100]}
              onValueChange={([value]) => engine.setVolume(value / 100)}
              max={100}
              step={1}
            />
          </div>
        </div>

        {/* Quick Actions & Cues - Compact en 1 ligne */}
        <div className="flex gap-2 items-center flex-wrap">
          <Button
            variant="default"
            size="sm"
            onClick={handleClip30s}
            disabled={!selectedTrack}
            className="bg-accent hover:bg-accent/90 h-7 text-xs"
          >
            🎵 Extrait 30s
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handlePlaySolution}
            disabled={!selectedTrack}
            className="bg-secondary hover:bg-secondary/90 h-7 text-xs"
          >
            🎼 Solution 8s
          </Button>
          
          {/* Cue Points en ligne */}
          {selectedTrack && selectedTrack.cues.length > 0 && (
            <>
              <div className="h-4 w-px bg-border mx-1" />
              {selectedTrack.cues.map((cue, idx) => (
                <Button
                  key={idx}
                  variant="secondary"
                  size="sm"
                  onClick={() => engine.jumpToCue(idx)}
                  className="text-xs font-mono h-7 px-2"
                >
                  CUE{idx + 1}
                </Button>
              ))}
            </>
          )}
          
          {/* Fades en ligne */}
          <div className="h-4 w-px bg-border mx-1" />
          <Button
            size="sm"
            onClick={handleFadeIn}
            disabled={!selectedTrack}
            variant="outline"
            className="h-7 text-xs"
          >
            <TrendingUp className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            onClick={handleFadeOut}
            disabled={!state.isPlaying}
            variant="outline"
            className="h-7 text-xs"
          >
            <TrendingDown className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

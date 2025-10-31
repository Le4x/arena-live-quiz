/**
 * AudioDeck - Interface deck audio pro pour la régie
 * Waveform avancée avec zones extrait/solution visuelles
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, SkipBack, SkipForward, Volume2, TrendingUp, TrendingDown, Zap, Music } from 'lucide-react';
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
    // Précharger seulement les tracks si on en a
    if (tracks.length === 0) {
      console.log('📦 AudioDeck: Aucune track à précharger');
      return;
    }
    
    console.log('📦 AudioDeck: Préchargement de', tracks.length, 'track(s)...');
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

  // Dessiner la waveform et les zones
  useEffect(() => {
    if (!canvasRef.current || !selectedTrack || state.duration === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions
    const width = canvas.width;
    const height = canvas.height;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = 'hsl(var(--muted))';
    ctx.fillRect(0, 0, width, height);

    // Calculer les positions des zones
    const cue1 = selectedTrack.cues[0]?.time || 0;
    const cue2 = selectedTrack.cues[1]?.time || (cue1 + 30);
    const extractEnd = cue1 + 30;
    const solutionEnd = Math.min(state.duration, cue2 + 30);

    // Zone extrait (CUE1 à CUE1+30s) - Vert
    const extractStart = (cue1 / state.duration) * width;
    const extractWidth = ((extractEnd - cue1) / state.duration) * width;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.2)'; // green-500 avec transparence
    ctx.fillRect(extractStart, 0, extractWidth, height);
    
    // Bordure gauche extrait
    ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.fillRect(extractStart, 0, 3, height);

    // Zone solution (CUE2 à CUE2+30s) - Bleu
    const solutionStart = (cue2 / state.duration) * width;
    const solutionWidth = ((solutionEnd - cue2) / state.duration) * width;
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)'; // blue-500 avec transparence
    ctx.fillRect(solutionStart, 0, solutionWidth, height);
    
    // Bordure gauche solution
    ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.fillRect(solutionStart, 0, 3, height);

    // Dessiner une fausse waveform (barres aléatoires)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    const barCount = 100;
    const barWidth = width / barCount;
    for (let i = 0; i < barCount; i++) {
      const barHeight = (Math.random() * 0.5 + 0.3) * height;
      const x = i * barWidth;
      const y = (height - barHeight) / 2;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }

    // Labels des zones
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = 'rgba(34, 197, 94, 1)';
    ctx.fillText('EXTRAIT', extractStart + 5, 15);
    
    ctx.fillStyle = 'rgba(59, 130, 246, 1)';
    ctx.fillText('SOLUTION', solutionStart + 5, 15);

  }, [selectedTrack, state.duration]);

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
    // Calculer la durée de la solution : si on a au moins 2 cue points, 
    // on utilise l'espace entre eux, sinon 30s par défaut
    let solutionDuration = 30; // Par défaut 30 secondes
    if (selectedTrack.cues.length >= 2) {
      const cue1 = selectedTrack.cues[0].time;
      const cue2 = selectedTrack.cues[1].time;
      solutionDuration = cue2 - cue1;
    }
    await engine.playSolution(solutionDuration, fadeInDuration, fadeOutDuration);
    toast({ title: `🎼 Solution lancée (${solutionDuration}s)` });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-card via-card/95 to-muted/30 backdrop-blur-sm border-primary/30 shadow-lg">
      <div className="space-y-3">
        {/* Header: Track info + Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">
                {selectedTrack?.name || 'Aucun son sélectionné'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {selectedTrack ? `${selectedTrack.cues.length} cue points` : 'Sélectionnez un son'}
              </p>
            </div>
          </div>
          {state.isPlaying && (
            <Badge variant="default" className="animate-pulse">
              <Zap className="h-4 w-4 mr-1" />
              EN LECTURE
            </Badge>
          )}
        </div>

        {/* Track selector */}
        {tracks.length > 1 && (
          <div className="flex gap-2 flex-wrap p-2 bg-muted/30 rounded-lg border border-border">
            {tracks.map((track) => (
              <Button
                key={track.id}
                variant={selectedTrack?.id === track.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTrack(track)}
                className="text-xs h-8"
              >
                {track.name}
              </Button>
            ))}
          </div>
        )}

        {/* Waveform avancée avec zones visuelles */}
        <div className="relative h-32 bg-gradient-to-b from-muted/80 to-muted/40 rounded-lg overflow-hidden border-2 border-border shadow-inner">
          <canvas 
            ref={canvasRef}
            width={800}
            height={128}
            className="w-full h-full"
          />
          
          {/* Playhead avec indicateur de temps */}
          {state.duration > 0 && (
            <>
              <div 
                className="absolute top-0 bottom-0 w-1 bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)] z-30 transition-all duration-75"
                style={{ 
                  left: `${(state.currentTime / state.duration) * 100}%` 
                }}
              >
                {/* Triangle en haut */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-primary" />
                {/* Temps actuel */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-mono font-bold whitespace-nowrap shadow-lg">
                  {formatTime(state.currentTime)}
                </div>
              </div>
            </>
          )}
          
          {/* Marqueurs CUE avec labels améliorés */}
          {selectedTrack && selectedTrack.cues.length > 0 && state.duration > 0 && (
            <>
              {selectedTrack.cues.map((cue, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-accent via-accent to-transparent cursor-pointer hover:w-2 transition-all z-20 group"
                  style={{ 
                    left: `${(cue.time / state.duration) * 100}%` 
                  }}
                  onClick={() => engine.jumpToCue(idx)}
                  title={`${cue.label} - ${formatTime(cue.time)}`}
                >
                  {/* Badge CUE */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-2 py-1 rounded-md text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-accent/20">
                    CUE {idx + 1}: {cue.label}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Légende des zones */}
          <div className="absolute bottom-2 left-2 right-2 flex justify-between text-xs font-medium">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-2 py-1 rounded">
              <div className="w-3 h-3 bg-green-500/80 rounded" />
              <span className="text-white">Extrait (30s)</span>
            </div>
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-2 py-1 rounded">
              <div className="w-3 h-3 bg-blue-500/80 rounded" />
              <span className="text-white">Solution</span>
            </div>
          </div>
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
            🎼 Solution
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

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, Volume2, ArrowLeft, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { playSound } from "@/lib/sounds";

const RegieSound = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    loadGameState();
    
    const gameStateChannel = supabase
      .channel('sound-game-state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, () => {
        loadGameState();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(gameStateChannel);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentQuestion]);

  const loadGameState = async () => {
    const { data } = await supabase
      .from('game_state')
      .select('*, questions(*)')
      .maybeSingle();
    if (data) {
      setGameState(data);
      setCurrentQuestion(data.questions);
    }
  };

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      toast({ title: "🎵 Musique lancée" });
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      toast({ title: "⏸️ Musique en pause" });
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-glow p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between py-3 animate-slide-in">
          <Button 
            onClick={() => navigate('/regie')}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold bg-gradient-arena bg-clip-text text-transparent animate-pulse-glow">
              RÉGIE SON
            </h1>
            <p className="text-muted-foreground text-sm">Gestion audio & effets sonores</p>
          </div>
          <div className="w-24" />
        </header>

        {/* Question actuelle */}
        {currentQuestion && (
          <Card className="p-6 bg-gradient-to-r from-secondary/20 to-accent/20 backdrop-blur-sm border-secondary shadow-glow-blue animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                <Music className="h-6 w-6 text-secondary" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-secondary mb-1">QUESTION ACTUELLE</h2>
                <p className="text-xl font-semibold mb-2">{currentQuestion.question_text}</p>
                <div className="flex gap-3 items-center text-sm text-muted-foreground">
                  <span className="font-medium">{currentQuestion.question_type}</span>
                  <span>•</span>
                  <span className="font-bold text-primary">{currentQuestion.points} pts</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Contrôles audio principaux */}
        {currentQuestion?.audio_url ? (
          <Card className="p-8 bg-card/90 backdrop-blur-sm border-secondary/20 animate-scale-in">
            <div className="space-y-6">
              <div className="text-center">
                <Volume2 className="h-16 w-16 mx-auto text-secondary mb-4" />
                <h3 className="text-2xl font-bold mb-2">Lecteur Audio</h3>
              </div>

              {/* Barre de progression */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-arena transition-all duration-300"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Boutons de contrôle */}
              <div className="flex justify-center gap-4">
                <Button 
                  size="lg"
                  className="h-20 w-40 bg-gradient-arena hover:opacity-90 text-lg font-bold shadow-glow-gold"
                  onClick={playAudio}
                  disabled={isPlaying}
                >
                  <Play className="mr-2 h-6 w-6" />
                  Lecture
                </Button>
                <Button 
                  size="lg"
                  variant="secondary"
                  className="h-20 w-40 text-lg font-bold shadow-glow-blue"
                  onClick={pauseAudio}
                  disabled={!isPlaying}
                >
                  <Pause className="mr-2 h-6 w-6" />
                  Pause
                </Button>
              </div>

              <audio ref={audioRef} src={currentQuestion.audio_url} />
            </div>
          </Card>
        ) : (
          <Card className="p-12 bg-card/80 backdrop-blur-sm border-muted text-center animate-fade-in">
            <Music className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-xl text-muted-foreground">
              {currentQuestion 
                ? "Cette question n'a pas de fichier audio"
                : "Aucune question sélectionnée"
              }
            </p>
          </Card>
        )}

        {/* Effets sonores */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-accent/20 animate-fade-in">
          <h3 className="text-lg font-bold text-accent mb-4 flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Effets Sonores
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <Button
              size="lg"
              className="h-16 bg-primary hover:bg-primary/90 text-white font-bold"
              onClick={() => {
                playSound('buzz');
                toast({ title: "🔔 Buzzer" });
              }}
            >
              🔔 Buzzer
            </Button>
            <Button
              size="lg"
              className="h-16 bg-green-600 hover:bg-green-700 text-white font-bold"
              onClick={() => {
                playSound('correct');
                toast({ title: "✅ Bonne réponse" });
              }}
            >
              ✅ Bonne
            </Button>
            <Button
              size="lg"
              className="h-16 bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={() => {
                playSound('incorrect');
                toast({ title: "❌ Mauvaise" });
              }}
            >
              ❌ Mauvaise
            </Button>
          </div>
        </Card>

        {/* Info */}
        <div className="text-center text-xs text-muted-foreground animate-fade-in">
          <p>Utilisez cette régie pour gérer uniquement l'audio du jeu</p>
        </div>
      </div>
    </div>
  );
};

export default RegieSound;

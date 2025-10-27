import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, SkipForward, Trophy, Zap, Clock, Music, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RoundCreator } from "@/components/RoundCreator";
import { QuestionCreator } from "@/components/QuestionCreator";
import { BuzzerMonitor } from "@/components/BuzzerMonitor";

const Regie = () => {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [gameState, setGameState] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [rounds, setRounds] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [timerValue, setTimerValue] = useState(30);

  useEffect(() => {
    loadTeams();
    loadGameState();
    loadRounds();
    loadQuestions();
    
    // Realtime subscriptions
    const teamsChannel = supabase
      .channel('teams-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        loadTeams();
      })
      .subscribe();

    const gameStateChannel = supabase
      .channel('game-state-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, () => {
        loadGameState();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(gameStateChannel);
    };
  }, []);

  const loadTeams = async () => {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .order('score', { ascending: false });
    if (data) setTeams(data);
  };

  const loadGameState = async () => {
    const { data } = await supabase
      .from('game_state')
      .select('*, questions(*)')
      .single();
    if (data) {
      setGameState(data);
      setCurrentQuestion(data.questions);
    }
  };

  const toggleBuzzer = async () => {
    if (!gameState) return;
    
    const { error } = await supabase
      .from('game_state')
      .update({ is_buzzer_active: !gameState.is_buzzer_active })
      .eq('id', gameState.id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'activer le buzzer",
        variant: "destructive"
      });
    } else {
      toast({
        title: gameState.is_buzzer_active ? "Buzzer désactivé" : "Buzzer activé",
        description: gameState.is_buzzer_active ? "Les buzzers sont maintenant désactivés" : "Les équipes peuvent buzzer !",
      });
    }
  };

  const showLeaderboard = async () => {
    if (!gameState) return;
    
    await supabase
      .from('game_state')
      .update({ show_leaderboard: !gameState.show_leaderboard })
      .eq('id', gameState.id);

    toast({
      title: gameState.show_leaderboard ? "Classement masqué" : "Classement affiché",
    });
  };

  const loadRounds = async () => {
    const { data } = await supabase.from('rounds').select('*').order('created_at', { ascending: false });
    if (data) setRounds(data);
  };

  const loadQuestions = async () => {
    const { data } = await supabase.from('questions').select('*').order('display_order', { ascending: true });
    if (data) setQuestions(data);
  };

  const setQuestion = async (questionId: string) => {
    if (!gameState) return;
    await supabase.from('game_state').update({ current_question_id: questionId }).eq('id', gameState.id);
    toast({ title: "Question chargée" });
  };

  const nextQuestion = async () => {
    if (!currentQuestion || !selectedRound) return;
    
    const roundQuestions = questions.filter(q => q.round_id === selectedRound);
    const currentIndex = roundQuestions.findIndex(q => q.id === currentQuestion.id);
    
    if (currentIndex < roundQuestions.length - 1) {
      await setQuestion(roundQuestions[currentIndex + 1].id);
    } else {
      toast({ title: "Dernière question", description: "C'est la fin de cette manche", variant: "destructive" });
    }
  };

  const startTimer = async () => {
    if (!gameState) return;
    await supabase.from('game_state').update({ 
      timer_active: true, 
      timer_remaining: timerValue 
    }).eq('id', gameState.id);
    toast({ title: "Chrono lancé" });
  };

  const stopTimer = async () => {
    if (!gameState) return;
    await supabase.from('game_state').update({ timer_active: false }).eq('id', gameState.id);
    toast({ title: "Chrono arrêté" });
  };

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
      toast({ title: "Musique lancée" });
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      toast({ title: "Musique en pause" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-glow p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="text-center py-8 animate-slide-in">
          <h1 className="text-6xl font-bold bg-gradient-arena bg-clip-text text-transparent animate-pulse-glow">
            ARENA
          </h1>
          <p className="text-muted-foreground text-xl mt-2">Régie - MusicArena #1</p>
        </header>

        {/* Contrôles principaux */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20">
          <h2 className="text-2xl font-bold text-primary mb-4">Contrôles du jeu</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Button 
              size="lg" 
              className="h-20 bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-gold"
              onClick={toggleBuzzer}
            >
              <Zap className="mr-2 h-6 w-6" />
              {gameState?.is_buzzer_active ? "Désactiver" : "Activer"} Buzzer
            </Button>
            <Button 
              size="lg" 
              variant="secondary" 
              className="h-20 bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-glow-blue"
              onClick={playAudio}
              disabled={!currentQuestion?.audio_url}
            >
              <Play className="mr-2 h-6 w-6" />
              Musique
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="h-20 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
              onClick={pauseAudio}
            >
              <Pause className="mr-2 h-6 w-6" />
              Pause
            </Button>
            <Button 
              size="lg" 
              className="h-20 bg-gradient-arena hover:opacity-90"
              onClick={showLeaderboard}
            >
              <Trophy className="mr-2 h-6 w-6" />
              {gameState?.show_leaderboard ? "Masquer" : "Afficher"} Score
            </Button>
            <Button 
              size="lg" 
              variant="secondary"
              className="h-20"
              onClick={nextQuestion}
            >
              <SkipForward className="mr-2 h-6 w-6" />
              Question Suivante
            </Button>
          </div>
          {currentQuestion?.audio_url && (
            <audio ref={audioRef} src={currentQuestion.audio_url} />
          )}
        </Card>

        {/* Gestion du chrono */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-accent/20">
          <h2 className="text-2xl font-bold text-accent mb-4 flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Chronomètre
          </h2>
          <div className="flex gap-4 items-center">
            <input
              type="number"
              value={timerValue}
              onChange={(e) => setTimerValue(parseInt(e.target.value))}
              className="w-24 h-12 rounded-md border border-border bg-input px-3 text-center text-xl font-bold"
            />
            <Button onClick={startTimer} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              Démarrer {timerValue}s
            </Button>
            <Button onClick={stopTimer} variant="outline">
              Arrêter
            </Button>
            {gameState?.timer_active && (
              <div className="text-3xl font-bold text-accent ml-4">
                {gameState.timer_remaining}s
              </div>
            )}
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <RoundCreator onRoundCreated={loadRounds} />
          <QuestionCreator rounds={rounds} onQuestionCreated={loadQuestions} />
        </div>

        {/* Sélection de la manche et questions */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-secondary/20">
          <h2 className="text-2xl font-bold text-secondary mb-4 flex items-center gap-2">
            <List className="h-6 w-6" />
            Questions disponibles
          </h2>
          <div className="mb-4">
            <select
              value={selectedRound || ""}
              onChange={(e) => setSelectedRound(e.target.value)}
              className="w-full h-12 rounded-md border border-border bg-input px-3"
            >
              <option value="">Sélectionner une manche</option>
              {rounds.map((round) => (
                <option key={round.id} value={round.id}>{round.title}</option>
              ))}
            </select>
          </div>
          {selectedRound && (
            <div className="grid gap-3">
              {questions.filter(q => q.round_id === selectedRound).map((question) => (
                <div
                  key={question.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    currentQuestion?.id === question.id
                      ? 'border-secondary bg-secondary/10'
                      : 'border-border bg-muted/50 hover:border-secondary/50'
                  }`}
                  onClick={() => setQuestion(question.id)}
                >
                  <div className="flex items-center gap-3">
                    {question.audio_url && <Music className="h-5 w-5 text-secondary" />}
                    <div className="flex-1">
                      <div className="font-bold">{question.question_text}</div>
                      <div className="text-sm text-muted-foreground">
                        {question.question_type} • {question.points} pts
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <BuzzerMonitor currentQuestionId={currentQuestion?.id} />

        {/* Équipes connectées */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-secondary/20">
          <h2 className="text-2xl font-bold text-secondary mb-4">
            Équipes connectées ({teams.length}/30)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="p-4 rounded-lg border border-border bg-muted/50 hover:bg-muted/80 transition-colors"
                style={{ borderLeftColor: team.color, borderLeftWidth: '4px' }}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">{team.name}</h3>
                  <span className="text-2xl font-bold text-primary">{team.score}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {team.is_active ? "🟢 Actif" : "🔴 Inactif"}
                </div>
              </div>
            ))}
            {teams.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Aucune équipe connectée
              </div>
            )}
          </div>
        </Card>

        {/* Question actuelle */}
        {currentQuestion && (
          <Card className="p-6 bg-card/80 backdrop-blur-sm border-accent/20">
            <h2 className="text-2xl font-bold text-accent mb-4">Question actuelle</h2>
            <p className="text-xl">{currentQuestion.question_text}</p>
            <div className="mt-4 text-sm text-muted-foreground">
              Type: {currentQuestion.question_type} • Points: {currentQuestion.points}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Regie;

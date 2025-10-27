import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, SkipForward, Trophy, Zap, Clock, Music, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BuzzerMonitor } from "@/components/BuzzerMonitor";
import { TextAnswersDisplay } from "@/components/TextAnswersDisplay";
import { QCMAnswersDisplay } from "@/components/QCMAnswersDisplay";
import { useNavigate } from "react-router-dom";
import { playSound } from "@/lib/sounds";

const Regie = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [gameState, setGameState] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [rounds, setRounds] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [buzzers, setBuzzers] = useState<any[]>([]);
  const [hasStoppedForBuzzer, setHasStoppedForBuzzer] = useState(false);

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

    const buzzersChannel = supabase
      .channel('regie-buzzers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buzzer_attempts' }, () => {
        loadBuzzers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(gameStateChannel);
      supabase.removeChannel(buzzersChannel);
    };
  }, []);

  useEffect(() => {
    loadBuzzers();
    setHasStoppedForBuzzer(false);
  }, [currentQuestion?.id]);

  useEffect(() => {
    // Arrêter automatiquement musique et chrono au premier buzzer
    if (buzzers.length > 0 && !hasStoppedForBuzzer && gameState?.is_buzzer_active) {
      pauseAudio();
      stopTimer();
      setHasStoppedForBuzzer(true);
      toast({
        title: "🔔 BUZZER !",
        description: `${buzzers[0].teams?.name} a buzzé en premier !`,
      });
    }
  }, [buzzers.length, hasStoppedForBuzzer]);

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
      .maybeSingle();
    if (data) {
      setGameState(data);
      setCurrentQuestion(data.questions);
    }
  };

  const loadBuzzers = async () => {
    if (!currentQuestion?.id || !gameState?.game_session_id) {
      setBuzzers([]);
      return;
    }
    
    const { data } = await supabase
      .from('buzzer_attempts')
      .select('*, teams(*)')
      .eq('question_id', currentQuestion.id)
      .eq('game_session_id', gameState.game_session_id)
      .order('buzzed_at', { ascending: true });
    
    if (data) setBuzzers(data);
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
    // Charger uniquement les manches de la session active si elle existe
    const { data: activeSession } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("status", "active")
      .maybeSingle();

    if (activeSession && Array.isArray(activeSession.selected_rounds) && activeSession.selected_rounds.length > 0) {
      const selectedRoundsArray = activeSession.selected_rounds as string[];
      const { data } = await supabase
        .from('rounds')
        .select('*')
        .in('id', selectedRoundsArray)
        .order('created_at', { ascending: false });
      if (data) setRounds(data);
    } else {
      // Si pas de session active, charger toutes les manches
      const { data } = await supabase
        .from('rounds')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setRounds(data);
    }
  };

  const loadQuestions = async () => {
    const { data } = await supabase.from('questions').select('*').order('display_order', { ascending: true });
    if (data) setQuestions(data);
  };

  const setQuestion = async (questionId: string) => {
    if (!gameState) return;
    
    // Supprimer les anciens buzzers de cette question
    await supabase
      .from('buzzer_attempts')
      .delete()
      .eq('question_id', questionId)
      .eq('game_session_id', gameState.game_session_id);
    
    // Trouver la question pour obtenir sa durée
    const question = questions.find(q => q.id === questionId);
    const round = rounds.find(r => r.id === question?.round_id);
    
    await supabase.from('game_state').update({ 
      current_question_id: questionId,
      timer_active: true,
      timer_remaining: round?.timer_duration || 30,
      excluded_teams: [], // Réinitialiser les équipes exclues pour la nouvelle question
      answer_result: null // Réinitialiser le résultat de réponse
    }).eq('id', gameState.id);
    
    toast({ title: "Question chargée et chrono lancé" });
  };

  const nextQuestion = async () => {
    if (!currentQuestion || !gameState?.game_session_id) return;
    
    // Supprimer tous les buzzers de la question actuelle avant de passer à la suivante
    await supabase
      .from('buzzer_attempts')
      .delete()
      .eq('question_id', currentQuestion.id)
      .eq('game_session_id', gameState.game_session_id);
    
    // Récupérer la session active pour avoir les manches sélectionnées
    const { data: activeSession } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", gameState.game_session_id)
      .single();

    if (!activeSession || !Array.isArray(activeSession.selected_rounds)) {
      toast({ 
        title: "Erreur", 
        description: "Impossible de charger la session", 
        variant: "destructive" 
      });
      return;
    }

    const selectedRoundsArray = activeSession.selected_rounds as string[];
    
    // Récupérer toutes les questions des manches de la session
    const { data: allQuestions } = await supabase
      .from('questions')
      .select('*')
      .in('round_id', selectedRoundsArray)
      .order('display_order', { ascending: true });

    if (!allQuestions || allQuestions.length === 0) {
      toast({ 
        title: "Aucune question", 
        description: "Cette session n'a pas de questions", 
        variant: "destructive" 
      });
      return;
    }

    const currentIndex = allQuestions.findIndex(q => q.id === currentQuestion.id);
    
    if (currentIndex < allQuestions.length - 1) {
      const nextQ = allQuestions[currentIndex + 1];
      await setQuestion(nextQ.id);
    } else {
      toast({ 
        title: "Fin de la session", 
        description: "C'était la dernière question", 
        variant: "destructive" 
      });
    }
  };

  const startTimer = async () => {
    if (!gameState) return;
    const round = rounds.find(r => r.id === currentQuestion?.round_id);
    const duration = round?.timer_duration || 30;
    
    await supabase.from('game_state').update({ 
      timer_active: true, 
      timer_remaining: duration
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

  const validateAnswer = async (teamId: string, isCorrect: boolean) => {
    const points = isCorrect ? (currentQuestion?.points || 10) : -(currentQuestion?.points || 10) / 2;
    
    // Jouer le son et afficher le résultat sur l'écran
    playSound(isCorrect ? 'correct' : 'incorrect');
    
    // Update team score
    const team = teams.find(t => t.id === teamId);
    if (team) {
      await supabase
        .from('teams')
        .update({ score: team.score + points })
        .eq('id', teamId);
    }

    if (isCorrect) {
      // Bonne réponse : désactiver le buzzer, afficher le résultat et supprimer les tentatives
      await supabase
        .from('game_state')
        .update({ 
          is_buzzer_active: false,
          answer_result: 'correct'
        })
        .eq('id', gameState.id);
      
      await clearBuzzers();
      
      toast({
        title: "✅ Bonne réponse !",
        description: `+${points} points`,
      });
      
      // Réinitialiser l'affichage après 3 secondes
      setTimeout(async () => {
        await supabase
          .from('game_state')
          .update({ answer_result: null })
          .eq('id', gameState.id);
      }, 3000);
    } else {
      // Mauvaise réponse : exclure cette équipe, afficher le résultat mais garder le buzzer actif
      const excludedTeams = (gameState.excluded_teams || []) as string[];
      excludedTeams.push(teamId);
      
      await supabase
        .from('game_state')
        .update({ 
          excluded_teams: excludedTeams,
          answer_result: 'incorrect'
        })
        .eq('id', gameState.id);
      
      await clearBuzzers();
      
      toast({
        title: "❌ Mauvaise réponse",
        description: `${points} points - Relancez le buzzer`,
      });
      
      // Réinitialiser l'affichage après 2 secondes
      setTimeout(async () => {
        await supabase
          .from('game_state')
          .update({ answer_result: null })
          .eq('id', gameState.id);
      }, 2000);
    }
  };

  const resetBuzzerForQuestion = async () => {
    if (!gameState) return;
    
    // Réinitialiser la liste des équipes exclues
    await supabase
      .from('game_state')
      .update({ excluded_teams: [] })
      .eq('id', gameState.id);
    
    await clearBuzzers();
    
    toast({
      title: "Buzzer réinitialisé",
      description: "Toutes les équipes peuvent à nouveau buzzer",
    });
  };

  const clearBuzzers = async () => {
    if (!currentQuestion?.id || !gameState?.game_session_id) return;
    
    await supabase
      .from('buzzer_attempts')
      .delete()
      .eq('question_id', currentQuestion.id)
      .eq('game_session_id', gameState.game_session_id);

    toast({ title: "Buzzers réinitialisés" });
  };

  return (
    <div className="min-h-screen bg-gradient-glow p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between py-8 animate-slide-in">
          <div className="text-center flex-1">
            <h1 className="text-6xl font-bold bg-gradient-arena bg-clip-text text-transparent animate-pulse-glow">
              ARENA
            </h1>
            <p className="text-muted-foreground text-xl mt-2">Régie - MusicArena #1</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => navigate('/admin/setup')} variant="outline" size="lg">
              Configuration
            </Button>
            <Button onClick={() => navigate('/admin/sounds')} variant="outline" size="lg">
              Sons
            </Button>
          </div>
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

        {/* Premier buzzeur - Validation */}
        {buzzers.length > 0 && currentQuestion?.question_type === 'blind_test' && (
          <Card className="p-6 bg-card/90 backdrop-blur-sm border-4 border-primary shadow-glow-gold animate-slide-in">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <Zap className="h-12 w-12 text-primary animate-pulse" />
                    <div>
                      <h3 className="text-lg text-primary font-bold">🔔 QUELQU'UN A BUZZÉ !</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <div
                          className="w-8 h-8 rounded-full border-2 border-foreground"
                          style={{ backgroundColor: buzzers[0].teams?.color }}
                        ></div>
                        <p className="text-4xl font-bold">{buzzers[0].teams?.name}</p>
                      </div>
                    </div>
                  </div>
                  {buzzers.length > 1 && (
                    <div className="text-sm text-muted-foreground">
                      +{buzzers.length - 1} autre{buzzers.length > 2 ? 's' : ''} buzzeur{buzzers.length > 2 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  size="lg"
                  className="h-16 px-8 bg-green-600 hover:bg-green-700 text-white text-lg"
                  onClick={() => validateAnswer(buzzers[0].team_id, true)}
                >
                  ✅ Bonne réponse
                </Button>
                <Button
                  size="lg"
                  className="h-16 px-8 bg-orange-600 hover:bg-orange-700 text-white text-lg"
                  onClick={() => validateAnswer(buzzers[0].team_id, false)}
                >
                  ❌ Mauvaise - Relancer
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 px-6"
                  onClick={resetBuzzerForQuestion}
                >
                  Réinitialiser tout
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Réponses - Prioritaire */}
        <QCMAnswersDisplay currentQuestion={currentQuestion} gameState={gameState} />
        
        <TextAnswersDisplay currentQuestionId={currentQuestion?.id} gameState={gameState} />

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

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SkipForward, Trophy, Zap, List, ArrowLeft, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BuzzerMonitor } from "@/components/BuzzerMonitor";
import { TextAnswersDisplay } from "@/components/TextAnswersDisplay";
import { QCMAnswersDisplay } from "@/components/QCMAnswersDisplay";
import { useNavigate } from "react-router-dom";
import { playSound } from "@/lib/sounds";

const RegieVideo = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [teams, setTeams] = useState<any[]>([]);
  const [connectedTeams, setConnectedTeams] = useState<Set<string>>(new Set());
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

    const presenceChannel = supabase.channel('team-presence');
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const connected = new Set<string>();
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.team_id) {
              connected.add(presence.team_id);
            }
          });
        });
        setConnectedTeams(connected);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(gameStateChannel);
      supabase.removeChannel(buzzersChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentQuestion?.id && gameState?.game_session_id && gameState?.is_buzzer_active) {
        loadBuzzers();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentQuestion?.id, gameState?.game_session_id, gameState?.is_buzzer_active]);

  useEffect(() => {
    if (buzzers.length > 0 && !hasStoppedForBuzzer && gameState?.is_buzzer_active) {
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
    
    await supabase
      .from('game_state')
      .update({ is_buzzer_active: !gameState.is_buzzer_active })
      .eq('id', gameState.id);

    toast({
      title: gameState.is_buzzer_active ? "Buzzer désactivé" : "Buzzer activé",
      description: gameState.is_buzzer_active ? "Les buzzers sont maintenant désactivés" : "Les équipes peuvent buzzer !",
    });
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
    
    await supabase
      .from('buzzer_attempts')
      .delete()
      .eq('question_id', questionId)
      .eq('game_session_id', gameState.game_session_id);
    
    const question = questions.find(q => q.id === questionId);
    const round = rounds.find(r => r.id === question?.round_id);
    
    await supabase.from('game_state').update({ 
      current_question_id: questionId,
      timer_active: true,
      timer_remaining: round?.timer_duration || 30,
      excluded_teams: [],
      answer_result: null
    }).eq('id', gameState.id);
    
    toast({ title: "Question chargée et chrono lancé" });
  };

  const nextQuestion = async () => {
    if (!currentQuestion || !gameState?.game_session_id) return;
    
    await supabase
      .from('buzzer_attempts')
      .delete()
      .eq('question_id', currentQuestion.id)
      .eq('game_session_id', gameState.game_session_id);
    
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

  const stopTimer = async () => {
    if (!gameState) return;
    await supabase.from('game_state').update({ timer_active: false }).eq('id', gameState.id);
    toast({ title: "Chrono arrêté" });
  };

  const validateAnswer = async (teamId: string, isCorrect: boolean) => {
    const points = isCorrect ? (currentQuestion?.points || 10) : -(currentQuestion?.points || 10) / 2;
    
    playSound(isCorrect ? 'correct' : 'incorrect');
    
    const team = teams.find(t => t.id === teamId);
    if (team) {
      await supabase
        .from('teams')
        .update({ score: team.score + points })
        .eq('id', teamId);
    }

    if (isCorrect) {
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
      
      setTimeout(async () => {
        await supabase
          .from('game_state')
          .update({ answer_result: null })
          .eq('id', gameState.id);
      }, 3000);
    } else {
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

  const resetCompleteSession = async () => {
    if (!gameState?.game_session_id) {
      toast({
        title: "Erreur",
        description: "Aucune session active",
        variant: "destructive"
      });
      return;
    }

    if (!confirm("⚠️ Êtes-vous sûr de vouloir réinitialiser complètement la session ?")) {
      return;
    }

    try {
      await supabase
        .from('teams')
        .update({ 
          is_active: false,
          connected_device_id: null,
          score: 0
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      const { error } = await supabase.rpc('reset_game_session', {
        session_id: gameState.game_session_id
      });

      if (error) throw error;

      await supabase
        .from('game_state')
        .update({ 
          current_question_id: null,
          current_round_id: null,
          timer_active: false,
          timer_remaining: null,
          is_buzzer_active: false,
          show_leaderboard: false
        })
        .eq('id', gameState.id);

      toast({
        title: "✅ Session réinitialisée",
        description: "Tous les smartphones déconnectés et données effacées",
      });

      await loadGameState();
      await loadTeams();
      setBuzzers([]);
      setHasStoppedForBuzzer(false);
      setConnectedTeams(new Set());

    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser la session",
        variant: "destructive"
      });
    }
  };

  const disconnectTeam = async (teamId: string) => {
    if (!confirm("⚠️ Êtes-vous sûr de vouloir déconnecter cette équipe ?")) {
      return;
    }

    try {
      await supabase
        .from('teams')
        .update({ 
          is_active: false,
          connected_device_id: null
        })
        .eq('id', teamId);

      toast({
        title: "✅ Équipe déconnectée",
        description: "Le smartphone a été déconnecté",
      });

      await loadTeams();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de déconnecter l'équipe",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-glow p-3">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Header */}
        <header className="flex items-center justify-between py-2 animate-slide-in">
          <Button 
            onClick={() => navigate('/regie')}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Hub
          </Button>
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold bg-gradient-arena bg-clip-text text-transparent animate-pulse-glow">
              RÉGIE JEU
            </h1>
            <p className="text-muted-foreground text-xs">Gestion du jeu - MusicArena #1</p>
          </div>
          <div className="flex gap-1">
            <Button 
              onClick={async () => {
                if (!gameState) return;
                await supabase
                  .from('game_state')
                  .update({ show_ambient_screen: false, show_welcome_screen: true })
                  .eq('id', gameState.id);
                toast({ title: "🎬 Show démarré !" });
              }}
              variant="default"
              size="sm"
              className="bg-gradient-arena hover:opacity-90"
            >
              🎬
            </Button>
            <Button 
              onClick={async () => {
                if (!gameState) return;
                await supabase
                  .from('game_state')
                  .update({ show_ambient_screen: !gameState.show_ambient_screen })
                  .eq('id', gameState.id);
              }}
              variant={gameState?.show_ambient_screen ? "default" : "outline"}
              size="sm"
            >
              🎵
            </Button>
            <Button 
              onClick={resetCompleteSession} 
              variant="destructive" 
              size="sm"
            >
              🔄
            </Button>
          </div>
        </header>

        {/* Question actuelle */}
        {currentQuestion && (
          <Card className="p-3 bg-gradient-to-r from-accent/20 to-primary/20 backdrop-blur-sm border-accent shadow-glow-gold">
            <h2 className="text-xs font-bold text-accent mb-1">QUESTION ACTUELLE</h2>
            <p className="text-base font-semibold">{currentQuestion.question_text}</p>
            <div className="mt-1 flex gap-2 items-center text-xs text-muted-foreground">
              <span className="font-medium">{currentQuestion.question_type}</span>
              <span>•</span>
              <span className="font-bold text-primary">{currentQuestion.points} pts</span>
              {currentQuestion.audio_url && (
                <>
                  <span>•</span>
                  <Music className="h-3 w-3 text-secondary" />
                </>
              )}
            </div>
          </Card>
        )}

        {/* Contrôles principaux */}
        <Card className="p-2 bg-card/80 backdrop-blur-sm border-primary/20">
          <h2 className="text-xs font-bold text-primary mb-1.5">Contrôles</h2>
          <div className="grid grid-cols-4 gap-1.5 mb-1.5">
            <Button 
              size="sm" 
              className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-gold text-[10px]"
              onClick={toggleBuzzer}
            >
              <Zap className="mr-1 h-3 w-3" />
              {gameState?.is_buzzer_active ? "Off" : "On"} Buzzer
            </Button>
            <Button 
              size="sm" 
              className="h-10 bg-gradient-arena hover:opacity-90 text-[10px]"
              onClick={showLeaderboard}
            >
              <Trophy className="mr-1 h-3 w-3" />
              {gameState?.show_leaderboard ? "Hide" : "Show"} Score
            </Button>
            <Button 
              size="sm" 
              variant="secondary"
              className="h-10 text-[10px]"
              onClick={nextQuestion}
            >
              <SkipForward className="mr-1 h-3 w-3" />
              Suivante
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="h-10 text-[10px]"
              onClick={() => navigate('/regie/sound')}
            >
              🔊 Son
            </Button>
          </div>
          
          {/* Jingles de manche */}
          <div className="border-t border-border/50 pt-1.5">
            <h3 className="text-[10px] font-semibold text-muted-foreground mb-1">Jingles de manche</h3>
            <div className="grid grid-cols-2 gap-1">
              {rounds.map((round) => (
                <Button
                  key={round.id}
                  size="sm"
                  variant="outline"
                  className="h-8 text-[10px] justify-start"
                  onClick={async () => {
                    if (!gameState) return;
                    setSelectedRound(round.id);
                    await supabase
                      .from('game_state')
                      .update({ 
                        show_round_intro: true,
                        current_round_intro: round.id 
                      })
                      .eq('id', gameState.id);
                    
                    setTimeout(async () => {
                      await supabase
                        .from('game_state')
                        .update({ show_round_intro: false })
                        .eq('id', gameState.id);
                    }, 5000);
                    
                    toast({ title: `🎬 Intro: ${round.title}` });
                  }}
                >
                  🎬 {round.title}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Pagination du classement */}
          {gameState?.show_leaderboard && teams.length > 6 && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const currentPage = gameState?.leaderboard_page || 1;
                  if (currentPage > 1) {
                    await supabase
                      .from('game_state')
                      .update({ leaderboard_page: currentPage - 1 })
                      .eq('id', gameState.id);
                    toast({ title: `Page ${currentPage - 1}` });
                  }
                }}
                disabled={!gameState?.leaderboard_page || gameState?.leaderboard_page === 1}
              >
                ← Préc.
              </Button>
              <span className="text-sm font-bold">
                Page {gameState?.leaderboard_page || 1} / {Math.ceil((teams.length - 6) / 20) + 1}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const currentPage = gameState?.leaderboard_page || 1;
                  const totalPages = Math.ceil((teams.length - 6) / 20) + 1;
                  if (currentPage < totalPages) {
                    await supabase
                      .from('game_state')
                      .update({ leaderboard_page: currentPage + 1 })
                      .eq('id', gameState.id);
                    toast({ title: `Page ${currentPage + 1}` });
                  }
                }}
                disabled={gameState?.leaderboard_page >= Math.ceil((teams.length - 6) / 20) + 1}
              >
                Suiv. →
              </Button>
            </div>
          )}
        </Card>

        {/* Premier buzzeur */}
        {buzzers.length > 0 && currentQuestion?.question_type === 'blind_test' && (
          <Card className="p-3 bg-card/90 backdrop-blur-sm border-2 border-primary shadow-glow-gold animate-slide-in">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="h-6 w-6 text-primary animate-pulse" />
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full border border-foreground"
                      style={{ backgroundColor: buzzers[0].teams?.color }}
                    ></div>
                    <p className="text-lg font-bold">{buzzers[0].teams?.name}</p>
                  </div>
                  {buzzers.length > 1 && (
                    <span className="text-xs text-muted-foreground">
                      +{buzzers.length - 1}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white text-xs"
                  onClick={() => validateAnswer(buzzers[0].team_id, true)}
                >
                  ✅ Bonne
                </Button>
                <Button
                  size="sm"
                  className="h-10 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs"
                  onClick={() => validateAnswer(buzzers[0].team_id, false)}
                >
                  ❌ Mauvaise
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 px-3 text-xs"
                  onClick={resetBuzzerForQuestion}
                >
                  Reset
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Réponses */}
        <QCMAnswersDisplay currentQuestion={currentQuestion} gameState={gameState} />
        <TextAnswersDisplay currentQuestionId={currentQuestion?.id} gameState={gameState} />

        {/* Questions par manche */}
        <Card className="p-3 bg-card/80 backdrop-blur-sm border-secondary/20">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-secondary flex items-center gap-1">
              <List className="h-3 w-3" />
              Questions {selectedRound && `- ${rounds.find(r => r.id === selectedRound)?.title}`}
            </h2>
            {selectedRound && (
              <Button
                size="sm"
                variant="ghost"
                className="h-5 text-[9px] px-2"
                onClick={() => setSelectedRound(null)}
              >
                Tout afficher
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {rounds.filter(round => !selectedRound || round.id === selectedRound).map((round) => {
              const roundQuestions = questions.filter(q => q.round_id === round.id);
              if (roundQuestions.length === 0) return null;
              
              return (
                <div key={round.id}>
                  <h3 className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase">{round.title}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                    {roundQuestions.map((question) => (
                      <div
                        key={question.id}
                        className={`p-1.5 rounded border cursor-pointer transition-all ${
                          currentQuestion?.id === question.id
                            ? 'border-secondary bg-secondary/20 shadow-sm'
                            : 'border-border bg-muted/30 hover:border-secondary/50 hover:bg-muted/50'
                        }`}
                        onClick={() => setQuestion(question.id)}
                      >
                        <div className="flex items-start gap-1">
                          {question.audio_url && <Music className="h-3 w-3 text-secondary flex-shrink-0 mt-0.5" />}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-[10px] leading-tight line-clamp-2">{question.question_text}</div>
                            <div className="text-[9px] text-muted-foreground mt-0.5">
                              {question.points} pts
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Équipes connectées */}
        <Card className="p-2 bg-card/80 backdrop-blur-sm border-secondary/20">
          <h2 className="text-xs font-bold text-secondary mb-1.5">
            Équipes ({teams.filter(t => t.connected_device_id && t.is_active).length}/{teams.length})
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-1.5">
            {teams.map((team) => {
              const isConnected = team.connected_device_id !== null && team.is_active;
              return (
                <div
                  key={team.id}
                  className="p-1.5 rounded border border-border bg-muted/50 hover:bg-muted/80 transition-colors"
                  style={{ borderLeftColor: team.color, borderLeftWidth: '2px' }}
                >
                  <div className="flex justify-between items-start mb-0.5">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[10px] truncate leading-tight">{team.name}</h3>
                      <span className="text-xs font-bold text-primary">{team.score}</span>
                    </div>
                    {isConnected && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-4 w-4 p-0 text-[8px]"
                        onClick={() => disconnectTeam(team.id)}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                  <div className="text-[9px]">
                    {isConnected ? "🟢" : "⚪"}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegieVideo;

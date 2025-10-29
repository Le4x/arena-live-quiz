import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Trophy, Zap, Check, X, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { playSound } from "@/lib/sounds";
import { getGameEvents, type BuzzerResetEvent, type StartQuestionEvent } from "@/lib/runtime/GameEvents";

const Client = () => {
  const { teamId } = useParams();
  const { toast } = useToast();
  const [team, setTeam] = useState<any>(null);
  const [teamName, setTeamName] = useState("");
  const [teamColor, setTeamColor] = useState("#D4AF37");
  const [gameState, setGameState] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [answer, setAnswer] = useState("");
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState<'correct' | 'incorrect' | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [deviceBlocked, setDeviceBlocked] = useState(false);
  const [currentQuestionInstanceId, setCurrentQuestionInstanceId] = useState<string | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const buzzerButtonRef = useRef<HTMLButtonElement>(null);
  const gameEvents = getGameEvents();

  // Générer ou récupérer l'ID unique de l'appareil
  const getDeviceId = () => {
    let deviceId = localStorage.getItem('arena_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('arena_device_id', deviceId);
    }
    return deviceId;
  };

  useEffect(() => {
    if (teamId) {
      loadTeam();
    }
    loadGameState();

    const gameStateChannel = supabase
      .channel('client-game-state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, () => {
        loadGameState();
      })
      .subscribe();

    const teamsChannel = supabase
      .channel('client-teams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        loadTeam();
      })
      .subscribe();

    const answersChannel = supabase
      .channel('client-answers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_answers' }, () => {
        checkAnswerResult();
      })
      .subscribe();

    // Heartbeat présence (toutes les 10s)
    const heartbeatInterval = setInterval(async () => {
      if (teamId) {
        await supabase.from('teams').update({ 
          last_seen_at: new Date().toISOString(),
          is_active: true 
        }).eq('id', teamId);
      }
    }, 10000);

    // Cleanup quand la page se ferme
    const handleBeforeUnload = async () => {
      if (teamId) {
        await supabase.from('teams').update({ 
          is_active: false,
          connected_device_id: null 
        }).eq('id', teamId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // S'abonner aux événements de jeu
    const unsubBuzzerReset = gameEvents.on<BuzzerResetEvent>('BUZZER_RESET', (event) => {
      console.log('🔔 Événement BUZZER_RESET reçu', event);
      console.log('Current instance:', currentQuestionInstanceId, 'Event instance:', event.data.questionInstanceId);
      
      if (event.data.questionInstanceId === currentQuestionInstanceId) {
        console.log('✅ Reset accepté - réinitialisation buzzer');
        setHasBuzzed(false);
        setTimeout(() => {
          buzzerButtonRef.current?.focus();
        }, 100);
        toast({
          title: "🔔 Buzzer réactivé !",
          description: "Vous pouvez buzzer à nouveau",
        });
      } else {
        console.log('⚠️ Reset ignoré - instance différente');
      }
    });

    const unsubKick = gameEvents.on('KICK_ALL', () => {
      toast({ title: "👋 Déconnecté par la régie" });
      setTimeout(() => window.location.href = '/', 2000);
    });

    const unsubKickTeam = gameEvents.on('KICK_TEAM', (event: any) => {
      if (event.data?.teamId === teamId) {
        toast({ title: "👋 Déconnecté par la régie" });
        setTimeout(() => window.location.href = '/', 2000);
      }
    });

    const unsubStartQuestion = gameEvents.on<StartQuestionEvent>('START_QUESTION', (event) => {
      console.log('🎯 Nouvelle question', event);
      setCurrentQuestionInstanceId(event.data.questionInstanceId);
    });

    const unsubReveal = gameEvents.on('REVEAL_ANSWER', (event: any) => {
      console.log('🎭 Reveal reçu', event);
      
      // Vérifier si ce reveal est pour cette équipe
      if (event.data?.teamId === teamId) {
        setShowReveal(true);
        const isCorrect = event.data?.isCorrect;
        setAnswerResult(isCorrect ? 'correct' : 'incorrect');
        playSound(isCorrect ? 'correct' : 'incorrect');
      }
    });

    const unsubResetAll = gameEvents.on('RESET_ALL', () => {
      console.log('🔄 Reset global reçu');
      setHasBuzzed(false);
      setHasAnswered(false);
      setAnswerResult(null);
      setShowReveal(false);
      setAnswer('');
      toast({ title: '🔄 Session réinitialisée' });
    });

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Déconnecter proprement
      if (teamId) {
        supabase.from('teams').update({ 
          is_active: false 
        }).eq('id', teamId);
      }
      
      supabase.removeChannel(gameStateChannel);
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(answersChannel);
      unsubBuzzerReset();
      unsubStartQuestion();
      unsubReveal();
      unsubResetAll();
      unsubKick();
      unsubKickTeam();
    };
  }, [teamId, currentQuestionInstanceId]);

  useEffect(() => {
    // Reset buzzer state when question changes
    setHasBuzzed(false);
    setAnswer("");
    setHasAnswered(false);
    setAnswerResult(null);
    setShowReveal(false);
    
    // Réinitialiser le timer actif depuis gameState
    if (gameState?.timer_active !== undefined) {
      setIsTimerActive(gameState.timer_active);
    }
    
    // Charger l'instance ID depuis game_state
    if (gameState?.current_question_instance_id) {
      setCurrentQuestionInstanceId(gameState.current_question_instance_id);
    }
  }, [currentQuestion?.id, gameState?.current_question_instance_id, gameState?.timer_active]);

  useEffect(() => {
    // Vérifier le statut du buzzer après la mise à jour de l'instance ID
    if (currentQuestionInstanceId) {
      checkIfBuzzed();
      checkIfAnswered();
    }
  }, [currentQuestionInstanceId]);

  const checkIfBuzzed = async () => {
    if (!team || !currentQuestion?.id || !currentQuestionInstanceId) return;
    
    const { data } = await supabase
      .from('buzzer_attempts')
      .select('id')
      .eq('team_id', team.id)
      .eq('question_instance_id', currentQuestionInstanceId)
      .maybeSingle();
    
    if (data) setHasBuzzed(true);
  };

  const checkIfAnswered = async () => {
    if (!team || !currentQuestion?.id || !currentQuestionInstanceId || !gameState?.game_session_id) return;
    
    console.log('🔍 Checking if answered:', { 
      teamId: team.id, 
      questionId: currentQuestion.id,
      instanceId: currentQuestionInstanceId,
      sessionId: gameState.game_session_id 
    });
    
    // IMPORTANT : Vérifier avec question_instance_id pour distinguer les relances
    const { data } = await supabase
      .from('team_answers')
      .select('*')
      .eq('team_id', team.id)
      .eq('question_instance_id', currentQuestionInstanceId) // Utiliser l'instance, pas juste la question
      .eq('game_session_id', gameState.game_session_id)
      .maybeSingle();
    
    console.log('🔍 Answer found:', data ? 'yes' : 'no');
    
    if (data) {
      setHasAnswered(true);
      if (data.is_correct !== null) {
        setAnswerResult(data.is_correct ? 'correct' : 'incorrect');
      }
    }
  };

  const checkAnswerResult = async () => {
    // Ne rien faire ici - le reveal se fera via l'événement REVEAL_ANSWER
    return;
  };

  const loadTeam = async () => {
    if (!teamId) return;
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();
    
    if (data) {
      const currentDeviceId = getDeviceId();
      
      // Vérifier si un appareil est déjà connecté
      if (data.connected_device_id && data.connected_device_id !== currentDeviceId) {
        setDeviceBlocked(true);
        toast({
          title: "Accès bloqué",
          description: "Un appareil est déjà connecté à cette équipe",
          variant: "destructive"
        });
        return;
      }
      
      // Si aucun appareil n'est connecté ou si c'est le même appareil, enregistrer l'appareil
      if (!data.connected_device_id) {
        await supabase
          .from('teams')
          .update({ connected_device_id: currentDeviceId })
          .eq('id', teamId);
      }
      
      setTeam(data);
    }
  };

  const loadGameState = async () => {
    const { data } = await supabase
      .from('game_state')
      .select('*, questions(*)')
      .maybeSingle();
    if (data) {
      setGameState(data);
      setCurrentQuestion(data.questions);
      setIsTimerActive(data.timer_active || false);
    }
  };

  const createTeam = async () => {
    if (!teamName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nom d'équipe",
        variant: "destructive"
      });
      return;
    }

    const currentDeviceId = getDeviceId();

    const { data, error } = await supabase
      .from('teams')
      .insert([
        { name: teamName, color: teamColor, score: 0, connected_device_id: currentDeviceId }
      ])
      .select()
      .single();

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'équipe",
        variant: "destructive"
      });
    } else if (data) {
      setTeam(data);
      window.history.replaceState(null, '', `/client/${data.id}`);
      toast({
        title: "Équipe créée !",
        description: `Bienvenue ${data.name} !`,
      });
    }
  };

  const handleBuzzer = async () => {
    console.log('🔔 Tentative de buzzer', {
      team: team?.name,
      teamId: team?.id,
      question: currentQuestion?.id,
      instanceId: currentQuestionInstanceId,
      session: gameState?.game_session_id,
      buzzerActive: gameState?.is_buzzer_active,
      hasBuzzed,
      excludedTeams: gameState?.excluded_teams
    });

    if (!team || !currentQuestion || !currentQuestionInstanceId || !gameState?.is_buzzer_active || !gameState?.game_session_id) {
      console.log('❌ Buzzer bloqué - conditions non remplies');
      return;
    }

    if (hasBuzzed) {
      console.log('❌ Buzzer bloqué - déjà buzzé');
      return;
    }

    // Vérifier si l'équipe est exclue
    const excludedTeams = (gameState.excluded_teams || []) as string[];
    if (excludedTeams.includes(team.id)) {
      console.log('❌ Buzzer bloqué - équipe exclue');
      toast({
        title: "Buzzer désactivé",
        description: "Vous ne pouvez plus buzzer pour cette question",
        variant: "destructive"
      });
      return;
    }

    console.log('✅ Insertion du buzzer...');
    const { error } = await supabase
      .from('buzzer_attempts')
      .insert([
        { 
          team_id: team.id, 
          question_id: currentQuestion.id,
          question_instance_id: currentQuestionInstanceId,
          game_session_id: gameState.game_session_id,
          is_first: true
        }
      ]);

    if (error) {
      console.error('❌ Erreur buzzer:', error);
      if (error.code === '23505') {
        toast({
          title: "Déjà buzzé",
          description: "Vous avez déjà buzzé pour cette question",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive"
        });
      }
    } else {
      console.log('✅ Buzzer enregistré avec succès');
      setHasBuzzed(true);
      playSound('buzz');
      toast({
        title: "Buzzé !",
        description: "Votre buzzer a été enregistré",
      });
    }
  };

  const submitAnswer = async (answerValue?: string) => {
    const finalAnswer = answerValue || answer;
    
    // Bloquer l'envoi si le timer est terminé
    if (!isTimerActive) {
      toast({
        title: "Temps écoulé",
        description: "Les réponses ne sont plus acceptées",
        variant: "destructive"
      });
      return;
    }
    
    if (!team || !currentQuestion || !currentQuestionInstanceId || !finalAnswer.trim() || !gameState?.game_session_id || hasAnswered) return;

    // Stocker la réponse sélectionnée localement pour l'afficher lors du reveal
    setAnswer(finalAnswer);

    // Ne PAS calculer is_correct ici, sera fait au reveal
    const { error } = await supabase
      .from('team_answers')
      .insert([
        { 
          team_id: team.id, 
          question_id: currentQuestion.id,
          question_instance_id: currentQuestionInstanceId,
          answer: finalAnswer,
          is_correct: null,
          points_awarded: 0,
          game_session_id: gameState.game_session_id
        }
      ]);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la réponse",
        variant: "destructive"
      });
    } else {
      setHasAnswered(true);
      toast({
        title: "Réponse enregistrée !",
        description: "En attente de la révélation...",
      });
    }
  };

  if (deviceBlocked) {
    return (
      <div className="min-h-screen bg-gradient-glow p-6 flex items-center justify-center">
        <Card className="w-full max-w-md p-8 bg-card/90 backdrop-blur-sm border-destructive/50">
          <div className="text-center">
            <X className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-bold text-destructive mb-4">Accès Bloqué</h1>
            <p className="text-muted-foreground">
              Un appareil est déjà connecté à cette équipe. Une seule connexion est autorisée par équipe.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-glow p-6 flex items-center justify-center">
        <Card className="w-full max-w-md p-8 bg-card/90 backdrop-blur-sm border-primary/20">
          <h1 className="text-4xl font-bold text-center bg-gradient-arena bg-clip-text text-transparent mb-8">
            ARENA
          </h1>
          <h2 className="text-2xl font-bold text-center mb-6">Rejoindre le jeu</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Nom de l'équipe</label>
              <Input
                placeholder="Les Champions"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="bg-input border-border"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Couleur de l'équipe</label>
              <div className="flex gap-3 flex-wrap">
                {['#D4AF37', '#1E3A8A', '#6B21A8', '#B91C1C', '#047857', '#B45309', '#0E7490', '#7C2D12'].map((color) => (
                  <button
                    key={color}
                    className={`w-12 h-12 rounded-full border-4 transition-all ${
                      teamColor === color ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setTeamColor(color)}
                  />
                ))}
              </div>
            </div>

            <Button 
              onClick={createTeam} 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-gold h-12 text-lg"
            >
              Rejoindre
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-glow p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header équipe */}
        <Card className="p-6 bg-card/90 backdrop-blur-sm border-2" style={{ borderColor: team.color }}>
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-full"
              style={{ backgroundColor: team.color }}
            ></div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{team.name}</h2>
              <p className="text-muted-foreground">Score: {team.score} points</p>
            </div>
          </div>
        </Card>

        {/* Buzzer - Uniquement pour blind test */}
        {gameState?.is_buzzer_active && currentQuestion && currentQuestion.question_type === 'blind_test' && (
          <Card className="p-8 bg-card/90 backdrop-blur-sm border-primary/20">
            <Button
              ref={buzzerButtonRef}
              onClick={handleBuzzer}
              disabled={hasBuzzed}
              className="w-full h-32 text-3xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-gold disabled:opacity-50 transition-all"
            >
              <Zap className="mr-4 h-12 w-12" />
              {hasBuzzed ? "BUZZÉ !" : "BUZZER"}
            </Button>
          </Card>
        )}

        {/* Question et réponse */}
        {currentQuestion && (
          <Card className="p-6 bg-card/90 backdrop-blur-sm border-secondary/20 relative">
            {showReveal && answerResult && (
              <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${
                answerResult === 'correct' 
                  ? 'from-green-500/90 to-emerald-500/90' 
                  : 'from-red-500/90 to-rose-500/90'
              } rounded-lg animate-scale-in z-10`}>
                <div className="text-center">
                  {answerResult === 'correct' ? (
                    <>
                      <Check className="w-24 h-24 mx-auto mb-4 text-white animate-bounce" />
                      <p className="text-4xl font-bold text-white">BONNE RÉPONSE !</p>
                    </>
                  ) : (
                    <>
                      <X className="w-24 h-24 mx-auto mb-4 text-white animate-bounce" />
                      <p className="text-4xl font-bold text-white">MAUVAISE RÉPONSE</p>
                    </>
                  )}
                </div>
              </div>
            )}
            <h3 className="text-xl font-bold text-secondary mb-4">Question actuelle</h3>
            <p className="text-lg mb-6">{currentQuestion.question_text}</p>

            {currentQuestion.question_type === 'qcm' && currentQuestion.options && (
              <div className="space-y-3 mb-6">
                {(() => {
                  try {
                    const options = typeof currentQuestion.options === 'string' 
                      ? JSON.parse(currentQuestion.options) 
                      : currentQuestion.options;
                    return Object.entries(options || {}).map(([key, value]) => {
                      const optionValue = value as string;
                      const isCorrectOption = showReveal && optionValue.toLowerCase().trim() === currentQuestion.correct_answer?.toLowerCase().trim();
                      const isSelectedOption = showReveal && answer === optionValue;
                      
                      return (
                        <Button
                          key={key}
                          variant="outline"
                          disabled={hasAnswered || !isTimerActive}
                          className={`w-full justify-start text-left h-auto py-4 px-6 disabled:opacity-100 transition-all ${
                            showReveal && isCorrectOption 
                              ? 'bg-green-500/20 border-green-500 border-2' 
                              : showReveal && isSelectedOption && answerResult === 'incorrect'
                              ? 'bg-red-500/20 border-red-500 border-2'
                              : hasAnswered || !isTimerActive
                              ? 'opacity-50' 
                              : ''
                          }`}
                          onClick={() => {
                            setAnswer(optionValue);
                            submitAnswer(optionValue);
                          }}
                        >
                          <span className="text-primary font-bold mr-3">{key}.</span>
                          <span>{optionValue}</span>
                          {showReveal && isCorrectOption && (
                            <Check className="ml-auto h-6 w-6 text-green-500" />
                          )}
                          {showReveal && isSelectedOption && answerResult === 'incorrect' && (
                            <X className="ml-auto h-6 w-6 text-red-500" />
                          )}
                        </Button>
                      );
                    });
                  } catch (e) {
                    return <p className="text-destructive">Erreur de chargement des options</p>;
                  }
                })()}
                {hasAnswered && !showReveal && (
                  <div className="text-center text-green-500 font-bold">
                    ✓ Réponse enregistrée
                  </div>
                )}
                {!isTimerActive && !hasAnswered && (
                  <div className="text-center text-destructive font-bold">
                    ⏱️ Temps écoulé - Réponses fermées
                  </div>
                )}
              </div>
            )}

            {currentQuestion.question_type === 'free_text' && (
              <div className="space-y-4">
                <Input
                  placeholder="Votre réponse..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !hasAnswered && isTimerActive) {
                      submitAnswer();
                    }
                  }}
                  disabled={hasAnswered || !isTimerActive}
                  className="bg-input border-border"
                />
                <Button
                  onClick={() => submitAnswer()}
                  disabled={hasAnswered || !isTimerActive}
                  className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-glow-blue disabled:opacity-50"
                >
                  <Send className="mr-2 h-5 w-5" />
                  Envoyer la réponse
                </Button>
                {hasAnswered && (
                  <div className="text-center text-green-500 font-bold">
                    ✓ Réponse envoyée
                  </div>
                )}
                {!isTimerActive && !hasAnswered && (
                  <div className="text-center text-destructive font-bold">
                    ⏱️ Temps écoulé - Réponses fermées
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {!currentQuestion && (
          <Card className="p-12 bg-card/90 backdrop-blur-sm text-center">
            <p className="text-xl text-muted-foreground">En attente de la prochaine question...</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Client;

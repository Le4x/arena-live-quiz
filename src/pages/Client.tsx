import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Trophy, Zap, Check, X, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { playSound } from "@/lib/sounds";

const Client = () => {
  const { teamId } = useParams();
  const { toast } = useToast();
  const [team, setTeam] = useState<any>(null);
  const [teamName, setTeamName] = useState("");
  const [teamColor, setTeamColor] = useState("#FFD700");
  const [gameState, setGameState] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [answer, setAnswer] = useState("");
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState<'correct' | 'incorrect' | null>(null);
  const [deviceBlocked, setDeviceBlocked] = useState(false);

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

    return () => {
      supabase.removeChannel(gameStateChannel);
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(answersChannel);
    };
  }, [teamId]);

  // Track presence when team is connected and active
  useEffect(() => {
    if (!team?.id || !team?.is_active) {
      // Si l'équipe est désactivée, ne pas tracker la présence
      return;
    }

    const presenceChannel = supabase.channel('team-presence');

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        // Presence synced
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            team_id: team.id,
            team_name: team.name,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [team?.id, team?.is_active]);

  useEffect(() => {
    // Reset buzzer state when question changes
    setHasBuzzed(false);
    setAnswer("");
    setHasAnswered(false);
    setAnswerResult(null);
    checkIfBuzzed();
    checkIfAnswered();
  }, [currentQuestion?.id]);

  const checkIfBuzzed = async () => {
    if (!team || !currentQuestion?.id || !gameState?.game_session_id) return;
    
    const { data } = await supabase
      .from('buzzer_attempts')
      .select('id')
      .eq('team_id', team.id)
      .eq('question_id', currentQuestion.id)
      .eq('game_session_id', gameState.game_session_id)
      .maybeSingle();
    
    if (data) setHasBuzzed(true);
  };

  const checkIfAnswered = async () => {
    if (!team || !currentQuestion?.id || !gameState?.game_session_id) return;
    
    const { data } = await supabase
      .from('team_answers')
      .select('*')
      .eq('team_id', team.id)
      .eq('question_id', currentQuestion.id)
      .eq('game_session_id', gameState.game_session_id)
      .maybeSingle();
    
    if (data) {
      setHasAnswered(true);
      if (data.is_correct !== null) {
        setAnswerResult(data.is_correct ? 'correct' : 'incorrect');
      }
    }
  };

  const checkAnswerResult = async () => {
    if (!team || !currentQuestion?.id || !gameState?.game_session_id) return;
    
    const { data } = await supabase
      .from('team_answers')
      .select('is_correct')
      .eq('team_id', team.id)
      .eq('question_id', currentQuestion.id)
      .eq('game_session_id', gameState.game_session_id)
      .maybeSingle();
    
    if (data && data.is_correct !== null) {
      const result = data.is_correct ? 'correct' : 'incorrect';
      if (result !== answerResult) {
        setAnswerResult(result);
        playSound(result);
      }
    }
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
      
      // Si aucun appareil n'est connecté ou si c'est le même appareil, enregistrer l'appareil et activer l'équipe
      if (!data.connected_device_id) {
        await supabase
          .from('teams')
          .update({ 
            connected_device_id: currentDeviceId,
            is_active: true
          })
          .eq('id', teamId);
        
        // Recharger les données de l'équipe après la mise à jour
        const { data: updatedData } = await supabase
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .single();
        
        if (updatedData) {
          setTeam(updatedData);
        }
      } else {
        setTeam(data);
      }
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
      session: gameState?.game_session_id,
      buzzerActive: gameState?.is_buzzer_active,
      hasBuzzed,
      excludedTeams: gameState?.excluded_teams
    });

    if (!team || !currentQuestion || !gameState?.is_buzzer_active || !gameState?.game_session_id) {
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
    if (!team || !currentQuestion || !finalAnswer.trim() || !gameState?.game_session_id || hasAnswered) return;

    // Pour les QCM, valider automatiquement la réponse
    let isCorrect = null;
    let pointsAwarded = 0;
    const isQCM = currentQuestion.question_type === 'qcm';
    
    if (isQCM && currentQuestion.correct_answer) {
      isCorrect = finalAnswer.toLowerCase().trim() === currentQuestion.correct_answer.toLowerCase().trim();
      pointsAwarded = isCorrect ? (currentQuestion.points || 0) : 0;
    }

    const { error } = await supabase
      .from('team_answers')
      .insert([
        { 
          team_id: team.id, 
          question_id: currentQuestion.id,
          answer: finalAnswer,
          is_correct: isCorrect,
          points_awarded: pointsAwarded,
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
      setAnswer("");
      setHasAnswered(true);
      
      // Mettre à jour le score de l'équipe pour les QCM
      if (isQCM && isCorrect) {
        await supabase
          .from('teams')
          .update({ score: (team.score || 0) + pointsAwarded })
          .eq('id', team.id);
      }
      
      toast({
        title: isQCM ? "Réponse enregistrée !" : "Réponse envoyée !",
        description: isQCM ? (isCorrect ? `Bonne réponse ! +${pointsAwarded} pts` : "Réponse enregistrée") : "Votre réponse a été enregistrée",
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
              <div className="flex gap-3">
                {['#FFD700', '#3B82F6', '#A855F7', '#EF4444', '#10B981', '#F59E0B'].map((color) => (
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
              onClick={handleBuzzer}
              disabled={hasBuzzed}
              className="w-full h-32 text-3xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-gold disabled:opacity-50"
            >
              <Zap className="mr-4 h-12 w-12" />
              {hasBuzzed ? "BUZZÉ !" : "BUZZER"}
            </Button>
          </Card>
        )}

        {/* Question et réponse */}
        {currentQuestion && (
          <Card className="p-6 bg-card/90 backdrop-blur-sm border-secondary/20 relative">
            {answerResult && (
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
                    return Object.entries(options || {}).map(([key, value]) => (
                      <Button
                        key={key}
                        variant="outline"
                        disabled={hasAnswered}
                        className="w-full justify-start text-left h-auto py-4 px-6 disabled:opacity-50"
                        onClick={() => submitAnswer(value as string)}
                      >
                        <span className="text-primary font-bold mr-3">{key}.</span>
                        <span>{value as string}</span>
                      </Button>
                    ));
                  } catch (e) {
                    return <p className="text-destructive">Erreur de chargement des options</p>;
                  }
                })()}
                {hasAnswered && (
                  <div className="text-center text-green-500 font-bold">
                    ✓ Réponse enregistrée
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
                    if (e.key === 'Enter' && !hasAnswered) {
                      submitAnswer();
                    }
                  }}
                  disabled={hasAnswered}
                  className="bg-input border-border"
                />
                <Button
                  onClick={() => submitAnswer()}
                  disabled={hasAnswered}
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

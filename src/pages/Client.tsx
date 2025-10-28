import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Zap, Trophy, Send } from "lucide-react";
import { SupabaseNetworkStatus } from "@/components/SupabaseNetworkStatus";
import { useSupabaseResilience } from "@/hooks/useSupabaseResilience";
import { playSound } from "@/lib/sounds";

const Client = () => {
  const { teamId } = useParams();
  const { toast } = useToast();
  const { saveToCache, loadFromCache } = useSupabaseResilience();
  
  const [gameState, setGameState] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [teamName, setTeamName] = useState("");
  const [teamColor, setTeamColor] = useState("#3B82F6");
  const [answer, setAnswer] = useState("");
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState<'correct' | 'incorrect' | null>(null);

  // Charger l'équipe depuis Supabase
  useEffect(() => {
    if (teamId) {
      loadTeam();
      loadGameState();
    }
  }, [teamId]);

  // Écouter les changements en temps réel
  useEffect(() => {
    if (!teamId) return;

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

    const buzzerChannel = supabase
      .channel('client-buzzers')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'buzzer_attempts' }, (payload) => {
        if (payload.new.team_id === teamId && payload.new.is_first) {
          setHasBuzzed(true);
          playSound('buzz');
          toast({
            title: "🔔 Buzz enregistré !",
            description: "Vous avez buzzé en premier !",
          });
        }
      })
      .subscribe();

    // Track team presence
    const presenceChannel = supabase.channel('team-presence');
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        console.log('Presence synced');
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ team_id: teamId, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(gameStateChannel);
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(buzzerChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [teamId, toast]);

  const loadTeam = async () => {
    if (!teamId) {
      console.log('📱 Client: No teamId provided');
      return;
    }
    
    console.log('📱 Client: Loading team', teamId);
    
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .maybeSingle();

      if (data) {
        console.log('✅ Client: Team loaded successfully', data);
        setTeam(data);
        saveToCache('team', { team: data });
      } else if (error) {
        console.error('❌ Client: Error loading team', error);
        // Tenter de charger depuis le cache
        const cached = loadFromCache('team');
        if (cached?.team) {
          console.log('💾 Client: Team loaded from cache');
          setTeam(cached.team);
          toast({
            title: "Mode dégradé",
            description: "Données chargées depuis le cache local",
            variant: "default"
          });
        }
      }
    } catch (error) {
      console.error('❌ Client: Exception loading team:', error);
      const cached = loadFromCache('team');
      if (cached?.team) {
        console.log('💾 Client: Team loaded from cache after exception');
        setTeam(cached.team);
      }
    }
  };

  const loadGameState = async () => {
    console.log('🎮 Client: Loading game state');
    
    try {
      const { data, error } = await supabase
        .from('game_state')
        .select('*, questions(*)')
        .maybeSingle();

      if (data) {
        console.log('✅ Client: Game state loaded', data);
        setGameState(data);
        setCurrentQuestion(data.questions);
        saveToCache('gameState', { gameState: data, currentQuestion: data.questions });
        
        // Réinitialiser les états si nouvelle question
        if (data.questions?.id !== currentQuestion?.id) {
          console.log('🔄 Client: New question detected, resetting states');
          setHasBuzzed(false);
          setHasAnswered(false);
          setAnswerResult(null);
          setAnswer("");
        }
        
        // Afficher le résultat de la réponse si disponible
        if (data.answer_result && (data.answer_result === 'correct' || data.answer_result === 'incorrect')) {
          console.log('✨ Client: Answer result:', data.answer_result);
          setAnswerResult(data.answer_result);
          setTimeout(() => setAnswerResult(null), 3000);
        }
      } else if (error) {
        console.error('❌ Client: Error loading game state', error);
        // Tenter de charger depuis le cache
        const cached = loadFromCache('gameState');
        if (cached?.gameState) {
          console.log('💾 Client: Game state loaded from cache');
          setGameState(cached.gameState);
          setCurrentQuestion(cached.currentQuestion);
        }
      }
    } catch (error) {
      console.error('❌ Client: Exception loading game state:', error);
      const cached = loadFromCache('gameState');
      if (cached?.gameState) {
        console.log('💾 Client: Game state loaded from cache after exception');
        setGameState(cached.gameState);
        setCurrentQuestion(cached.currentQuestion);
      }
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nom d'équipe",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          color: teamColor,
          score: 0,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setTeam(data);
      window.history.replaceState(null, '', `/client/${data.id}`);
      
      toast({
        title: "Équipe créée !",
        description: `Bienvenue ${data.name} !`,
      });
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'équipe. Vérifiez votre connexion.",
        variant: "destructive"
      });
    }
  };

  const handleBuzzer = async () => {
    if (!team || !currentQuestion || !gameState?.is_buzzer_active || hasBuzzed) {
      return;
    }

    // Vérifier si l'équipe est exclue
    const excludedTeams = (gameState.excluded_teams || []) as string[];
    if (excludedTeams.includes(team.id)) {
      toast({
        title: "Vous êtes exclu",
        description: "Vous ne pouvez plus répondre à cette question",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('buzzer_attempts')
        .insert({
          team_id: team.id,
          question_id: currentQuestion.id,
          game_session_id: gameState.game_session_id,
          is_first: false
        });

      if (error) throw error;

      setHasBuzzed(true);
    } catch (error) {
      console.error('Error buzzing:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le buzz",
        variant: "destructive"
      });
    }
  };

  const submitAnswer = async (answerValue?: string) => {
    const finalAnswer = answerValue || answer;
    if (!team || !currentQuestion || !finalAnswer.trim() || hasAnswered) return;

    try {
      const { error } = await supabase
        .from('team_answers')
        .insert({
          team_id: team.id,
          question_id: currentQuestion.id,
          game_session_id: gameState?.game_session_id,
          answer: finalAnswer,
          is_correct: null
        });

      if (error) throw error;

      setAnswer("");
      setHasAnswered(true);
      
      toast({
        title: "Réponse envoyée !",
        description: "Votre réponse a été enregistrée",
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la réponse",
        variant: "destructive"
      });
    }
  };

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-glow p-6 flex items-center justify-center">
        <SupabaseNetworkStatus />
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
              onClick={handleCreateTeam} 
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
      <SupabaseNetworkStatus />
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
              <p className="text-muted-foreground">Score: {team.score || 0} points</p>
            </div>
          </div>
        </Card>

        {/* Buzzer - Pour les questions type buzzer */}
        {gameState?.is_buzzer_active && currentQuestion && currentQuestion.question_type === 'buzzer' && (
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
                      <Check className="w-32 h-32 mx-auto mb-4 text-white" />
                      <p className="text-4xl font-bold text-white">CORRECT !</p>
                    </>
                  ) : (
                    <>
                      <X className="w-32 h-32 mx-auto mb-4 text-white" />
                      <p className="text-4xl font-bold text-white">INCORRECT</p>
                    </>
                  )}
                </div>
              </div>
            )}

            <h3 className="text-2xl font-bold mb-4">{currentQuestion.question_text}</h3>
            
            {/* Options QCM */}
            {currentQuestion.question_type === 'qcm' && currentQuestion.options && (
              <div className="space-y-3">
                {(currentQuestion.options as string[]).map((option: string, index: number) => (
                  <Button
                    key={index}
                    onClick={() => submitAnswer(option)}
                    disabled={hasAnswered}
                    className="w-full text-lg py-6 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  >
                    {option}
                  </Button>
                ))}
              </div>
            )}

            {/* Réponse texte libre */}
            {currentQuestion.question_type === 'texte' && (
              <div className="space-y-3">
                <Input
                  placeholder="Votre réponse..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={hasAnswered}
                  className="text-lg py-6"
                />
                <Button
                  onClick={() => submitAnswer()}
                  disabled={hasAnswered || !answer.trim()}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Send className="mr-2 h-5 w-5" />
                  Envoyer la réponse
                </Button>
              </div>
            )}

            {hasAnswered && !answerResult && (
              <div className="text-center text-muted-foreground mt-4">
                Réponse envoyée. En attente de validation...
              </div>
            )}
          </Card>
        )}

        {/* En attente */}
        {!currentQuestion && (
          <Card className="p-12 bg-card/90 backdrop-blur-sm border-muted/20 text-center">
            <Trophy className="w-24 h-24 mx-auto mb-6 text-muted-foreground animate-pulse" />
            <h3 className="text-3xl font-bold mb-2">En attente</h3>
            <p className="text-muted-foreground text-xl">
              La prochaine question arrive bientôt...
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Client;

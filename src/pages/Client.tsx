import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Trophy, Zap, Check, X, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { playSound } from "@/lib/sounds";
import { NetworkStatus } from "@/components/NetworkStatus";
import {
  connectRealtime,
  onFullState,
  onPartial,
  onBuzzFirst,
  onBuzzLate,
  onScoreUpdate,
  clientBuzz,
  clientAnswer,
  createTeam,
  type GameState
} from "@/lib/realtime";

const Client = () => {
  const { teamId } = useParams();
  const { toast } = useToast();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [team, setTeam] = useState<any>(null);
  const [teamName, setTeamName] = useState("");
  const [teamColor, setTeamColor] = useState("#FFD700");
  const [answer, setAnswer] = useState("");
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState<'correct' | 'incorrect' | null>(null);

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3001';
    
    // Se connecter en tant que client pour cette équipe
    connectRealtime(baseUrl, 'client', teamId);

    // Écouter l'état complet
    onFullState((state: GameState) => {
      console.log('📦 Client: État complet reçu', state);
      setGameState(state);
      
      // Trouver notre équipe dans l'état
      if (teamId) {
        const myTeam = state.teams.find((t: any) => t.id === teamId);
        if (myTeam) {
          setTeam(myTeam);
        }
      }
      
      // Réinitialiser l'état de la réponse si la question change
      if (state.question?.id !== gameState?.question?.id) {
        setHasBuzzed(false);
        setHasAnswered(false);
        setAnswer("");
        setAnswerResult(null);
      }
    });

    // Écouter les mises à jour partielles
    onPartial((partial: Partial<GameState>) => {
      console.log('🔄 Client: Mise à jour partielle', partial);
      setGameState((prev) => prev ? { ...prev, ...partial } : null);
      
      if (partial.teams && teamId) {
        const myTeam = partial.teams.find((t: any) => t.id === teamId);
        if (myTeam) {
          setTeam(myTeam);
        }
      }
    });

    // Écouter les premiers buzz
    onBuzzFirst((data: { teamId: string; ts: number }) => {
      if (data.teamId === teamId) {
        console.log('✅ Client: Vous avez buzzé en premier !');
        setHasBuzzed(true);
        playSound('buzz');
        toast({
          title: "Buzzé en premier !",
          description: "Vous avez le droit de répondre",
        });
      }
    });

    // Écouter les buzz tardifs
    onBuzzLate((data: { teamId: string; ts: number }) => {
      if (data.teamId === teamId) {
        console.log('⏱️ Client: Buzz trop tard');
        toast({
          title: "Trop tard",
          description: "Une autre équipe a déjà buzzé",
          variant: "destructive"
        });
      }
    });

    // Écouter les mises à jour de score
    onScoreUpdate((data: { teamId: string; score: number }) => {
      if (data.teamId === teamId) {
        setTeam((prev: any) => prev ? { ...prev, score: data.score } : null);
      }
    });
  }, [teamId]);

  useEffect(() => {
    // Vérifier si cette équipe a buzzé pour cette question
    if (gameState?.firstBuzz === teamId) {
      setHasBuzzed(true);
    }
  }, [gameState?.firstBuzz, teamId]);

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nom d'équipe",
        variant: "destructive"
      });
      return;
    }

    const newTeam = {
      id: crypto.randomUUID(),
      name: teamName,
      color: teamColor,
      score: 0
    };

    createTeam(newTeam);
    setTeam(newTeam);
    window.history.replaceState(null, '', `/client/${newTeam.id}`);
    
    toast({
      title: "Équipe créée !",
      description: `Bienvenue ${newTeam.name} !`,
    });
  };

  const handleBuzzer = () => {
    if (!team || !gameState?.question || gameState.phase !== 'playing') {
      console.log('❌ Buzzer bloqué - conditions non remplies');
      return;
    }

    if (hasBuzzed) {
      console.log('❌ Buzzer bloqué - déjà buzzé');
      return;
    }

    console.log('✅ Client: Envoi du buzzer');
    clientBuzz(team.id);
  };

  const submitAnswer = (answerValue?: string) => {
    const finalAnswer = answerValue || answer;
    if (!team || !gameState?.question || !finalAnswer.trim() || hasAnswered) return;

    console.log('✅ Client: Envoi de la réponse', finalAnswer);
    clientAnswer(team.id, {
      questionId: gameState.question.id,
      answer: finalAnswer,
      type: gameState.question.type
    });
    
    setAnswer("");
    setHasAnswered(true);
    
    toast({
      title: "Réponse envoyée !",
      description: "Votre réponse a été enregistrée",
    });
  };

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-glow p-6 flex items-center justify-center">
        <NetworkStatus />
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

  const currentQuestion = gameState?.question;

  return (
    <div className="min-h-screen bg-gradient-glow p-6">
      <NetworkStatus />
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
        {gameState?.phase === 'playing' && currentQuestion && currentQuestion.type === 'buzzer' && (
          <Card className="p-8 bg-card/90 backdrop-blur-sm border-primary/20">
            <Button
              onClick={handleBuzzer}
              disabled={hasBuzzed || gameState.buzzerLocked}
              className="w-full h-32 text-3xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-gold disabled:opacity-50"
            >
              <Zap className="mr-4 h-12 w-12" />
              {hasBuzzed ? "BUZZÉ !" : gameState.buzzerLocked ? "BLOQUÉ" : "BUZZER"}
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

            <h3 className="text-2xl font-bold mb-4">{currentQuestion.text}</h3>
            
            {/* Options QCM */}
            {currentQuestion.type === 'qcm' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option: string, index: number) => (
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
            {currentQuestion.type === 'texte' && (
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

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Play, Pause, SkipForward, Lock, Unlock, Trophy, CheckCircle, XCircle, Users, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { NetworkStatus } from "@/components/NetworkStatus";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";
import { ExportImport } from "@/components/ExportImport";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import {
  connectRealtime,
  onFullState,
  onPartial,
  onBuzzFirst,
  regieUpdate,
  regieLock,
  regieUnlock,
  regieScore,
  regieTimer,
  type GameState
} from "@/lib/realtime";
import { loadQuizFromSupabase, type Quiz } from "@/lib/quizAdapter";

export default function RegieLocal() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState>({
    sessionId: null,
    teams: [],
    question: null,
    phase: 'idle',
    timer: { running: false, seconds: 0 },
    firstBuzz: null,
    buzzerLocked: false,
    showLeaderboard: false,
    showRoundIntro: false,
    currentRound: null,
    answers: []
  });
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  useEffect(() => {
    // Connect as regie role
    const wsUrl = import.meta.env.VITE_WS_URL;
    if (wsUrl) {
      connectRealtime(wsUrl, 'regie');
    }

    onFullState((state) => {
      setGameState(state);
    });

    onPartial((partial) => {
      setGameState((prev) => ({ ...prev, ...partial }));
    });

    onBuzzFirst(({ teamId }) => {
      const team = gameState.teams.find(t => t.id === teamId);
      toast({
        title: "🔔 PREMIER BUZZ !",
        description: team?.name || teamId,
        duration: 3000
      });
      // Jouer un son si disponible
      const audio = new Audio('/sounds/buzz.mp3');
      audio.play().catch(() => {});
    });
  }, []);

  const toggleTimer = () => {
    if (gameState.timer.running) {
      regieTimer('stop');
    } else {
      regieTimer('start', 30);
    }
  };

  const nextQuestion = () => {
    regieUpdate({
      question: { id: Date.now().toString(), text: "Nouvelle question", type: 'buzzer' },
      phase: 'playing',
      firstBuzz: null,
      buzzerLocked: false
    });
    toast({ title: "Question suivante" });
  };

  const toggleBuzzerLock = () => {
    if (gameState.buzzerLocked) {
      regieUnlock();
      toast({ title: "🔓 Buzzer déverrouillé" });
    } else {
      regieLock();
      toast({ title: "🔒 Buzzer verrouillé" });
    }
  };

  const markCorrect = () => {
    if (gameState.firstBuzz) {
      regieScore(gameState.firstBuzz, 10);
      toast({ title: "✅ Réponse correcte", description: "+10 points" });
    }
  };

  const markIncorrect = () => {
    if (gameState.firstBuzz) {
      regieScore(gameState.firstBuzz, -5);
      toast({ title: "❌ Réponse incorrecte", description: "-5 points" });
    }
  };

  const adjustSelectedTeamScore = (delta: number) => {
    if (selectedTeamId) {
      regieScore(selectedTeamId, delta);
    }
  };

  const toggleLeaderboard = () => {
    regieUpdate({ showLeaderboard: !gameState.showLeaderboard });
  };

  const loadQuiz = async () => {
    setLoadingQuiz(true);
    try {
      const quiz = await loadQuizFromSupabase();
      regieUpdate({ 
        quiz,
        question: quiz.rounds[0]?.questions[0] ? {
          id: quiz.rounds[0].questions[0].id,
          text: quiz.rounds[0].questions[0].text,
          type: quiz.rounds[0].questions[0].type as 'buzzer' | 'qcm' | 'texte'
        } : null,
        phase: 'idle'
      });
      toast({ 
        title: "✅ Quiz chargé", 
        description: `${quiz.rounds.length} manches, ${quiz.rounds.reduce((sum, r) => sum + r.questions.length, 0)} questions`
      });
    } catch (error: any) {
      toast({ 
        title: "❌ Erreur de chargement", 
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingQuiz(false);
    }
  };

  const nextRound = () => {
    if (!gameState.quiz || gameState.quiz.currentRound >= gameState.quiz.rounds.length - 1) return;
    const newRound = gameState.quiz.currentRound + 1;
    const newQuiz = { ...gameState.quiz, currentRound: newRound, currentQuestion: 0 };
    const round = newQuiz.rounds[newRound];
    regieUpdate({ 
      quiz: newQuiz,
      question: round.questions[0] ? {
        id: round.questions[0].id,
        text: round.questions[0].text,
        type: round.questions[0].type as 'buzzer' | 'qcm' | 'texte'
      } : null,
      phase: 'idle',
      firstBuzz: null,
      buzzerLocked: false
    });
    toast({ title: `Manche ${newRound + 1}: ${round.name}` });
  };

  const prevRound = () => {
    if (!gameState.quiz || gameState.quiz.currentRound <= 0) return;
    const newRound = gameState.quiz.currentRound - 1;
    const newQuiz = { ...gameState.quiz, currentRound: newRound, currentQuestion: 0 };
    const round = newQuiz.rounds[newRound];
    regieUpdate({ 
      quiz: newQuiz,
      question: round.questions[0] ? {
        id: round.questions[0].id,
        text: round.questions[0].text,
        type: round.questions[0].type as 'buzzer' | 'qcm' | 'texte'
      } : null,
      phase: 'idle',
      firstBuzz: null,
      buzzerLocked: false
    });
    toast({ title: `Manche ${newRound + 1}: ${round.name}` });
  };

  const nextQuestionInRound = () => {
    if (!gameState.quiz) return;
    const round = gameState.quiz.rounds[gameState.quiz.currentRound];
    const newQuestion = gameState.quiz.currentQuestion + 1;
    
    if (newQuestion >= round.questions.length) {
      toast({ title: "Dernière question de cette manche", variant: "destructive" });
      return;
    }
    
    const newQuiz = { ...gameState.quiz, currentQuestion: newQuestion };
    const q = round.questions[newQuestion];
    regieUpdate({ 
      quiz: newQuiz,
      question: { id: q.id, text: q.text, type: q.type as 'buzzer' | 'qcm' | 'texte' },
      phase: 'playing',
      firstBuzz: null,
      buzzerLocked: false
    });
    toast({ title: `Question ${newQuestion + 1}/${round.questions.length}` });
  };

  const prevQuestionInRound = () => {
    if (!gameState.quiz || gameState.quiz.currentQuestion <= 0) return;
    const round = gameState.quiz.rounds[gameState.quiz.currentRound];
    const newQuestion = gameState.quiz.currentQuestion - 1;
    const newQuiz = { ...gameState.quiz, currentQuestion: newQuestion };
    const q = round.questions[newQuestion];
    regieUpdate({ 
      quiz: newQuiz,
      question: { id: q.id, text: q.text, type: q.type as 'buzzer' | 'qcm' | 'texte' },
      phase: 'playing',
      firstBuzz: null,
      buzzerLocked: false
    });
    toast({ title: `Question ${newQuestion + 1}/${round.questions.length}` });
  };

  // Raccourcis clavier
  useKeyboardShortcuts({
    onSpace: toggleTimer,
    onN: nextQuestionInRound,
    onB: toggleBuzzerLock,
    onC: markCorrect,
    onI: markIncorrect,
    onArrowLeft: () => adjustSelectedTeamScore(-1),
    onArrowRight: () => adjustSelectedTeamScore(1)
  });

  const firstBuzzTeam = gameState.teams.find(t => t.id === gameState.firstBuzz);
  const sortedTeams = [...gameState.teams].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-background p-6">
      <NetworkStatus />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-primary">🎮 Régie Locale</h1>
            <p className="text-muted-foreground">Mode offline - Serveur WebSocket</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/admin/local')} variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Gérer les équipes
            </Button>
            <ExportImport />
          </div>
        </div>

        {/* Chargement du quiz */}
        {!gameState.quiz && (
          <Card className="p-6 border-2 border-primary">
            <h2 className="text-xl font-bold mb-4">📚 Chargement du Quiz</h2>
            <p className="text-muted-foreground mb-4">
              Chargez le quiz depuis Supabase pour commencer. Vous pourrez ensuite jouer hors-ligne.
            </p>
            <Button onClick={loadQuiz} disabled={loadingQuiz} size="lg" className="w-full">
              <Download className="h-5 w-5 mr-2" />
              {loadingQuiz ? 'Chargement...' : 'Charger depuis Supabase'}
            </Button>
          </Card>
        )}

        {/* Quiz en cours */}
        {gameState.quiz && (
          <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">
                  {gameState.quiz.rounds[gameState.quiz.currentRound]?.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Manche {gameState.quiz.currentRound + 1}/{gameState.quiz.rounds.length} · 
                  Question {gameState.quiz.currentQuestion + 1}/{gameState.quiz.rounds[gameState.quiz.currentRound]?.questions.length}
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={prevRound} size="sm" variant="outline" disabled={gameState.quiz.currentRound === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button onClick={nextRound} size="sm" variant="outline" disabled={gameState.quiz.currentRound === gameState.quiz.rounds.length - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {gameState.question ? (
              <div>
                <p className="text-lg mb-3">{gameState.question.text}</p>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    gameState.phase === 'locked' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                  }`}>
                    {gameState.phase === 'locked' ? '🔒 Verrouillé' : '🔓 Ouvert'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-500 text-white">
                    {gameState.question.type}
                  </span>
                  <Button onClick={prevQuestionInRound} size="sm" variant="ghost" disabled={gameState.quiz.currentQuestion === 0}>
                    ← Précédente
                  </Button>
                  <Button onClick={nextQuestionInRound} size="sm" variant="ghost">
                    Suivante →
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Aucune question active</p>
            )}
          </Card>
        )}

        {/* Contrôles principaux */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button onClick={toggleTimer} size="lg" className="h-20">
            {gameState.timer.running ? <Pause className="h-6 w-6 mr-2" /> : <Play className="h-6 w-6 mr-2" />}
            <div>
              <div className="text-xs">Chrono</div>
              <div className="text-lg font-bold">{gameState.timer.seconds}s</div>
            </div>
          </Button>

          <Button onClick={nextQuestionInRound} size="lg" className="h-20" variant="outline" disabled={!gameState.quiz}>
            <SkipForward className="h-6 w-6 mr-2" />
            <div className="text-xs">Question suivante</div>
          </Button>

          <Button onClick={toggleBuzzerLock} size="lg" className="h-20" variant={gameState.buzzerLocked ? "destructive" : "default"}>
            {gameState.buzzerLocked ? <Lock className="h-6 w-6 mr-2" /> : <Unlock className="h-6 w-6 mr-2" />}
            <div className="text-xs">Buzzer</div>
          </Button>

          <Button onClick={toggleLeaderboard} size="lg" className="h-20" variant="outline">
            <Trophy className="h-6 w-6 mr-2" />
            <div className="text-xs">Classement</div>
          </Button>
        </div>

        {/* Premier buzz */}
        {firstBuzzTeam && (
          <Card className="p-6 border-4 animate-pulse" style={{ borderColor: firstBuzzTeam.color }}>
            <h3 className="text-2xl font-bold mb-4">🔔 PREMIER BUZZ !</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{firstBuzzTeam.name}</div>
                <div className="text-lg text-muted-foreground">Score: {firstBuzzTeam.score}</div>
              </div>
              <div className="flex gap-2">
                <Button onClick={markCorrect} size="lg" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-6 w-6 mr-2" />
                  Correct (+10)
                </Button>
                <Button onClick={markIncorrect} size="lg" variant="destructive">
                  <XCircle className="h-6 w-6 mr-2" />
                  Incorrect (-5)
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Équipes */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">📊 Classement</h3>
            <div className="space-y-2">
              {sortedTeams.map((team, index) => (
                <div
                  key={team.id}
                  className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedTeamId === team.id ? 'bg-primary/20 border-2 border-primary' : 'bg-muted/50 hover:bg-muted'
                  }`}
                  onClick={() => setSelectedTeamId(team.id)}
                  style={{ borderLeftWidth: '4px', borderLeftColor: team.color }}
                >
                  <div className="text-2xl font-bold w-8">#{index + 1}</div>
                  <div className="flex-1">
                    <div className="font-bold">{team.name}</div>
                  </div>
                  <div className="text-2xl font-bold">{team.score}</div>
                </div>
              ))}
            </div>
          </Card>

          <KeyboardShortcutsHelp />
        </div>
      </div>
    </div>
  );
}

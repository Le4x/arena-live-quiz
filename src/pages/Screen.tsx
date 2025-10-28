import { useState, useEffect, useRef } from "react";
import { Trophy, Zap } from "lucide-react";
import { playSound } from "@/lib/sounds";
import { NetworkStatus } from "@/components/NetworkStatus";
import {
  connectRealtime,
  onFullState,
  onPartial,
  onBuzzFirst,
  type GameState
} from "@/lib/realtime";

const Screen = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [timer, setTimer] = useState<number>(0);
  const [firstBuzzTeam, setFirstBuzzTeam] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3001';
    
    // Se connecter en tant que client (lecture seule pour l'écran)
    connectRealtime(baseUrl, 'client');

    // Écouter l'état complet
    onFullState((state: GameState) => {
      console.log('📦 Screen: État complet reçu', state);
      setGameState(state);
      
      if (state.timer.seconds) {
        setTimer(state.timer.seconds);
      }
    });

    // Écouter les mises à jour partielles
    onPartial((partial: Partial<GameState>) => {
      console.log('🔄 Screen: Mise à jour partielle', partial);
      setGameState((prev) => prev ? { ...prev, ...partial } : null);
      
      if (partial.timer?.seconds !== undefined) {
        setTimer(partial.timer.seconds);
      }
    });

    // Écouter le premier buzz
    onBuzzFirst((data: { teamId: string; ts: number }) => {
      console.log('🔔 Screen: Premier buzz détecté', data);
      playSound('buzz');
      
      // Jouer le son du buzz
      const audio = new Audio('/sounds/buzz.mp3');
      audio.play().catch(() => {});
      
      if (gameState?.teams) {
        const team = gameState.teams.find((t: any) => t.id === data.teamId);
        if (team) {
          setFirstBuzzTeam(team);
          setTimeout(() => setFirstBuzzTeam(null), 3000);
        }
      }
    });
  }, []);

  // Gérer le décompte du timer
  useEffect(() => {
    if (!gameState?.timer.running) return;
    
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState?.timer.running]);

  // Affichage du classement
  if (gameState?.showLeaderboard) {
    const sortedTeams = [...(gameState.teams || [])].sort((a, b) => b.score - a.score);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 text-white p-12">
        <NetworkStatus />
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Trophy className="w-32 h-32 mx-auto mb-6 animate-bounce" />
            <h1 className="text-7xl font-bold mb-4">🏆 CLASSEMENT 🏆</h1>
          </div>
          
          <div className="space-y-6">
            {sortedTeams.map((team, index) => (
              <div 
                key={team.id}
                className="bg-white/20 backdrop-blur-lg rounded-3xl p-8 flex items-center gap-8 transform transition-all hover:scale-105"
                style={{ borderLeft: `12px solid ${team.color}` }}
              >
                <div className="text-8xl font-bold w-32 text-center">
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index > 2 && `#${index + 1}`}
                </div>
                <div className="flex-1">
                  <div className="text-5xl font-bold">{team.name}</div>
                </div>
                <div className="text-8xl font-bold tabular-nums">{team.score}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Affichage de la manche (si quiz chargé)
  const currentRound = gameState?.quiz?.rounds[gameState.quiz.currentRound || 0];
  const currentQuestion = currentRound?.questions[gameState?.quiz?.currentQuestion || 0];
  
  const sortedTeams = [...(gameState?.teams || [])].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/80 to-primary/60 text-white p-8 relative overflow-hidden">
      <NetworkStatus />
      
      {/* Effet buzz */}
      {firstBuzzTeam && (
        <div className="absolute inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 bg-yellow-500/30 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-9xl animate-bounce">🔔</div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* En-tête avec manche */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold mb-4 drop-shadow-2xl">🎯 Arena Live</h1>
          {currentRound && (
            <div className="inline-block bg-white/20 backdrop-blur-lg rounded-2xl px-8 py-4">
              <h2 className="text-4xl font-semibold">{currentRound.name}</h2>
              {gameState?.quiz && (
                <p className="text-xl opacity-80 mt-2">
                  Question {(gameState.quiz.currentQuestion || 0) + 1}/{currentRound.questions.length}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Question */}
        {currentQuestion && (
          <div className="bg-white/15 backdrop-blur-lg rounded-3xl p-12 text-center shadow-2xl border-2 border-white/30">
            <div className="mb-6">
              <span className="px-6 py-3 bg-white/30 rounded-full text-xl font-semibold uppercase">
                {currentQuestion.type}
              </span>
            </div>
            <h3 className="text-5xl font-bold leading-tight">{currentQuestion.text}</h3>
            
            {/* Options QCM */}
            {currentQuestion.type === 'qcm' && currentQuestion.options && (
              <div className="grid grid-cols-2 gap-6 mt-8">
                {currentQuestion.options.map((option, idx) => (
                  <div key={idx} className="bg-white/10 rounded-xl p-6 text-2xl font-semibold">
                    {String.fromCharCode(65 + idx)}. {option}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timer XXL */}
        {gameState?.timer.running && (
          <div className="text-center">
            <div className="inline-block bg-white/20 backdrop-blur-lg rounded-full px-20 py-12 shadow-2xl border-4 border-white/40">
              <div className={`text-9xl font-bold tabular-nums transition-colors ${
                gameState.timer.seconds <= 10 ? 'text-red-400 animate-pulse' : ''
              }`}>
                {gameState.timer.seconds}
              </div>
              <div className="text-3xl opacity-80 mt-2">secondes</div>
            </div>
            {/* Barre de progression */}
            <div className="w-full max-w-3xl mx-auto mt-8 h-6 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-red-500 transition-all duration-1000"
                style={{ width: `${(gameState.timer.seconds / 30) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Premier buzz avec effet */}
        {firstBuzzTeam && (
          <div 
            className="bg-white/25 backdrop-blur-lg rounded-3xl p-16 text-center border-8 shadow-2xl transform scale-105"
            style={{ borderColor: firstBuzzTeam.color, boxShadow: `0 0 60px ${firstBuzzTeam.color}` }}
          >
            <div className="text-8xl mb-6 animate-bounce">🔔</div>
            <div className="text-7xl font-bold mb-4" style={{ color: firstBuzzTeam.color }}>
              {firstBuzzTeam.name}
            </div>
            <div className="text-4xl opacity-90 uppercase tracking-wider">PREMIER BUZZ !</div>
          </div>
        )}

        {/* Scores compacts en bas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sortedTeams.map((team, index) => (
            <div 
              key={team.id}
              className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 text-center border-l-8 shadow-lg"
              style={{ borderLeftColor: team.color }}
            >
              <div className="text-sm opacity-70 mb-1">#{index + 1}</div>
              <div className="text-2xl font-bold mb-1">{team.name}</div>
              <div className="text-5xl font-bold tabular-nums">{team.score}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Screen;

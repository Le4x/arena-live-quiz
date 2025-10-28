import { useState, useEffect, useRef } from "react";
import { Trophy, Zap, Check, X } from "lucide-react";
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

  // Écran d'ambiance - affiché en début de soirée
  const showAmbientScreen = gameState?.showLeaderboard === false && !gameState?.question;
  const showRoundIntro = gameState?.showRoundIntro === true;

  // Classement paginé
  const teamsPerPage = 10;
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
        <div className="relative z-10 h-screen flex flex-col items-center justify-center">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`absolute text-${6 + i}xl opacity-${20 + i * 5} animate-bounce`}
                style={{
                  left: `${10 + i * 15}%`,
                  top: `${20 + (i % 3) * 25}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: `${3 + i * 0.5}s`
                }}
              >
                {i % 2 === 0 ? '🎵' : '🎶'}
              </div>
            ))}
          </div>

          <div className="text-center animate-slide-in">
            <h1 className="text-9xl font-bold bg-gradient-arena bg-clip-text text-transparent animate-pulse-glow mb-8">
              ARENA LIVE
            </h1>
            
            <div className="flex items-end justify-center gap-3 h-32 mb-8">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-4 bg-gradient-arena rounded-t-lg animate-pulse"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.8s',
                    height: `${Math.random() * 60 + 40}%`
                  }}
                ></div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-6 text-3xl">
              <div className="w-16 h-1 bg-gradient-arena rounded animate-pulse"></div>
              <p className="text-secondary font-bold">
                Préparez-vous...
              </p>
              <div className="w-16 h-1 bg-gradient-arena rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      ) : gameState?.showLeaderboard ? (
        /* ===== LEADERBOARD ===== */
        <div className="relative z-10 p-8 h-screen flex flex-col">
          <div className="text-center mb-12">
            <h1 className="text-8xl font-bold bg-gradient-arena bg-clip-text text-transparent animate-pulse-glow mb-4">
              CLASSEMENT
            </h1>
            {totalPages > 1 && (
              <p className="text-2xl text-muted-foreground">
                Page {leaderboardPage + 1} / {totalPages}
              </p>
            )}
          </div>

          {/* Top 3 Podium */}
          {leaderboardPage === 0 && sortedTeams.length >= 3 && (
            <div className="flex items-end justify-center gap-8 mb-12">
              {/* 2ème place */}
              <div className="text-center animate-slide-in" style={{ animationDelay: '0.2s' }}>
                <div className="text-6xl mb-4">🥈</div>
                <div className="bg-card/90 backdrop-blur-sm rounded-xl p-6 border-2" style={{ borderColor: sortedTeams[1].color }}>
                  <div className="w-16 h-16 rounded-full mx-auto mb-3" style={{ backgroundColor: sortedTeams[1].color }}></div>
                  <h3 className="text-2xl font-bold mb-2">{sortedTeams[1].name}</h3>
                  <p className="text-4xl font-bold text-primary">{sortedTeams[1].score}</p>
                </div>
              </div>

              {/* 1ère place */}
              <div className="text-center animate-scale-in">
                <div className="text-8xl mb-4">🏆</div>
                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl p-8 border-4 border-yellow-500 shadow-glow-gold">
                  <div className="w-24 h-24 rounded-full mx-auto mb-4" style={{ backgroundColor: sortedTeams[0].color }}></div>
                  <h3 className="text-4xl font-bold mb-3">{sortedTeams[0].name}</h3>
                  <p className="text-6xl font-bold text-yellow-500">{sortedTeams[0].score}</p>
                </div>
              </div>

              {/* 3ème place */}
              <div className="text-center animate-slide-in" style={{ animationDelay: '0.4s' }}>
                <div className="text-6xl mb-4">🥉</div>
                <div className="bg-card/90 backdrop-blur-sm rounded-xl p-6 border-2" style={{ borderColor: sortedTeams[2].color }}>
                  <div className="w-16 h-16 rounded-full mx-auto mb-3" style={{ backgroundColor: sortedTeams[2].color }}></div>
                  <h3 className="text-2xl font-bold mb-2">{sortedTeams[2].name}</h3>
                  <p className="text-4xl font-bold text-primary">{sortedTeams[2].score}</p>
                </div>
              </div>
            </div>
          )}

          {/* Liste complète */}
          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-2 gap-6 max-h-full overflow-y-auto">
              {currentPageTeams.map((team, index) => {
                const globalIndex = leaderboardPage * teamsPerPage + index;
                return (
                  <div
                    key={team.id}
                    className="bg-card/80 backdrop-blur-sm rounded-xl p-6 border-2 animate-slide-in"
                    style={{ 
                      borderColor: team.color,
                      animationDelay: `${index * 0.1}s`
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold text-muted-foreground w-12">
                        #{globalIndex + 1}
                      </div>
                      <div className="w-12 h-12 rounded-full" style={{ backgroundColor: team.color }}></div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold">{team.name}</h3>
                        <p className="text-3xl font-bold text-primary">{team.score} pts</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ===== ÉCRAN DE JEU PRINCIPAL ===== */
        <div className="relative z-10 p-8 h-screen flex flex-col">
          {/* Timer géant */}
          {gameState?.timer.running && timer > 0 && (
            <div className="absolute top-8 right-8 animate-scale-in">
              <div className={`text-9xl font-black ${timer <= 5 ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
                {timer}
              </div>
            </div>
          )}

          {/* Question principale */}
          {gameState?.question && (
            <div className="mb-8 animate-slide-in">
              <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-12 border-4 border-primary shadow-glow-gold">
                <h2 className="text-6xl font-bold text-center mb-6">
                  {gameState.question.text}
                </h2>
                
                {/* Options QCM */}
                {gameState.question.type === 'qcm' && gameState.question.options && (
                  <div className="grid grid-cols-2 gap-6 mt-8">
                    {gameState.question.options.map((option: string, index: number) => (
                      <div
                        key={index}
                        className="bg-secondary/20 backdrop-blur-sm rounded-xl p-6 border-2 border-secondary"
                      >
                        <p className="text-3xl font-bold text-center">{option}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Premier buzz avec halo */}
          {firstBuzzTeam && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-scale-in">
              <div className="text-center">
                <div 
                  className="w-64 h-64 rounded-full animate-pulse mb-8"
                  style={{ 
                    backgroundColor: firstBuzzTeam.color,
                    boxShadow: `0 0 100px 50px ${firstBuzzTeam.color}`
                  }}
                >
                  <div className="flex items-center justify-center h-full">
                    <Zap className="w-32 h-32 text-white" />
                  </div>
                </div>
                <h2 className="text-8xl font-black text-white mb-4" style={{ textShadow: '0 0 20px rgba(0,0,0,0.8)' }}>
                  {firstBuzzTeam.name}
                </h2>
                <p className="text-5xl font-bold text-yellow-300">PREMIER BUZZ !</p>
              </div>
            </div>
          )}

          {/* Mini classement en bas */}
          <div className="mt-auto">
            <div className="flex gap-4 overflow-x-auto pb-4">
              {sortedTeams.slice(0, 8).map((team, index) => (
                <div
                  key={team.id}
                  className="bg-card/80 backdrop-blur-sm rounded-xl p-4 border-2 flex-shrink-0 min-w-[200px]"
                  style={{ borderColor: team.color }}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-muted-foreground">#{index + 1}</div>
                    <div className="w-10 h-10 rounded-full" style={{ backgroundColor: team.color }}></div>
                    <div>
                      <h3 className="font-bold">{team.name}</h3>
                      <p className="text-xl font-bold text-primary">{team.score} pts</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Screen;

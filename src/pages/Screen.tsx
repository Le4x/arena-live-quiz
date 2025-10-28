import { useState, useEffect } from "react";
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

  // Écran d'ambiance - affiché en début de soirée
  const showAmbientScreen = gameState?.showLeaderboard === false && !gameState?.question;
  const showRoundIntro = gameState?.showRoundIntro === true;

  // Classement paginé
  const teamsPerPage = 10;
  const [leaderboardPage, setLeaderboardPage] = useState(0);
  const sortedTeams = [...(gameState?.teams || [])].sort((a, b) => b.score - a.score);
  const totalPages = Math.ceil(sortedTeams.length / teamsPerPage);
  const currentPageTeams = sortedTeams.slice(
    leaderboardPage * teamsPerPage,
    (leaderboardPage + 1) * teamsPerPage
  );

  useEffect(() => {
    if (!gameState?.showLeaderboard || totalPages <= 1) return;
    
    const interval = setInterval(() => {
      setLeaderboardPage((prev) => (prev + 1) % totalPages);
    }, 5000);

    return () => clearInterval(interval);
  }, [gameState?.showLeaderboard, totalPages]);

  return (
    <div className="min-h-screen bg-gradient-glow relative overflow-hidden">
      <NetworkStatus />
      
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {showRoundIntro && gameState.currentRound ? (
        /* ===== INTRO DE MANCHE ===== */
        <div className="relative z-10 h-screen flex flex-col items-center justify-center">
          <div className="text-center animate-slide-in">
            <div className="text-9xl mb-6 animate-bounce">
              {gameState.currentRound.type === 'buzzer' ? '🔔' : gameState.currentRound.type === 'qcm' ? '❓' : '✍️'}
            </div>
            <h1 className="text-8xl font-black bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 bg-clip-text text-transparent mb-8">
              NOUVELLE MANCHE
            </h1>
            <h2 className="text-6xl font-black text-yellow-300 uppercase tracking-wider">
              {gameState.currentRound.title}
            </h2>
          </div>
        </div>
      ) : showAmbientScreen ? (
        /* ===== ÉCRAN D'AMBIANCE ===== */
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

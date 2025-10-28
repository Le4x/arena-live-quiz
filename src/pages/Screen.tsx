import { useState, useEffect, useRef } from "react";
import { Trophy, Music, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { playSound } from "@/lib/sounds";
import { SupabaseNetworkStatus } from "@/components/SupabaseNetworkStatus";
import { useSupabaseResilience } from "@/hooks/useSupabaseResilience";

const Screen = () => {
  const [gameState, setGameState] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [currentRound, setCurrentRound] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [firstBuzzTeam, setFirstBuzzTeam] = useState<any>(null);
  const [timer, setTimer] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { saveToCache, loadFromCache } = useSupabaseResilience();

  useEffect(() => {
    loadGameState();
    loadTeams();

    // Écouter les changements en temps réel
    const gameStateChannel = supabase
      .channel('screen-game-state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, () => {
        loadGameState();
      })
      .subscribe();

    const teamsChannel = supabase
      .channel('screen-teams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        loadTeams();
      })
      .subscribe();

    const buzzerChannel = supabase
      .channel('screen-buzzers')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'buzzer_attempts' }, (payload) => {
        if (payload.new.is_first) {
          handleFirstBuzz(payload.new.team_id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(gameStateChannel);
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(buzzerChannel);
    };
  }, []);

  const loadGameState = async () => {
    try {
      const { data, error } = await supabase
        .from('game_state')
        .select('*, questions(*), rounds(*)')
        .maybeSingle();

      if (data) {
        setGameState(data);
        setCurrentQuestion(data.questions);
        setCurrentRound(data.rounds);
        setTimer(data.timer_remaining || 0);
        saveToCache('screenState', { gameState: data, currentQuestion: data.questions, currentRound: data.rounds });
      } else if (error) {
        const cached = loadFromCache('screenState');
        if (cached?.gameState) {
          setGameState(cached.gameState);
          setCurrentQuestion(cached.currentQuestion);
          setCurrentRound(cached.currentRound);
        }
      }
    } catch (error) {
      console.error('Error loading game state:', error);
      const cached = loadFromCache('screenState');
      if (cached?.gameState) {
        setGameState(cached.gameState);
        setCurrentQuestion(cached.currentQuestion);
        setCurrentRound(cached.currentRound);
      }
    }
  };

  const loadTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('is_active', true)
        .order('score', { ascending: false });

      if (data) {
        setTeams(data);
        saveToCache('screenTeams', { teams: data });
      } else if (error) {
        const cached = loadFromCache('screenTeams');
        if (cached?.teams) {
          setTeams(cached.teams);
        }
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      const cached = loadFromCache('screenTeams');
      if (cached?.teams) {
        setTeams(cached.teams);
      }
    }
  };

  const handleFirstBuzz = (teamId: string) => {
    playSound('buzz');
    const team = teams.find((t: any) => t.id === teamId);
    if (team) {
      setFirstBuzzTeam(team);
      setTimeout(() => setFirstBuzzTeam(null), 3000);
    }
  };

  // Gérer le décompte du timer
  useEffect(() => {
    if (!gameState?.timer_active) return;
    
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState?.timer_active]);

  // Jouer le jingle de la manche
  useEffect(() => {
    if (currentRound?.jingle_url && audioRef.current) {
      audioRef.current.src = currentRound.jingle_url;
      audioRef.current.play().catch(() => {});
    }
  }, [currentRound?.id]);

  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

  // Écran d'attente / ambiance
  if (gameState?.show_ambient_screen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black text-white p-4 sm:p-8 md:p-12 relative overflow-hidden">
        <SupabaseNetworkStatus />
        <audio ref={audioRef} loop />
        
        {/* Particules animées */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 sm:w-64 sm:h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-32 h-32 sm:w-96 sm:h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="max-w-7xl mx-auto h-screen flex flex-col items-center justify-center relative z-10">
          <div className="text-center space-y-6 sm:space-y-8 animate-fade-in">
            <Music className="w-20 h-20 sm:w-32 sm:h-32 md:w-40 md:h-40 mx-auto text-yellow-400 animate-pulse" />
            <h1 className="text-5xl sm:text-7xl md:text-9xl font-black bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-2xl">
              BLINDTEST
            </h1>
            <p className="text-2xl sm:text-3xl md:text-4xl text-yellow-200 animate-pulse">
              Préparez-vous...
            </p>
          </div>

          {/* Mini classement en bas */}
          {sortedTeams.length > 0 && (
            <div className="absolute bottom-4 sm:bottom-8 left-0 right-0">
              <div className="flex flex-wrap justify-center gap-2 sm:gap-4 px-4">
                {sortedTeams.slice(0, 4).map((team, index) => (
                  <div 
                    key={team.id}
                    className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-xl sm:rounded-2xl px-3 py-2 sm:px-6 sm:py-4 text-center border-l-4"
                    style={{ borderLeftColor: team.color }}
                  >
                    <div className="text-xs sm:text-sm text-yellow-400 font-semibold">#{index + 1}</div>
                    <div className="text-sm sm:text-xl font-bold text-yellow-50 truncate max-w-[80px] sm:max-w-none">{team.name}</div>
                    <div className="text-lg sm:text-3xl font-bold text-yellow-400">{team.score}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Intro de manche
  if (gameState?.show_round_intro && currentRound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black text-white p-4 sm:p-8 md:p-12 relative overflow-hidden">
        <SupabaseNetworkStatus />
        <audio ref={audioRef} autoPlay />
        
        {/* Effet de lumière */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-yellow-500/20 to-transparent blur-3xl animate-pulse" />
        </div>

        <div className="max-w-7xl mx-auto h-screen flex flex-col items-center justify-center relative z-10">
          <div className="text-center space-y-6 sm:space-y-12 animate-scale-in">
            <Play className="w-20 h-20 sm:w-32 sm:h-32 md:w-40 md:h-40 mx-auto text-yellow-400 animate-bounce" />
            <div>
              <div className="text-2xl sm:text-3xl md:text-4xl text-yellow-400 font-semibold mb-2 sm:mb-4 uppercase tracking-wider">
                Manche {(gameState?.current_round_id || '').split('-')[0]}
              </div>
              <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-2xl px-4">
                {currentRound.title}
              </h1>
            </div>
            <div className="flex items-center justify-center gap-2 sm:gap-4 text-xl sm:text-2xl md:text-3xl text-yellow-200">
              <Music className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="uppercase tracking-wider">{currentRound.type}</span>
              <Music className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Affichage du classement
  if (gameState?.show_leaderboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4 sm:p-8 md:p-12">
        <SupabaseNetworkStatus />
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 animate-scale-in">
            <Trophy className="w-20 h-20 sm:w-32 sm:h-32 mx-auto mb-4 sm:mb-6 text-yellow-400 animate-bounce" />
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold mb-2 sm:mb-4 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent">
              🏆 CLASSEMENT 🏆
            </h1>
          </div>
          
          <div className="space-y-3 sm:space-y-6 animate-fade-in">
            {sortedTeams.map((team, index) => (
              <div 
                key={team.id}
                className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-8 flex items-center gap-4 sm:gap-8 transform transition-all hover:scale-105 border-l-4 sm:border-l-8 shadow-2xl"
                style={{ borderLeftColor: team.color, boxShadow: `0 8px 40px ${team.color}30` }}
              >
                <div className="text-4xl sm:text-6xl md:text-8xl font-bold w-16 sm:w-32 text-center flex-shrink-0">
                  {index === 0 && <span className="drop-shadow-2xl">🥇</span>}
                  {index === 1 && <span className="drop-shadow-2xl">🥈</span>}
                  {index === 2 && <span className="drop-shadow-2xl">🥉</span>}
                  {index > 2 && <span className="text-yellow-400">#{index + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl sm:text-4xl md:text-5xl font-bold text-yellow-50 truncate">{team.name}</div>
                </div>
                <div className="text-4xl sm:text-6xl md:text-8xl font-bold tabular-nums text-yellow-400 flex-shrink-0">{team.score}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Écran de jeu principal
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4 sm:p-6 md:p-8 relative overflow-hidden">
      <SupabaseNetworkStatus />
      <audio ref={audioRef} />
      
      {/* Effet buzz */}
      {firstBuzzTeam && (
        <div className="absolute inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 bg-yellow-500/30 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl sm:text-8xl md:text-9xl animate-bounce">🔔</div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8 relative z-10">
        {/* En-tête */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8 animate-fade-in">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-2 sm:mb-4 drop-shadow-2xl bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent">
            🎯 BLINDTEST
          </h1>
          {currentRound && (
            <div className="inline-block bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-xl sm:rounded-2xl px-4 sm:px-8 py-2 sm:py-4 border border-yellow-500/30">
              <h2 className="text-xl sm:text-2xl md:text-4xl font-semibold text-yellow-400">{currentRound.title}</h2>
            </div>
          )}
        </div>

        {/* Question */}
        {currentQuestion && (
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-12 text-center shadow-2xl border-2 border-yellow-500/30 animate-scale-in">
            <div className="mb-4 sm:mb-6">
              <span className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 rounded-full text-base sm:text-lg md:text-xl font-semibold uppercase tracking-wider border border-yellow-500/30">
                {currentQuestion.question_type}
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-yellow-50 px-2 sm:px-4">
              {currentQuestion.question_text}
            </h3>
            
            {/* Options QCM */}
            {currentQuestion.question_type === 'qcm' && currentQuestion.options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mt-6 sm:mt-8">
                {(currentQuestion.options as string[]).map((option: string, idx: number) => (
                  <div 
                    key={idx} 
                    className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl p-4 sm:p-6 text-lg sm:text-xl md:text-2xl font-semibold border border-yellow-500/20 hover-scale transition-all"
                  >
                    <span className="text-yellow-400 text-xl sm:text-2xl md:text-3xl font-bold mr-2 sm:mr-3">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-yellow-50">{option}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timer XXL */}
        {gameState?.timer_active && (
          <div className="text-center animate-scale-in">
            <div className="inline-block bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-full px-12 sm:px-16 md:px-20 py-8 sm:py-10 md:py-12 shadow-2xl border-4 border-yellow-500/40">
              <div className={`text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tabular-nums transition-all duration-300 ${
                timer <= 10 ? 'text-red-500 animate-pulse scale-110' : 'text-yellow-400'
              }`}>
                {timer}
              </div>
              <div className="text-xl sm:text-2xl md:text-3xl opacity-80 mt-2 text-yellow-200">secondes</div>
            </div>
            {/* Barre de progression */}
            <div className="w-full max-w-3xl mx-auto mt-4 sm:mt-6 md:mt-8 h-4 sm:h-5 md:h-6 bg-gray-800 rounded-full overflow-hidden border border-yellow-500/20">
              <div 
                className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 transition-all duration-1000 shadow-lg"
                style={{ width: `${(timer / 30) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Premier buzz avec effet */}
        {firstBuzzTeam && (
          <div 
            className="bg-gradient-to-br from-gray-800/95 to-gray-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-8 sm:p-12 md:p-16 text-center border-4 sm:border-8 shadow-2xl transform scale-105 animate-scale-in"
            style={{ borderColor: firstBuzzTeam.color, boxShadow: `0 0 80px ${firstBuzzTeam.color}` }}
          >
            <div className="text-6xl sm:text-7xl md:text-8xl mb-4 sm:mb-6 animate-bounce">🔔</div>
            <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-2 sm:mb-4 animate-pulse truncate px-2" style={{ color: firstBuzzTeam.color }}>
              {firstBuzzTeam.name}
            </div>
            <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-yellow-400 uppercase tracking-wider font-bold">
              PREMIER BUZZ !
            </div>
          </div>
        )}

        {/* Scores compacts en bas */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 animate-fade-in">
          {sortedTeams.map((team, index) => (
            <div 
              key={team.id}
              className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 text-center border-l-4 sm:border-l-8 shadow-lg hover-scale transition-all duration-300"
              style={{ borderLeftColor: team.color, boxShadow: `0 4px 20px ${team.color}20` }}
            >
              <div className="text-xs sm:text-sm text-yellow-400 mb-1 font-semibold">#{index + 1}</div>
              <div className="text-base sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2 text-yellow-50 truncate">{team.name}</div>
              <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tabular-nums text-yellow-400">{team.score}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Screen;

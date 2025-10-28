import { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { playSound } from "@/lib/sounds";
import { SupabaseNetworkStatus } from "@/components/SupabaseNetworkStatus";
import { useSupabaseResilience } from "@/hooks/useSupabaseResilience";

const Screen = () => {
  const [gameState, setGameState] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [firstBuzzTeam, setFirstBuzzTeam] = useState<any>(null);
  const [timer, setTimer] = useState<number>(0);
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
        .select('*, questions(*)')
        .maybeSingle();

      if (data) {
        setGameState(data);
        setCurrentQuestion(data.questions);
        setTimer(data.timer_remaining || 0);
        saveToCache('screenState', { gameState: data, currentQuestion: data.questions });
      } else if (error) {
        const cached = loadFromCache('screenState');
        if (cached?.gameState) {
          setGameState(cached.gameState);
          setCurrentQuestion(cached.currentQuestion);
        }
      }
    } catch (error) {
      console.error('Error loading game state:', error);
      const cached = loadFromCache('screenState');
      if (cached?.gameState) {
        setGameState(cached.gameState);
        setCurrentQuestion(cached.currentQuestion);
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

  // Affichage du classement
  if (gameState?.show_leaderboard) {
    const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 text-white p-12">
        <SupabaseNetworkStatus />
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

  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/80 to-primary/60 text-white p-8 relative overflow-hidden">
      <SupabaseNetworkStatus />
      
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
        {/* En-tête */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold mb-4 drop-shadow-2xl">🎯 Arena Live</h1>
        </div>

        {/* Question */}
        {currentQuestion && (
          <div className="bg-white/15 backdrop-blur-lg rounded-3xl p-12 text-center shadow-2xl border-2 border-white/30">
            <div className="mb-6">
              <span className="px-6 py-3 bg-white/30 rounded-full text-xl font-semibold uppercase">
                {currentQuestion.question_type}
              </span>
            </div>
            <h3 className="text-5xl font-bold leading-tight">{currentQuestion.question_text}</h3>
            
            {/* Options QCM */}
            {currentQuestion.question_type === 'qcm' && currentQuestion.options && (
              <div className="grid grid-cols-2 gap-6 mt-8">
                {(currentQuestion.options as string[]).map((option: string, idx: number) => (
                  <div key={idx} className="bg-white/10 rounded-xl p-6 text-2xl font-semibold">
                    {String.fromCharCode(65 + idx)}. {option}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timer XXL */}
        {gameState?.timer_active && (
          <div className="text-center">
            <div className="inline-block bg-white/20 backdrop-blur-lg rounded-full px-20 py-12 shadow-2xl border-4 border-white/40">
              <div className={`text-9xl font-bold tabular-nums transition-colors ${
                timer <= 10 ? 'text-red-400 animate-pulse' : ''
              }`}>
                {timer}
              </div>
              <div className="text-3xl opacity-80 mt-2">secondes</div>
            </div>
            {/* Barre de progression */}
            <div className="w-full max-w-3xl mx-auto mt-8 h-6 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-red-500 transition-all duration-1000"
                style={{ width: `${(timer / 30) * 100}%` }}
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

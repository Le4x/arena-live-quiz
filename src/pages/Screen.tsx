import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Zap, Check, X } from "lucide-react";
import { playSound } from "@/lib/sounds";
import { JingleRoundIntro } from "@/components/tv/JingleRoundIntro";
import { JingleReveal } from "@/components/tv/JingleReveal";
import { LeaderboardTransition } from "@/components/tv/LeaderboardTransition";

const Screen = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [gameState, setGameState] = useState<any>(null);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [timer, setTimer] = useState<number | null>(null);
  const [buzzers, setBuzzers] = useState<any[]>([]);
  const [qcmAnswers, setQcmAnswers] = useState<any[]>([]);
  const [textAnswers, setTextAnswers] = useState<any[]>([]);
  const [currentRound, setCurrentRound] = useState<any>(null);
  const [showRevealAnimation, setShowRevealAnimation] = useState(false);
  const [revealResult, setRevealResult] = useState<'correct' | 'incorrect' | null>(null);

  useEffect(() => {
    loadData();
    
    // Realtime subscriptions avec rechargement complet
    const teamsChannel = supabase
      .channel('screen-teams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        console.log('🔄 Screen: Teams changed');
        loadData();
      })
      .subscribe();

    const gameStateChannel = supabase
      .channel('screen-game-state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, () => {
        console.log('🔄 Screen: Game state changed');
        loadData();
        loadBuzzers();
        loadQcmAnswers();
        loadTextAnswers();
      })
      .subscribe();

    const buzzersChannel = supabase
      .channel('screen-buzzers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buzzer_attempts' }, () => {
        console.log('🔄 Screen: Buzzer detected');
        loadBuzzers();
      })
      .subscribe();

    const answersChannel = supabase
      .channel('screen-qcm-answers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_answers' }, () => {
        console.log('🔄 Screen: Answer received');
        loadQcmAnswers();
        loadTextAnswers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(gameStateChannel);
      supabase.removeChannel(buzzersChannel);
      supabase.removeChannel(answersChannel);
    };
  }, []);

  useEffect(() => {
    console.log('📌 Question or session changed, loading buzzers');
    loadBuzzers();
    loadQcmAnswers();
    loadTextAnswers();
  }, [currentQuestion?.id, gameState?.game_session_id]);

  useEffect(() => {
    // Vérifier les buzzers toutes les 2 secondes sur Screen aussi
    const interval = setInterval(() => {
      if (currentQuestion?.id && gameState?.game_session_id && gameState?.is_buzzer_active) {
        loadBuzzers();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentQuestion?.id, gameState?.game_session_id, gameState?.is_buzzer_active]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState?.timer_active && gameState?.timer_remaining !== null) {
      setTimer(gameState.timer_remaining);
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev === null || prev <= 0) return 0;
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState?.timer_active, gameState?.timer_remaining]);

  // Jouer les sons ET afficher l'animation quand le résultat change
  useEffect(() => {
    if (gameState?.answer_result === 'correct') {
      playSound('correct');
      setRevealResult('correct');
      setShowRevealAnimation(true);
      setTimeout(() => setShowRevealAnimation(false), 3000);
    } else if (gameState?.answer_result === 'incorrect') {
      playSound('incorrect');
      setRevealResult('incorrect');
      setShowRevealAnimation(true);
      setTimeout(() => setShowRevealAnimation(false), 2000);
    }
  }, [gameState?.answer_result]);

  const loadData = async () => {
    const [teamsRes, gameStateRes] = await Promise.all([
      supabase.from('teams').select('*').order('score', { ascending: false }),
      supabase.from('game_state').select('*, questions(*), game_sessions(*)').maybeSingle()
    ]);

    if (teamsRes.data) setTeams(teamsRes.data);
    if (gameStateRes.data) {
      setGameState(gameStateRes.data);
      
      // NE PAS charger la question si on affiche l'intro de manche
      if (!gameStateRes.data.show_round_intro) {
        setCurrentQuestion(gameStateRes.data.questions);
      }
      
      setCurrentSession(gameStateRes.data.game_sessions);
      
      // Charger la manche de l'intro si nécessaire
      if (gameStateRes.data.show_round_intro && gameStateRes.data.current_round_intro) {
        const { data: roundData } = await supabase
          .from('rounds')
          .select('*')
          .eq('id', gameStateRes.data.current_round_intro)
          .single();
        if (roundData) setCurrentRound(roundData);
      }
    }
  };

  const loadBuzzers = async () => {
    if (!currentQuestion?.id || !gameState?.game_session_id) {
      setBuzzers([]);
      return;
    }
    
    const { data } = await supabase
      .from('buzzer_attempts')
      .select('*, teams(*)')
      .eq('question_id', currentQuestion.id)
      .eq('game_session_id', gameState.game_session_id)
      .order('buzzed_at', { ascending: true });
    
    if (data) setBuzzers(data);
  };

  const loadQcmAnswers = async () => {
    if (!currentQuestion?.id || currentQuestion?.question_type !== 'qcm' || !gameState?.game_session_id) {
      setQcmAnswers([]);
      return;
    }
    
    const { data } = await supabase
      .from('team_answers')
      .select('*')
      .eq('question_id', currentQuestion.id)
      .eq('game_session_id', gameState.game_session_id);
    
    if (data) setQcmAnswers(data);
  };

  const loadTextAnswers = async () => {
    if (!currentQuestion?.id || currentQuestion?.question_type !== 'free_text' || !gameState?.game_session_id) {
      setTextAnswers([]);
      return;
    }
    
    const { data } = await supabase
      .from('team_answers')
      .select('*')
      .eq('question_id', currentQuestion.id)
      .eq('game_session_id', gameState.game_session_id);
    
    if (data) setTextAnswers(data);
  };

  return (
    <div className="min-h-screen bg-gradient-glow relative overflow-hidden">
      {/* Animation de révélation bonne/mauvaise réponse */}
      {showRevealAnimation && revealResult && (
        <JingleReveal
          result={revealResult}
          onComplete={() => setShowRevealAnimation(false)}
        />
      )}

      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 p-8">
        {/* Logo et titre */}
        <header className="text-center py-6 animate-slide-in">
          <h1 className="text-6xl font-bold bg-gradient-arena bg-clip-text text-transparent animate-pulse-glow">
            {currentSession?.name || 'ARENA'}
          </h1>
          <p className="text-accent text-xl mt-2 font-bold">
            {teams.length} équipe{teams.length > 1 ? 's' : ''} connectée{teams.length > 1 ? 's' : ''}
          </p>
        </header>

        {/* Intro de manche avec composant TV pro */}
        {gameState?.show_round_intro && currentRound && (
          <JingleRoundIntro
            roundTitle={currentRound.title}
            roundNumber={currentSession?.current_round_index ? currentSession.current_round_index + 1 : undefined}
            duration={10000}
            onComplete={() => {
              // L'intro se désactive automatiquement après 10s via Regie
              console.log('🎬 Intro terminée');
            }}
          />
        )}

        {/* Question actuelle */}
        {currentQuestion && !gameState?.show_leaderboard && !gameState?.show_round_intro && (
          <div className="max-w-5xl mx-auto mb-8 animate-slide-in">
            <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-8 border-2 border-primary shadow-glow-gold">
              <div className="text-center">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-primary font-bold uppercase tracking-wider">
                    Question
                  </div>
                  {(currentQuestion.question_type === 'qcm' || currentQuestion.question_type === 'free_text') && (
                    <div className="text-sm font-bold text-secondary">
                      {currentQuestion.question_type === 'qcm' ? qcmAnswers.length : textAnswers.length} / {teams.length} réponses
                    </div>
                  )}
                </div>
                <h2 className="text-4xl font-bold mb-6">{currentQuestion.question_text}</h2>
                
                {currentQuestion.options && (() => {
                  try {
                    const options = typeof currentQuestion.options === 'string' 
                      ? JSON.parse(currentQuestion.options as string) 
                      : currentQuestion.options;
                    return (
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        {Object.entries(options || {}).map(([key, value]) => (
                          <div
                            key={key}
                            className="bg-muted/50 rounded-xl p-4 border-2 border-secondary/50 hover:border-secondary transition-all"
                          >
                            <span className="text-secondary font-bold text-xl">{key}.</span>
                            <span className="ml-3 text-xl">{value as string}</span>
                          </div>
                        ))}
                      </div>
                    );
                  } catch (e) {
                    return null;
                  }
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Timer */}
        {timer !== null && timer > 0 && (
          <div className="fixed top-8 right-8 animate-slide-in">
            <div className="bg-accent/90 backdrop-blur-xl rounded-full w-32 h-32 flex items-center justify-center shadow-glow-purple">
              <span className="text-6xl font-bold text-accent-foreground">{timer}</span>
            </div>
          </div>
        )}

        {/* Buzzer actif indicator */}
        {gameState?.is_buzzer_active && (
          <div className="fixed top-8 left-8 animate-pulse">
            <div className="bg-primary/90 backdrop-blur-xl rounded-full px-8 py-4 flex items-center gap-3 shadow-glow-gold">
              <Zap className="w-8 h-8 text-primary-foreground" />
              <span className="text-2xl font-bold text-primary-foreground">BUZZER ACTIF</span>
            </div>
          </div>
        )}

        {/* Premier buzzeur en grand */}
        {buzzers.length > 0 && !gameState?.show_leaderboard && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-slide-in z-50">
            <div className="bg-card/95 backdrop-blur-xl rounded-3xl p-12 border-4 shadow-glow-gold"
                 style={{ borderColor: buzzers[0].teams?.color }}>
              <div className="text-center">
                <div className="flex items-center justify-center gap-4 mb-6">
                  <Zap className="w-16 h-16 text-primary animate-pulse" />
                  <h2 className="text-6xl font-bold text-primary">BUZZER !</h2>
                </div>
                <div
                  className="w-32 h-32 rounded-full mx-auto mb-6 animate-pulse"
                  style={{ backgroundColor: buzzers[0].teams?.color }}
                ></div>
                <h3 className="text-5xl font-bold mb-2">{buzzers[0].teams?.name}</h3>
                <p className="text-3xl text-muted-foreground">A buzzé en premier !</p>
              </div>
            </div>
          </div>
        )}

        {/* Liste des buzzers */}
        {buzzers.length > 1 && !gameState?.show_leaderboard && (
          <div className="fixed right-8 top-32 w-96 space-y-3 animate-slide-in">
            <div className="bg-card/90 backdrop-blur-xl rounded-2xl p-4 border-2 border-primary shadow-glow-gold">
              <h3 className="text-xl font-bold text-primary mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Autres buzzers ({buzzers.length - 1})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {buzzers.slice(1, 10).map((buzzer, index) => (
                  <div
                    key={buzzer.id}
                    className="flex items-center gap-3 p-3 rounded-lg border-2 bg-muted/50 animate-slide-in"
                    style={{ borderColor: buzzer.teams?.color, animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="text-2xl font-bold text-primary w-8">#{index + 2}</div>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: buzzer.teams?.color }}
                    ></div>
                    <div className="flex-1 font-bold">{buzzer.teams?.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Classement avec composant TV pro */}
        {gameState?.show_leaderboard && (
          <LeaderboardTransition
            teams={teams.map(t => ({
              id: t.id,
              name: t.name,
              score: t.score,
              color: t.color,
            }))}
            topCount={20}
          />
        )}

        {/* Classement original (caché quand le composant TV est actif) */}
        {gameState?.show_leaderboard && false && (
          <div className="w-full h-screen flex items-center justify-center animate-slide-in px-4">
            <div className="bg-card/90 backdrop-blur-xl rounded-2xl p-6 border-2 border-accent shadow-glow-purple w-full max-w-[95vw] h-[90vh] flex flex-col">
              <div className="flex items-center justify-center gap-3 mb-6">
                <Trophy className="w-10 h-10 text-primary" />
                <h2 className="text-4xl font-bold text-primary">Classement</h2>
              </div>
              
              {/* Page 1 : Top 3 + places 4-6 */}
              {(!gameState.leaderboard_page || gameState.leaderboard_page === 1) && (
                <div className="flex-1 flex flex-col justify-center gap-6">
                  {/* Top 3 - Podium style */}
                  {teams.length > 0 && (
                    <div className="flex items-end justify-center gap-4 mb-4">
                      {/* 2ème place */}
                      {teams[1] && (
                        <div className="flex flex-col items-center animate-scale-in" style={{ animationDelay: '0.2s' }}>
                          <div className="bg-muted/50 rounded-2xl p-4 border-2 border-secondary/50 w-44 text-center">
                            <div className="text-5xl mb-2">🥈</div>
                            <div
                              className="w-8 h-8 rounded-full mx-auto mb-2"
                              style={{ backgroundColor: teams[1].color }}
                            ></div>
                            <h3 className="text-lg font-bold mb-1 truncate">{teams[1].name}</h3>
                            <div className="text-3xl font-bold text-secondary">{teams[1].score}</div>
                          </div>
                          <div className="w-full h-20 bg-secondary/20 rounded-t-xl mt-2"></div>
                        </div>
                      )}
                      
                      {/* 1ère place */}
                      {teams[0] && (
                        <div className="flex flex-col items-center animate-scale-in" style={{ animationDelay: '0.1s' }}>
                          <div className="bg-muted/50 rounded-2xl p-5 border-3 border-primary shadow-glow-gold w-48 text-center">
                            <div className="text-6xl mb-2">🏆</div>
                            <div
                              className="w-10 h-10 rounded-full mx-auto mb-2 animate-pulse"
                              style={{ backgroundColor: teams[0].color }}
                            ></div>
                            <h3 className="text-xl font-bold mb-1 truncate">{teams[0].name}</h3>
                            <div className="text-4xl font-bold text-primary">{teams[0].score}</div>
                          </div>
                          <div className="w-full h-28 bg-primary/20 rounded-t-xl mt-2"></div>
                        </div>
                      )}
                      
                      {/* 3ème place */}
                      {teams[2] && (
                        <div className="flex flex-col items-center animate-scale-in" style={{ animationDelay: '0.3s' }}>
                          <div className="bg-muted/50 rounded-2xl p-4 border-2 border-accent/50 w-44 text-center">
                            <div className="text-5xl mb-2">🥉</div>
                            <div
                              className="w-8 h-8 rounded-full mx-auto mb-2"
                              style={{ backgroundColor: teams[2].color }}
                            ></div>
                            <h3 className="text-lg font-bold mb-1 truncate">{teams[2].name}</h3>
                            <div className="text-3xl font-bold text-accent">{teams[2].score}</div>
                          </div>
                          <div className="w-full h-16 bg-accent/20 rounded-t-xl mt-2"></div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Places 4-6 */}
                  {teams.length > 3 && (
                    <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto">
                      {teams.slice(3, 6).map((team, index) => (
                        <div
                          key={team.id}
                          className="flex flex-col items-center gap-2 bg-muted/30 rounded-xl p-4 border border-border/50 hover:border-primary/50 transition-all animate-fade-in"
                          style={{ animationDelay: `${(index + 3) * 0.1}s` }}
                        >
                          <div className="text-3xl font-bold text-muted-foreground">
                            {index + 4}
                          </div>
                          <div
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: team.color }}
                          ></div>
                          <div className="text-lg font-bold text-center truncate w-full">{team.name}</div>
                          <div className="text-2xl font-bold text-primary">
                            {team.score}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Page 2+ : Reste du classement en grille dense */}
              {gameState.leaderboard_page && gameState.leaderboard_page > 1 && (
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-4 gap-3 p-4">
                    {teams.slice(6 + (gameState.leaderboard_page - 2) * 20, 6 + (gameState.leaderboard_page - 1) * 20).map((team, index) => (
                      <div
                        key={team.id}
                        className="flex items-center gap-2 bg-muted/30 rounded-lg p-3 border border-border/50 hover:border-primary/50 transition-all animate-fade-in"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="text-xl font-bold text-muted-foreground w-10 text-center flex-shrink-0">
                          {7 + (gameState.leaderboard_page - 2) * 20 + index}
                        </div>
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: team.color }}
                        ></div>
                        <div className="flex-1 font-bold text-base truncate">{team.name}</div>
                        <div className="text-xl font-bold text-primary flex-shrink-0">
                          {team.score}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Résultat de validation - Effet de suspense */}
        {gameState?.answer_result && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className={`transform transition-all duration-500 animate-bounce-in ${
              gameState.answer_result === 'correct' 
                ? 'bg-green-500/95' 
                : 'bg-red-500/95'
            } backdrop-blur-xl rounded-3xl p-16 border-4 shadow-glow-gold`}>
              <div className="text-center">
                {gameState.answer_result === 'correct' ? (
                  <>
                    <Check className="w-40 h-40 text-white mx-auto mb-8 animate-pulse" />
                    <h2 className="text-8xl font-bold text-white">CORRECT !</h2>
                  </>
                ) : (
                  <>
                    <X className="w-40 h-40 text-white mx-auto mb-8 animate-pulse" />
                    <h2 className="text-8xl font-bold text-white">INCORRECT !</h2>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Message d'annonce */}
        {gameState?.announcement_text && (
          <div className="fixed bottom-12 left-1/2 transform -translate-x-1/2 max-w-4xl animate-slide-in">
            <div className="bg-secondary/90 backdrop-blur-xl rounded-2xl px-12 py-6 border-2 border-secondary shadow-glow-blue">
              <p className="text-3xl font-bold text-center text-secondary-foreground">
                {gameState.announcement_text}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Screen;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Zap, Check, X, Users } from "lucide-react";
import { motion } from "framer-motion";
import { playSound } from "@/lib/sounds";
import { JingleRoundIntro } from "@/components/tv/JingleRoundIntro";
import { JingleReveal } from "@/components/tv/JingleReveal";
import { LeaderboardPaginated } from "@/components/tv/LeaderboardPaginated";
import { WelcomeScreen } from "@/components/tv/WelcomeScreen";
import { TeamConnectionScreen } from "@/components/tv/TeamConnectionScreen";
import { getGameEvents } from "@/lib/runtime/GameEvents";
import { TimerBar } from "@/components/TimerBar";

const Screen = () => {
  const gameEvents = getGameEvents();
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
  const [buzzerNotification, setBuzzerNotification] = useState<{show: boolean, team: any} | null>(null);
  const [connectedTeamsCount, setConnectedTeamsCount] = useState(0);
  const [connectedTeamIds, setConnectedTeamIds] = useState<Set<string>>(new Set());
  const [timerDuration, setTimerDuration] = useState(30);

  // Debug: log buzzerNotification changes
  useEffect(() => {
    console.log('🔔 Screen: buzzerNotification changed:', buzzerNotification);
  }, [buzzerNotification]);

  useEffect(() => {
    console.log('🚀 Screen: Initialisation des canaux realtime');
    loadData();
    
    // Realtime subscriptions avec rechargement complet
    const teamsChannel = supabase
      .channel('screen-teams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        console.log('🔄 Screen: Teams changed');
        loadData();
      })
      .subscribe();

    // Canal de présence GLOBAL - écoute toutes les équipes connectées
    const presenceChannel = supabase.channel('team_presence')
      .on('presence', { event: 'sync' }, () => {
        const presenceState = presenceChannel.presenceState();
        const connectedIds = new Set(
          Object.values(presenceState)
            .flat()
            .map((p: any) => p.team_id)
            .filter(Boolean)
        );
        
        console.log(`📊 Screen: ${connectedIds.size} équipes connectées`, Array.from(connectedIds));
        setConnectedTeamsCount(connectedIds.size);
        setConnectedTeamIds(connectedIds);
        
        // Recharger les équipes depuis la DB pour avoir les nouvelles équipes
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
      .channel('screen-buzzers-realtime-v3')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'buzzer_attempts' 
      }, async (payload: any) => {
        console.log('🔔🔔🔔 Screen: BUZZER REÇU EN TEMPS REEL!', payload);
        console.log('🔔 Payload new:', payload.new);
        
        const newBuzzer = payload.new;
        
        // Vérifier si c'est le premier buzzer
        if (newBuzzer && newBuzzer.is_first === true) {
          console.log('⚡⚡⚡ Screen: C\'EST LE PREMIER BUZZER!');
          console.log('⚡ Team ID:', newBuzzer.team_id);
          
          // Charger l'équipe
          const { data: teamData, error } = await supabase
            .from('teams')
            .select('*')
            .eq('id', newBuzzer.team_id)
            .single();
          
          console.log('👥 Team data:', teamData, 'Error:', error);
          
          if (teamData) {
            console.log('✅ Screen: Équipe trouvée:', teamData.name, 'Color:', teamData.color);
            
            // Définir les données du buzzer en une seule fois
            const notif = { show: true, team: teamData };
            console.log('🎬 Screen: Setting buzzerNotification:', notif);
            setBuzzerNotification(notif);
            playSound('buzz');
            
            // Cacher après 5 secondes
            setTimeout(() => {
              console.log('⏰ Screen: Fin animation buzzer');
              setBuzzerNotification(null);
            }, 5000);
          } else {
            console.error('❌ Screen: Équipe non trouvée!');
          }
        } else {
          console.log('ℹ️ Screen: Pas le premier buzzer (is_first:', newBuzzer?.is_first, ')');
        }
        
        // Recharger tous les buzzers pour la liste
        loadBuzzers();
      })
      .subscribe((status) => {
        console.log('📡 Screen: Buzzer channel status:', status);
      });

    const answersChannel = supabase
      .channel('screen-qcm-answers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_answers' }, () => {
        console.log('🔄 Screen: Answer received');
        loadQcmAnswers();
        loadTextAnswers();
      })
      .subscribe();

    // Plus besoin de l'événement REVEAL_ANSWER pour afficher une notification
    // Le reveal se fait maintenant via show_answer dans la question

    return () => {
      console.log('🧹 Screen: Nettoyage des canaux realtime');
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(gameStateChannel);
      supabase.removeChannel(buzzersChannel);
      supabase.removeChannel(answersChannel);
    };
  }, []); // IMPORTANT: Pas de dépendances pour éviter les reconnexions

  useEffect(() => {
    console.log('📌 Question or session changed, loading buzzers');
    loadBuzzers();
    loadQcmAnswers();
    loadTextAnswers();
  }, [currentQuestion?.id, gameState?.game_session_id]);

  // Pas de polling - uniquement real-time

  // Timer synchronisé en temps réel basé sur timestamp
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    console.log('⏱️ Screen: Timer state changed', { 
      timer_active: gameState?.timer_active, 
      timer_started_at: gameState?.timer_started_at,
      timer_duration: gameState?.timer_duration
    });
    
    if (gameState?.timer_active && gameState?.timer_started_at && gameState?.timer_duration) {
      // Calculer le temps restant en fonction du timestamp de départ
      const calculateRemainingTime = () => {
        const startTime = new Date(gameState.timer_started_at).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const remaining = Math.max(0, gameState.timer_duration - elapsed);
        return remaining;
      };

      // Initialiser avec le temps restant calculé
      const initialRemaining = calculateRemainingTime();
      console.log('⏱️ Screen: Timer calculé:', initialRemaining, 'secondes restantes');
      setTimer(initialRemaining);
      
      // Mettre à jour toutes les secondes
      interval = setInterval(() => {
        const remaining = calculateRemainingTime();
        console.log('⏱️ Screen: Timer tick', remaining);
        setTimer(remaining);
        
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 1000);
    } else {
      // Arrêter et cacher le timer IMMÉDIATEMENT quand timer_active est false
      console.log('⏱️ Screen: Timer stopped');
      setTimer(null);
    }
    
    return () => {
      if (interval) {
        console.log('⏱️ Screen: Clearing timer interval');
        clearInterval(interval);
      }
    };
  }, [gameState?.timer_active, gameState?.timer_started_at, gameState?.timer_duration]);

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
      supabase.from('game_state').select('*, questions(*), game_sessions(*), current_round_id:rounds!current_round_id(*)').maybeSingle()
    ]);

    if (teamsRes.data) {
      setTeams(teamsRes.data);
      // Le compteur de connectés sera mis à jour par le canal de présence
    }
    
    if (gameStateRes.data) {
      setGameState(gameStateRes.data);
      
      // Récupérer la durée du timer depuis le round
      if (gameStateRes.data.current_round_id?.timer_duration) {
        setTimerDuration(gameStateRes.data.current_round_id.timer_duration);
      }
      
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
    const qId = currentQuestion?.id;
    const sId = gameState?.game_session_id;
    
    console.log('🔍 Screen: loadBuzzers appelé', { qId, sId });
    
    if (!qId || !sId) {
      console.log('⚠️ Screen: Pas de question ou session');
      setBuzzers([]);
      // NE PAS réinitialiser buzzerNotification ici car ça écrase l'animation!
      return;
    }
    
    const { data, error } = await supabase
      .from('buzzer_attempts')
      .select('*, teams(*)')
      .eq('question_id', qId)
      .eq('game_session_id', sId)
      .order('buzzed_at', { ascending: true });
    
    if (error) {
      console.error('❌ Screen: Erreur chargement buzzers', error);
      return;
    }
    
    console.log('📥 Screen: Buzzers chargés', data?.length || 0, data);
    
    if (data && data.length > 0) {
      setBuzzers(data);
    } else {
      setBuzzers([]);
    }
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
      {/* Écran d'accueil */}
      {gameState?.show_welcome_screen && (
        <WelcomeScreen />
      )}

      {/* Écran de connexion des équipes */}
      {gameState?.show_team_connection_screen && (
        <TeamConnectionScreen
          connectedTeams={teams
            .filter(t => connectedTeamIds.has(t.id))
            .map(t => ({ id: t.id, name: t.name, color: t.color }))
          }
        />
      )}

      {/* Écran d'attente */}
      {gameState?.show_waiting_screen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <div className="text-center space-y-6 animate-fade-in px-4">
            <div className="text-6xl md:text-8xl animate-pulse">⏸️</div>
            <h2 className="text-3xl md:text-5xl font-bold bg-gradient-arena bg-clip-text text-transparent animate-pulse-glow">
              En attente de la prochaine question
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground">
              Préparez-vous...
            </p>
          </div>
        </div>
      )}

      {/* Animation de révélation bonne/mauvaise réponse */}
      {showRevealAnimation && revealResult && (
        <JingleReveal
          result={revealResult}
          duration={12000}
          onComplete={() => {
            setShowRevealAnimation(false);
            setBuzzerNotification(null); // Cacher la notification APRÈS l'animation
          }}
        />
      )}

      {/* Enhanced Background effects with premium animations */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated gradient waves */}
        <motion.div 
          className="absolute inset-0"
          animate={{
            background: [
              'radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.15) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 70%, hsl(var(--secondary) / 0.15) 0%, transparent 50%)',
              'radial-gradient(circle at 50% 50%, hsl(var(--accent) / 0.15) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.15) 0%, transparent 50%)',
            ]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Multiple floating orbs with different sizes and speeds */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`orb-${i}`}
            className="absolute rounded-full blur-3xl"
            style={{
              width: 150 + Math.random() * 250,
              height: 150 + Math.random() * 250,
              background: i % 3 === 0 
                ? 'hsl(var(--primary) / 0.12)'
                : i % 3 === 1 
                ? 'hsl(var(--secondary) / 0.12)'
                : 'hsl(var(--accent) / 0.12)',
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -80, 0],
              x: [0, 40, 0],
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 10 + i * 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.8,
            }}
          />
        ))}

        {/* Rotating light rays */}
        {[...Array(16)].map((_, i) => (
          <motion.div
            key={`ray-${i}`}
            className="absolute top-1/2 left-1/2 w-0.5 origin-left"
            style={{
              height: '150vh',
              background: `linear-gradient(to bottom, transparent, hsl(var(--primary) / 0.08), transparent)`,
              transform: `rotate(${i * 22.5}deg)`,
            }}
            animate={{ 
              opacity: [0.1, 0.3, 0.1],
              scaleY: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}

        {/* Animated particles floating around */}
        {[...Array(40)].map((_, i) => {
          const size = Math.random() * 5 + 2;
          const duration = Math.random() * 10 + 10;
          
          return (
            <motion.div
              key={`particle-${i}`}
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                background: i % 3 === 0 
                  ? 'hsl(var(--primary) / 0.5)' 
                  : i % 3 === 1 
                  ? 'hsl(var(--secondary) / 0.5)'
                  : 'hsl(var(--accent) / 0.5)',
                boxShadow: `0 0 ${size * 3}px currentColor`,
                left: `${Math.random() * 100}%`,
              }}
              initial={{ 
                y: -20,
                opacity: 0,
              }}
              animate={{
                y: window.innerHeight + 50,
                opacity: [0, 0.8, 0.8, 0],
                x: [0, Math.sin(i) * 80, 0],
              }}
              transition={{
                duration: duration,
                repeat: Infinity,
                ease: "linear",
                delay: Math.random() * 5,
              }}
            />
          );
        })}

        {/* Pulsing circles in corners */}
        {[
          { top: '10%', left: '10%', delay: 0 },
          { top: '10%', right: '10%', delay: 1 },
          { bottom: '10%', left: '10%', delay: 2 },
          { bottom: '10%', right: '10%', delay: 3 },
        ].map((pos, i) => (
          <motion.div
            key={`corner-${i}`}
            className="absolute w-32 h-32 rounded-full border-2 border-primary/20"
            style={pos}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.6, 0.3],
              borderColor: [
                'hsl(var(--primary) / 0.2)',
                'hsl(var(--secondary) / 0.3)',
                'hsl(var(--primary) / 0.2)',
              ],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: pos.delay,
            }}
          />
        ))}

        {/* Expanding ripples from center */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`ripple-${i}`}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10"
            initial={{
              width: 0,
              height: 0,
              opacity: 0.5,
            }}
            animate={{
              width: [0, 800, 1200],
              height: [0, 800, 1200],
              opacity: [0.5, 0.2, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              delay: i * 2,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-8">
        {/* Logo et titre avec effets premium */}
        <header className="text-center py-6 animate-slide-in relative">
          {/* Glow effect behind title */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-48 blur-3xl opacity-30"
            style={{
              background: 'radial-gradient(ellipse, hsl(var(--primary)), transparent)',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          <motion.h1 
            className="relative text-8xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--accent)))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 20px hsl(var(--primary) / 0.4))',
            }}
            animate={{
              filter: [
                'drop-shadow(0 0 20px hsl(var(--primary) / 0.4))',
                'drop-shadow(0 0 35px hsl(var(--primary) / 0.6))',
                'drop-shadow(0 0 20px hsl(var(--primary) / 0.4))',
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {currentSession?.name || 'ARENA'}
          </motion.h1>
          
          {connectedTeamsCount > 0 && (
            <motion.p 
              className="text-accent text-2xl mt-4 font-bold"
              animate={{
                opacity: [0.7, 1, 0.7],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {connectedTeamsCount} équipe{connectedTeamsCount > 1 ? 's' : ''} connectée{connectedTeamsCount > 1 ? 's' : ''}
            </motion.p>
          )}

          {/* Decorative animated line */}
          <motion.div
            className="mx-auto mt-6 h-1 rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--accent)), transparent)',
              width: '400px',
            }}
            animate={{
              opacity: [0.3, 0.8, 0.3],
              scaleX: [0.8, 1, 0.8],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </header>

        {/* Intro de manche avec composant TV pro */}
        {gameState?.show_round_intro && currentRound && (
          <JingleRoundIntro
            roundTitle={currentRound.title}
            roundNumber={currentSession?.current_round_index ? currentSession.current_round_index + 1 : undefined}
            sessionName={currentSession?.name?.toUpperCase()}
            jingleUrl={currentRound.jingle_url}
            duration={6000}
            onComplete={() => {
              // L'intro se désactive automatiquement après 6s via Regie
              console.log('🎬 Intro terminée');
            }}
          />
        )}

        {/* Question actuelle - Design Premium */}
        {currentQuestion && !gameState?.show_leaderboard && !gameState?.show_round_intro && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-6xl mx-auto mb-8"
          >
            {/* Carte principale avec glow effect */}
            <div className="relative">
              {/* Animated glow background */}
              <motion.div
                className="absolute inset-0 rounded-3xl blur-2xl opacity-30"
                style={{
                  background: 'radial-gradient(ellipse at center, hsl(var(--primary)), hsl(var(--secondary)), transparent)',
                }}
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />

              <div className="relative bg-card/95 backdrop-blur-2xl rounded-3xl p-10 border-2 shadow-2xl"
                   style={{
                     borderColor: 'hsl(var(--primary) / 0.5)',
                     boxShadow: '0 0 60px hsl(var(--primary) / 0.3), inset 0 0 60px hsl(var(--primary) / 0.05)',
                   }}>
                
                {/* Header avec badges premium */}
                <div className="flex items-center justify-between mb-8">
                  {/* Left side: Type et points */}
                  <div className="flex items-center gap-4">
                    <motion.div 
                      className="px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-wider relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
                        boxShadow: '0 4px 20px hsl(var(--primary) / 0.4)',
                      }}
                      animate={{
                        boxShadow: [
                          '0 4px 20px hsl(var(--primary) / 0.4)',
                          '0 6px 30px hsl(var(--primary) / 0.6)',
                          '0 4px 20px hsl(var(--primary) / 0.4)',
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {/* Shine effect */}
                      <motion.div
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                        }}
                        animate={{
                          x: ['-100%', '200%'],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          repeatDelay: 1,
                        }}
                      />
                      <span className="relative text-primary-foreground">
                        {currentQuestion.question_type === 'qcm' ? 'QCM' : 
                         currentQuestion.question_type === 'free_text' ? 'TEXTE LIBRE' : 'BLIND TEST'}
                      </span>
                    </motion.div>

                    <div className="flex items-center gap-3">
                      <motion.div 
                        className="px-5 py-2 rounded-xl font-bold text-lg flex items-center gap-2"
                        style={{
                          background: 'linear-gradient(135deg, hsl(var(--green-500) / 0.2), hsl(var(--green-600) / 0.3))',
                          border: '2px solid hsl(var(--green-500) / 0.5)',
                          boxShadow: '0 0 20px hsl(var(--green-500) / 0.3)',
                        }}
                        animate={{
                          boxShadow: [
                            '0 0 20px hsl(var(--green-500) / 0.3)',
                            '0 0 30px hsl(var(--green-500) / 0.5)',
                            '0 0 20px hsl(var(--green-500) / 0.3)',
                          ]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <span className="text-green-400">+{currentQuestion.points}</span>
                      </motion.div>
                      
                      {currentQuestion.penalty_points > 0 && (
                        <motion.div 
                          className="px-5 py-2 rounded-xl font-bold text-lg flex items-center gap-2"
                          style={{
                            background: 'linear-gradient(135deg, hsl(var(--red-500) / 0.2), hsl(var(--red-600) / 0.3))',
                            border: '2px solid hsl(var(--red-500) / 0.5)',
                            boxShadow: '0 0 20px hsl(var(--red-500) / 0.3)',
                          }}
                        >
                          <span className="text-red-400">-{currentQuestion.penalty_points}</span>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Right side: Compteur de réponses en temps réel */}
                  <motion.div
                    className="px-6 py-3 rounded-2xl font-black text-xl relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--accent) / 0.3), hsl(var(--secondary) / 0.3))',
                      border: '2px solid hsl(var(--accent) / 0.6)',
                      boxShadow: '0 0 25px hsl(var(--accent) / 0.4)',
                    }}
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <div className="relative flex items-center gap-3">
                      <motion.div
                        animate={{
                          rotate: [0, 360],
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Users className="w-6 h-6 text-accent" />
                      </motion.div>
                      <span className="text-accent">
                        {currentQuestion.question_type === 'qcm' 
                          ? qcmAnswers.length 
                          : currentQuestion.question_type === 'free_text'
                          ? textAnswers.length
                          : buzzers.length}
                        <span className="text-muted-foreground mx-1">/</span>
                        {teams.length}
                      </span>
                      <span className="text-sm text-muted-foreground uppercase tracking-wide">réponses</span>
                    </div>

                    {/* Progress bar */}
                    <motion.div 
                      className="absolute bottom-0 left-0 h-1 bg-accent rounded-full"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${((currentQuestion.question_type === 'qcm' 
                          ? qcmAnswers.length 
                          : currentQuestion.question_type === 'free_text'
                          ? textAnswers.length
                          : buzzers.length) / Math.max(teams.length, 1)) * 100}%` 
                      }}
                      transition={{ duration: 0.5 }}
                    />
                  </motion.div>
                </div>

                {/* Question text avec effet premium */}
                <div className="text-center mb-8 relative">
                  <motion.div
                    className="absolute inset-0 blur-xl opacity-20"
                    style={{
                      background: 'radial-gradient(ellipse at center, hsl(var(--primary)), transparent)',
                    }}
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.15, 0.25, 0.15],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <h2 className="relative text-6xl font-black leading-tight"
                      style={{
                        textShadow: '0 2px 20px hsl(var(--primary) / 0.3)',
                      }}>
                    {currentQuestion.question_text}
                  </h2>
                </div>
                
                {/* QCM Options avec design premium */}
                {currentQuestion.options && (() => {
                  try {
                    const options = typeof currentQuestion.options === 'string' 
                      ? JSON.parse(currentQuestion.options as string) 
                      : currentQuestion.options;
                    const correctAnswer = currentQuestion.correct_answer;
                    const showReveal = gameState?.show_answer === true;
                    
                    return (
                      <div className="grid grid-cols-2 gap-6 mt-8">
                        {Object.entries(options || {}).map(([key, value], index) => {
                          const isCorrect = showReveal && value === correctAnswer;
                          return (
                            <motion.div
                              key={key}
                              initial={{ opacity: 0, scale: 0.9, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ delay: index * 0.1, duration: 0.4 }}
                              className="relative"
                            >
                              {/* Glow for correct answer */}
                              {isCorrect && (
                                <motion.div
                                  className="absolute inset-0 rounded-2xl blur-xl"
                                  style={{
                                    background: 'hsl(var(--green-500) / 0.5)',
                                  }}
                                  animate={{
                                    scale: [1, 1.1, 1],
                                    opacity: [0.5, 0.8, 0.5],
                                  }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                />
                              )}

                              <div
                                className={`
                                  relative rounded-2xl p-6 border-2 transition-all duration-500
                                  ${isCorrect 
                                    ? 'bg-green-500/20 border-green-400' 
                                    : 'bg-card/60 border-primary/30 hover:border-primary/60 hover:bg-card/80'
                                  }
                                `}
                                style={{
                                  boxShadow: isCorrect 
                                    ? '0 0 30px hsl(var(--green-500) / 0.4), inset 0 0 30px hsl(var(--green-500) / 0.1)'
                                    : '0 4px 20px rgba(0,0,0,0.2), inset 0 0 20px hsl(var(--primary) / 0.05)',
                                }}
                              >
                                <div className="flex items-center gap-4">
                                  {/* Letter badge */}
                                  <div 
                                    className={`
                                      w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black flex-shrink-0
                                      ${isCorrect ? 'bg-green-500 text-white' : 'bg-primary/20 text-primary'}
                                    `}
                                    style={{
                                      boxShadow: isCorrect ? '0 0 20px hsl(var(--green-500))' : undefined,
                                    }}
                                  >
                                    {isCorrect ? <Check className="w-8 h-8" /> : key}
                                  </div>
                                  
                                  {/* Answer text */}
                                  <span className={`text-2xl font-semibold flex-1 ${isCorrect ? 'text-green-300' : ''}`}>
                                    {value as string}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    );
                  } catch (e) {
                    return null;
                  }
                })()}

                {/* Réponse pour free_text - révélée quand show_answer = true */}
                {currentQuestion.question_type === 'free_text' && gameState?.show_answer && currentQuestion.correct_answer && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="mt-8 relative"
                  >
                    <motion.div
                      className="absolute inset-0 rounded-2xl blur-2xl"
                      style={{
                        background: 'hsl(var(--green-500) / 0.5)',
                      }}
                      animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.4, 0.7, 0.4],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <div className="relative p-8 rounded-2xl bg-green-500/20 border-2 border-green-400"
                         style={{
                           boxShadow: '0 0 40px hsl(var(--green-500) / 0.5), inset 0 0 40px hsl(var(--green-500) / 0.1)',
                         }}>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-3 mb-4">
                          <motion.div
                            animate={{
                              scale: [1, 1.2, 1],
                              rotate: [0, 5, -5, 0],
                            }}
                            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                          >
                            <Check className="w-12 h-12 text-green-400" />
                          </motion.div>
                          <span className="text-3xl font-black text-green-400 uppercase tracking-wide">Réponse</span>
                        </div>
                        <p className="text-5xl font-black text-green-300"
                           style={{
                             textShadow: '0 0 30px hsl(var(--green-500) / 0.8)',
                           }}>
                          {currentQuestion.correct_answer}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Réponse pour blind_test - révélée quand show_answer = true */}
                {currentQuestion.question_type === 'blind_test' && gameState?.show_answer && currentQuestion.correct_answer && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="mt-8 relative"
                  >
                    <motion.div
                      className="absolute inset-0 rounded-2xl blur-2xl"
                      style={{
                        background: 'hsl(var(--green-500) / 0.5)',
                      }}
                      animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.4, 0.7, 0.4],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <div className="relative p-8 rounded-2xl bg-green-500/20 border-2 border-green-400"
                         style={{
                           boxShadow: '0 0 40px hsl(var(--green-500) / 0.5), inset 0 0 40px hsl(var(--green-500) / 0.1)',
                         }}>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-3 mb-4">
                          <motion.div
                            animate={{
                              scale: [1, 1.2, 1],
                              rotate: [0, 5, -5, 0],
                            }}
                            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                          >
                            <Check className="w-12 h-12 text-green-400" />
                          </motion.div>
                          <span className="text-3xl font-black text-green-400 uppercase tracking-wide">Réponse</span>
                        </div>
                        <p className="text-5xl font-black text-green-300"
                           style={{
                             textShadow: '0 0 30px hsl(var(--green-500) / 0.8)',
                           }}>
                          {currentQuestion.correct_answer}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Barre de timer - Uniquement si timer actif ET question en cours */}
        {gameState?.timer_active && timer !== null && timer > 0 && currentQuestion && !gameState?.show_leaderboard && !gameState?.show_round_intro && (
          <div className="max-w-5xl mx-auto mb-6 animate-slide-in">
            <TimerBar 
              timerRemaining={timer}
              timerDuration={timerDuration}
              timerActive={gameState?.timer_active || false}
              questionType={currentQuestion.question_type}
            />
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

        {/* PREMIÈRE ÉQUIPE QUI BUZZE - ANIMATION SPECTACULAIRE */}
        {(() => {
          console.log('🎨 Screen render check:', {
            buzzerNotification,
            show: buzzerNotification?.show,
            team: buzzerNotification?.team,
            showLeaderboard: gameState?.show_leaderboard,
            shouldShow: buzzerNotification?.show && buzzerNotification.team && !gameState?.show_leaderboard
          });
          return buzzerNotification?.show && buzzerNotification.team && !gameState?.show_leaderboard;
        })() && (
          <>
            {/* Flash d'arrière-plan */}
            <div className="fixed inset-0 z-30 pointer-events-none">
              <div 
                className="absolute inset-0 animate-pulse"
                style={{ 
                  backgroundColor: buzzerNotification.team.color,
                  opacity: 0.15,
                  animation: 'pulse 0.5s ease-in-out 3'
                }}
              />
            </div>

            {/* Animation centrale spectaculaire */}
            <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
              <div className="relative animate-scale-in">
                {/* Cercles concentriques animés */}
                <div className="absolute inset-0 -m-20">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="absolute inset-0 rounded-full border-4 opacity-50"
                      style={{
                        borderColor: buzzerNotification.team.color,
                        animation: `ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite`,
                        animationDelay: `${i * 0.3}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Carte principale */}
                <div 
                  className="relative bg-card/98 backdrop-blur-xl rounded-3xl p-12 border-8 shadow-2xl animate-bounce"
                  style={{ 
                    borderColor: buzzerNotification.team.color,
                    boxShadow: `0 0 80px ${buzzerNotification.team.color}80, 0 0 120px ${buzzerNotification.team.color}40`,
                    animation: 'bounce 0.6s ease-in-out 2'
                  }}
                >
                  {/* Éclairs animés dans les coins */}
                  <div className="absolute -top-6 -left-6">
                    <Zap className="w-16 h-16 text-accent animate-pulse" style={{ filter: 'drop-shadow(0 0 20px currentColor)' }} />
                  </div>
                  <div className="absolute -top-6 -right-6">
                    <Zap className="w-16 h-16 text-accent animate-pulse" style={{ animationDelay: '0.3s', filter: 'drop-shadow(0 0 20px currentColor)' }} />
                  </div>
                  <div className="absolute -bottom-6 -left-6">
                    <Zap className="w-16 h-16 text-accent animate-pulse" style={{ animationDelay: '0.6s', filter: 'drop-shadow(0 0 20px currentColor)' }} />
                  </div>
                  <div className="absolute -bottom-6 -right-6">
                    <Zap className="w-16 h-16 text-accent animate-pulse" style={{ animationDelay: '0.9s', filter: 'drop-shadow(0 0 20px currentColor)' }} />
                  </div>

                  <div className="text-center relative z-10">
                    {/* Badge BUZZER géant */}
                    <div className="mb-6">
                      <div className="inline-block bg-gradient-to-r from-accent via-primary to-accent bg-clip-text text-transparent animate-pulse">
                        <h2 className="text-7xl font-black tracking-wider">⚡ BUZZER ⚡</h2>
                      </div>
                    </div>

                    {/* Avatar géant de l'équipe */}
                    <div className="relative inline-block mb-6">
                      <div
                        className="w-40 h-40 rounded-full mx-auto animate-pulse shadow-2xl"
                        style={{ 
                          backgroundColor: buzzerNotification.team.color,
                          boxShadow: `0 0 60px ${buzzerNotification.team.color}, inset 0 0 30px rgba(255,255,255,0.3)`
                        }}
                      />
                      {/* Particules autour */}
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-4 h-4 rounded-full"
                          style={{
                            backgroundColor: buzzerNotification.team.color,
                            top: '50%',
                            left: '50%',
                            animation: `ping 1s ease-out infinite`,
                            animationDelay: `${i * 0.15}s`,
                            transform: `rotate(${i * 45}deg) translateY(-100px)`,
                          }}
                        />
                      ))}
                    </div>

                    {/* Nom de l'équipe géant */}
                    <h3 
                      className="text-6xl font-black mb-4 animate-pulse"
                      style={{ 
                        color: buzzerNotification.team.color,
                        textShadow: `0 0 30px ${buzzerNotification.team.color}, 0 0 60px ${buzzerNotification.team.color}`
                      }}
                    >
                      {buzzerNotification.team.name}
                    </h3>

                    {/* Badge "PREMIER!" */}
                    <div className="inline-block">
                      <div 
                        className="px-8 py-4 rounded-full font-black text-3xl text-white animate-pulse"
                        style={{ 
                          backgroundColor: buzzerNotification.team.color,
                          boxShadow: `0 0 40px ${buzzerNotification.team.color}`
                        }}
                      >
                        🏆 PREMIER ! 🏆
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Notification supprimée - Le reveal se fait en dessous de la question */}

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

        {/* Classement paginé pour 30+ équipes */}
        {gameState?.show_leaderboard && (
          <LeaderboardPaginated
            teams={teams.map(t => ({
              id: t.id,
              name: t.name,
              score: t.score,
              color: t.color,
            }))}
            itemsPerPage={15}
            rotationInterval={6000}
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

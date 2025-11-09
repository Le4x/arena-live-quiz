import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Zap, Check, X, Send, HelpCircle, Medal, Crown, Award, Key, LogOut, Wifi } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { playSound } from "@/lib/sounds";
import { triggerHaptic } from "@/lib/haptics";
import { getGameEvents, type BuzzerResetEvent, type StartQuestionEvent } from "@/lib/runtime/GameEvents";
import { TimerBar } from "@/components/TimerBar";
import { JokerPanel } from "@/components/client/JokerPanel";
import { PublicVotePanel } from "@/components/client/PublicVotePanel";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { SoundControl } from "@/components/SoundControl";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtimeReconnect } from "@/hooks/useRealtimeReconnect";
import { useWakeLock } from "@/hooks/use-wake-lock";
import debounce from "lodash/debounce";
import Confetti from "react-confetti";

const Client = () => {
  const { teamId } = useParams();
  const { toast } = useToast();
  const [team, setTeam] = useState<any>(null);
  const [teamName, setTeamName] = useState("");
  const [teamColor, setTeamColor] = useState("#D4AF37");
  const [pin, setPin] = useState("");
  const [gameState, setGameState] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [answer, setAnswer] = useState("");
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState<'correct' | 'incorrect' | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [deviceBlocked, setDeviceBlocked] = useState(false);
  const [isBlockedForQuestion, setIsBlockedForQuestion] = useState(false);
  const [currentQuestionInstanceId, setCurrentQuestionInstanceId] = useState<string | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(30);
  const [timerDuration, setTimerDuration] = useState(30);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [teamRank, setTeamRank] = useState<number>(0);
  const [isRequestingHelp, setIsRequestingHelp] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const buzzerButtonRef = useRef<HTMLButtonElement>(null);
  const gameEvents = getGameEvents();
  const revealTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownTimeoutToast = useRef<boolean>(false);
  const [final, setFinal] = useState<any>(null);
  const [isFinalist, setIsFinalist] = useState(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const previousQuestionIdRef = useRef<string | null>(null);
  const [firstBuzzerTeam, setFirstBuzzerTeam] = useState<any>(null);
  const [isTeamBlocked, setIsTeamBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuzzing, setIsBuzzing] = useState(false);

  // Générer ou récupérer l'ID unique de l'appareil
  const getDeviceId = () => {
    let deviceId = localStorage.getItem('arena_device_id');
    if (!deviceId) {
      try {
        // Essayer crypto.randomUUID() (moderne)
        deviceId = crypto.randomUUID();
      } catch (e) {
        // Fallback pour navigateurs plus anciens
        console.warn('⚠️ crypto.randomUUID() not available, using fallback');
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      }
      localStorage.setItem('arena_device_id', deviceId);
      console.log('🆕 New device_id generated:', deviceId);
    } else {
      console.log('♻️ Existing device_id:', deviceId);
    }
    return deviceId;
  };

  // Hook de reconnexion automatique avec debounce et chargement progressif
  const reconnectCountRef = useRef(0);

  // ⚡ OPTIMISATION: Debounce pour éviter les reconnexions multiples
  // Si 60 clients se reconnectent en même temps → étalé sur ~3 secondes
  const handleReconnect = useMemo(
    () => debounce(() => {
      reconnectCountRef.current++;
      console.log('🔄 Reconnexion #' + reconnectCountRef.current);

      if (!teamId) return;

      // Charger données critiques immédiatement
      Promise.all([
        loadTeam(),
        loadGameState(),
        loadActiveSession()
      ]).then(() => {
        console.log('✅ Données critiques rechargées');
      });

      // Charger données secondaires avec délai progressif basé sur teamId
      // Cela étale la charge sur plusieurs secondes pour 60 équipes
      const clientDelay = teamId ? (parseInt(teamId.slice(-2), 16) % 60) * 50 : 0;

      setTimeout(() => {
        loadAllTeams();
        loadFinal();
        loadFirstBuzzer();
        checkAnswerResult();
      }, clientDelay);

      toast({
        title: "🔄 Reconnecté",
        description: "Connexion rétablie"
      });
    }, 1000), // Attendre 1s avant de déclencher la reconnexion
    [teamId]
  );

  useRealtimeReconnect({
    onReconnect: handleReconnect
  });

  // Empêcher la mise en veille de l'écran
  useWakeLock();

  useEffect(() => {
    if (teamId) {
      loadTeam();
    }
    // Ne charger le game state que si on a un teamId
    if (teamId) {
      loadGameState();
      loadAllTeams();
      loadActiveSession();
      loadFinal();
      checkIfTeamBuzzed(); // Vérifier dès le chargement
    }

    const gameStateChannel = supabase
      .channel('client-game-state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, () => {
        loadGameState();
      })
      .subscribe();

    const teamsChannel = supabase
      .channel('client-teams-realtime')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'teams',
        filter: teamId ? `id=eq.${teamId}` : undefined
      }, (payload) => {
        console.log('🔄 Client: Team updated realtime', payload);
        // Mise à jour IMMEDIATE du state local
        if (payload.new) {
          setTeam(payload.new);
        }
        reloadTeamData();
        loadAllTeams();
      })
      .subscribe();

    const answersChannel = supabase
      .channel('client-answers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_answers' }, () => {
        checkAnswerResult();
      })
      .subscribe();

    const finalsChannel = supabase
      .channel('client-finals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finals' }, () => {
        loadFinal();
      })
      .subscribe();

    // Écouter les buzzers pour savoir qui a buzzé ET synchroniser hasBuzzed
    const buzzersChannel = supabase
      .channel('client-buzzers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buzzer_attempts' }, (payload) => {
        console.log('🔔 Buzzer realtime update:', payload);
        loadFirstBuzzer();
        checkIfTeamBuzzed(); // Vérifier si notre équipe a buzzé
      })
      .subscribe();

    // Écouter les événements de jokers via GameEvents
    const unsubJoker = gameEvents.on('JOKER_ACTIVATED', (event: any) => {
      console.log('🎯 [Client] JOKER_ACTIVATED reçu:', event);
      console.log('🎯 [Client] event.data:', event.data);
      console.log('🎯 [Client] event.data.jokerType:', event.data?.jokerType);
      console.log('🎯 [Client] event.data.questionOptions:', event.data?.questionOptions);
      console.log('🎯 [Client] event.data.correctAnswer:', event.data?.correctAnswer);
      console.log('🎯 [Client] event.timestamp:', event.timestamp);
      
      if (event.data?.jokerType === 'fifty_fifty') {
        console.log('🎯 [Client] Activation fifty_fifty avec données:', {
          questionOptions: event.data.questionOptions,
          correctAnswer: event.data.correctAnswer
        });
        eliminateTwoWrongAnswers(event.timestamp, event.data.questionOptions, event.data.correctAnswer);
      }
    });

    // Canal de présence GLOBAL partagé par toutes les équipes
    const presenceChannel = supabase.channel('team_presence', {
      config: {
        presence: {
          key: teamId || '',
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        console.log('✅ Client: Présence synchronisée sur canal global');
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && teamId) {
          console.log('💓 Client: Track présence pour équipe', teamId);
          // Track presence avec team_id
          await presenceChannel.track({
            team_id: teamId,
            team_name: team?.name || 'Unknown',
            online_at: new Date().toISOString(),
          });
          // Mettre à jour last_seen_at une fois
          await supabase.from('teams').update({ 
            last_seen_at: new Date().toISOString(),
            is_active: true 
          }).eq('id', teamId);
        }
      });

    // ⚡ OPTIMISATION: Heartbeat DB désactivé - Le système Presence suffit
    // Le canal Presence gère automatiquement les heartbeats via WebSocket
    // Gain: 0 write DB constant vs 2 writes/s pour 60 équipes
    // Note: last_seen_at mis à jour uniquement à la connexion initiale (ligne 218-221)

    // Cleanup quand la page se ferme
    const handleBeforeUnload = async () => {
      if (teamId) {
        await presenceChannel.untrack();
        await supabase.from('teams').update({ 
          is_active: false,
          connected_device_id: null 
        }).eq('id', teamId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // S'abonner aux événements de jeu
    const unsubBuzzerReset = gameEvents.on<BuzzerResetEvent>('BUZZER_RESET', (event) => {
      console.log('🔔 Événement BUZZER_RESET reçu', event);
      console.log('Current instance:', currentQuestionInstanceId, 'Event instance:', event.data.questionInstanceId);
      
      if (event.data.questionInstanceId === currentQuestionInstanceId) {
        console.log('✅ Reset accepté - réinitialisation buzzer');
        setHasBuzzed(false);
        setTimeout(() => {
          buzzerButtonRef.current?.focus();
        }, 100);
        toast({
          title: "🔔 Buzzer réactivé !",
          description: "Vous pouvez buzzer à nouveau",
        });
      } else {
        console.log('⚠️ Reset ignoré - instance différente');
      }
    });

    const unsubKick = gameEvents.on('KICK_ALL', () => {
      toast({ title: "👋 Déconnecté par la régie" });
      window.location.href = '/client';
    });

    const unsubKickTeam = gameEvents.on('KICK_TEAM', (event: any) => {
      if (event.data?.teamId === teamId) {
        toast({ title: "👋 Déconnecté par la régie" });
        window.location.href = '/client';
      }
    });

    const unsubStartQuestion = gameEvents.on<StartQuestionEvent>('START_QUESTION', (event) => {
      console.log('🎯 Nouvelle question', event);
      setCurrentQuestionInstanceId(event.data.questionInstanceId);
      
      // Charger immédiatement la nouvelle question
      loadGameState();
      
      // Réinitialiser tous les états pour la nouvelle question
      setHasBuzzed(false);
      setAnswer("");
      setHasAnswered(false);
      setAnswerResult(null);
      setShowReveal(false);
      setIsBlockedForQuestion(false);
      setEliminatedOptions([]);
      setFirstBuzzerTeam(null); // Réinitialiser le premier buzzer
      hasShownTimeoutToast.current = false;
      
      // Vérifier immédiatement après 100ms si l'équipe a déjà buzzé (au cas où)
      setTimeout(() => checkIfTeamBuzzed(), 100);
    });

    const unsubReveal = gameEvents.on('REVEAL_ANSWER', (event: any) => {
      console.log('🎭 Client: Reveal reçu', event);
      
      // Vérifier si ce reveal est pour cette équipe
      if (event.data?.teamId === teamId) {
        // Annuler tout timeout précédent
        if (revealTimeoutRef.current) {
          clearTimeout(revealTimeoutRef.current);
        }
        
        setShowReveal(true);
        const isCorrect = event.data?.isCorrect;
        setAnswerResult(isCorrect ? 'correct' : 'incorrect');
        playSound(isCorrect ? 'correct' : 'incorrect');
        
        // Durée plus longue pour les bonnes réponses
        const revealDuration = isCorrect ? 8000 : 5000;
        console.log(`🎭 Client: Animation reveal démarrée, durée ${revealDuration}ms`);
        
        // Cacher le reveal après la durée appropriée
        revealTimeoutRef.current = setTimeout(() => {
          console.log('🎭 Client: Animation reveal terminée');
          setShowReveal(false);
          revealTimeoutRef.current = null;
        }, revealDuration);
      }
    });

    const unsubBlocked = gameEvents.on('TEAM_BLOCKED', (event: any) => {
      console.log('🚫 Équipe bloquée', event);
      
      // Vérifier si c'est cette équipe qui est bloquée
      if (event.data?.teamId === teamId) {
        toast({
          title: "❌ Mauvaise réponse",
          description: "Vous êtes maintenant bloqué pour cette question",
          variant: "destructive",
        });
        playSound('incorrect');
        setIsBlockedForQuestion(true);
      }
    });

    const unsubResetAll = gameEvents.on('RESET_ALL', () => {
      console.log('🔄 Reset global reçu');
      setHasBuzzed(false);
      setHasAnswered(false);
      setAnswerResult(null);
      setShowReveal(false);
      setAnswer('');
      toast({ title: '🔄 Session réinitialisée' });
    });

    return () => {
      presenceChannel.untrack();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Déconnecter proprement
      if (teamId) {
        supabase.from('teams').update({ 
          is_active: false 
        }).eq('id', teamId);
      }
      
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(gameStateChannel);
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(answersChannel);
      supabase.removeChannel(finalsChannel);
      supabase.removeChannel(buzzersChannel);
      unsubBuzzerReset();
      unsubStartQuestion();
      unsubReveal();
      unsubBlocked();
      unsubResetAll();
      unsubKick();
      unsubKickTeam();
      unsubJoker();
    };
  }, [teamId, currentQuestionInstanceId]);

  useEffect(() => {
    const newQuestionId = currentQuestion?.id;
    console.log('🔄 Client: Question change detected', {
      questionId: newQuestionId,
      previousQuestionId: previousQuestionIdRef.current,
      instanceId: gameState?.current_question_instance_id
    });
    
    // Ne réinitialiser QUE si la question a vraiment changé
    if (newQuestionId !== previousQuestionIdRef.current) {
      console.log('🔄 Client: Question vraiment changée, reset states');
      previousQuestionIdRef.current = newQuestionId || null;
      
      // Ne PAS annuler le reveal si une animation est en cours
      if (!showReveal) {
        // Reset buzzer state when question changes
        setHasBuzzed(false);
        setAnswer("");
        setHasAnswered(false);
        setAnswerResult(null);
        setIsBlockedForQuestion(false);
        setEliminatedOptions([]); // Reset les options éliminées
        setIsTeamBlocked(false); // Reset le statut bloqué
        
        // Reset le flag de notification de timeout
        hasShownTimeoutToast.current = false;
      }
    }
    
    // Vérifier si l'équipe est bloquée
    if (team && gameState?.excluded_teams) {
      const excludedTeams = (gameState.excluded_teams || []) as string[];
      // excluded_teams est un array d'UUID strings
      const isBlocked = excludedTeams.includes(team.id);
      console.log('🚫 Check blocked status:', { teamId: team.id, excludedTeams, isBlocked });
      setIsTeamBlocked(isBlocked);
    } else {
      setIsTeamBlocked(false);
    }
    
    // Ne rien faire si pas de team (page de login)
    if (!team) {
      setIsTimerActive(false);
      setTimerRemaining(0);
      return;
    }
    
    // Si pas de question, réinitialiser complètement le timer
    if (!currentQuestion) {
      setIsTimerActive(false);
      setTimerRemaining(0);
      return;
    }
    
    // Charger l'instance ID depuis game_state
    if (gameState?.current_question_instance_id) {
      setCurrentQuestionInstanceId(gameState.current_question_instance_id);
    }
  }, [currentQuestion?.id, gameState?.current_question_instance_id, team, showReveal]);

  // Calcul du timer en temps réel basé sur timer_started_at
  useEffect(() => {
    if (!team || !currentQuestion || !gameState?.timer_started_at || !gameState?.timer_duration) {
      setIsTimerActive(false);
      setTimerRemaining(0);
      hasShownTimeoutToast.current = false; // Reset quand pas de timer
      return;
    }

    // Reset le flag quand un nouveau timer démarre
    hasShownTimeoutToast.current = false;

    const updateTimer = () => {
      const startedAt = new Date(gameState.timer_started_at).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startedAt) / 1000);
      const remaining = Math.max(0, gameState.timer_duration - elapsed);
      
      setTimerRemaining(remaining);
      setTimerDuration(gameState.timer_duration);
      
      const wasActive = isTimerActive;
      const isNowActive = remaining > 0;
      setIsTimerActive(isNowActive);

      // Ne déclencher la notification qu'une seule fois lors de la transition
      if (remaining === 0 && wasActive && !hasShownTimeoutToast.current) {
        hasShownTimeoutToast.current = true;
        toast({ 
          title: '⏱️ Temps écoulé !', 
          description: 'Les réponses ne sont plus acceptées',
          variant: 'destructive'
        });
        playSound('incorrect');
      }
    };

    // Mise à jour immédiate
    updateTimer();

    // Mise à jour toutes les secondes
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [gameState?.timer_started_at, gameState?.timer_duration, currentQuestion, team]);

  useEffect(() => {
    // Vérifier le statut du buzzer après la mise à jour de l'instance ID
    if (currentQuestionInstanceId) {
      checkIfBuzzed();
      checkIfAnswered();
      loadFirstBuzzer();
    }
  }, [currentQuestionInstanceId]);

  const checkIfBuzzed = async () => {
    if (!team || !currentQuestion?.id || !currentQuestionInstanceId) return;
    
    const { data } = await supabase
      .from('buzzer_attempts')
      .select('id')
      .eq('team_id', team.id)
      .eq('question_instance_id', currentQuestionInstanceId)
      .maybeSingle();
    
    if (data) setHasBuzzed(true);
  };

  const checkIfAnswered = async () => {
    if (!team || !currentQuestion?.id || !currentQuestionInstanceId || !gameState?.game_session_id) return;
    
    console.log('🔍 Checking if answered:', { 
      teamId: team.id, 
      questionId: currentQuestion.id,
      instanceId: currentQuestionInstanceId,
      sessionId: gameState.game_session_id 
    });
    
    // IMPORTANT : Vérifier avec question_instance_id pour distinguer les relances
    const { data } = await supabase
      .from('team_answers')
      .select('*')
      .eq('team_id', team.id)
      .eq('question_instance_id', currentQuestionInstanceId) // Utiliser l'instance, pas juste la question
      .eq('game_session_id', gameState.game_session_id)
      .maybeSingle();
    
    console.log('🔍 Answer found:', data ? 'yes' : 'no');
    
    if (data) {
      setHasAnswered(true);
      if (data.is_correct !== null) {
        setAnswerResult(data.is_correct ? 'correct' : 'incorrect');
      }
    }
  };

  const checkAnswerResult = async () => {
    // Ne rien faire ici - le reveal se fera via l'événement REVEAL_ANSWER
    return;
  };

  const handleDisconnect = async () => {
    if (!teamId) return;
    
    // Déconnecter proprement l'équipe
    await supabase
      .from('teams')
      .update({ 
        is_active: false,
        connected_device_id: null 
      })
      .eq('id', teamId);
    
    toast({
      title: "Déconnexion réussie",
      description: "Vous pouvez vous reconnecter",
    });
    
    // Rediriger vers la page client sans paramètre
    setTimeout(() => {
      window.location.href = '/client';
    }, 500);
  };

  const loadTeam = async () => {
    if (!teamId) return;
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();
    
    if (data) {
      // Vérifier si l'équipe est exclue
      if (data.is_excluded) {
        toast({
          title: "❌ Équipe exclue",
          description: "Votre équipe a été exclue du jeu suite à 2 cartons jaunes",
          variant: "destructive"
        });
        setTimeout(() => {
          window.location.href = '/client';
        }, 2000);
        return;
      }
      
      const currentDeviceId = getDeviceId();
      
      // Vérifier si un appareil est déjà connecté
      if (data.connected_device_id && data.connected_device_id !== currentDeviceId) {
        setDeviceBlocked(true);
        toast({
          title: "Accès bloqué",
          description: "Un appareil est déjà connecté à cette équipe",
          variant: "destructive"
        });
        return;
      }
      
      // Si aucun appareil n'est connecté ou si c'est le même appareil, enregistrer l'appareil
      if (!data.connected_device_id) {
        await supabase
          .from('teams')
          .update({ connected_device_id: currentDeviceId })
          .eq('id', teamId);
      }
      
      console.log('✅ Team loaded:', data);
      setTeam(data);
      setIsLoading(false);
    }
  };

  // Fonction séparée pour les mises à jour en temps réel (sans vérification de device)
  const reloadTeamData = async () => {
    if (!teamId) return;
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();
    
    if (data) {
      // Vérifier si l'équipe est exclue
      if (data.is_excluded && !team?.is_excluded) {
        toast({
          title: "❌ Équipe exclue",
          description: "Votre équipe a été exclue du jeu suite à 2 cartons jaunes",
          variant: "destructive"
        });
        setTimeout(() => {
          window.location.href = '/client';
        }, 2000);
        return;
      }
      
      console.log('🔄 Team data reloaded:', data);
      setTeam(data);
    }
  };

  const loadAllTeams = async () => {
    const { data } = await supabase.from('teams').select('*').order('score', { ascending: false });
    if (data) {
      setAllTeams(data);
      // Calculer le classement de l'équipe actuelle
      const rank = data.findIndex(t => t.id === teamId) + 1;
      setTeamRank(rank);
    }
  };

  const loadActiveSession = async () => {
    const { data } = await supabase.from('game_sessions').select('*').eq('status', 'active').single();
    if (data) {
      setSessionId(data.id);
      setActiveSession(data);
    }
  };

  const requestHelp = async () => {
    if (!teamId || !sessionId || isRequestingHelp) return;
    
    setIsRequestingHelp(true);
    
    try {
      await supabase.from('help_requests').insert({
        team_id: teamId,
        game_session_id: sessionId,
        message: 'Demande d\'aide de l\'équipe',
        status: 'pending'
      });
      
      toast({ 
        title: '🆘 Demande envoyée', 
        description: 'La régie a été informée de votre demande d\'aide'
      });
      
      // Réactiver le bouton après 30 secondes
      setTimeout(() => setIsRequestingHelp(false), 30000);
    } catch (error) {
      console.error('Erreur demande d\'aide:', error);
      toast({ 
        title: '❌ Erreur', 
        description: 'Impossible d\'envoyer la demande',
        variant: 'destructive'
      });
      setIsRequestingHelp(false);
    }
  };

  const loadGameState = async () => {
    console.log('🔄 [Client] loadGameState appelé');
    const { data, error } = await supabase
      .from('game_state')
      .select('*')
      .maybeSingle();
    
    console.log('🔄 [Client] game_state chargé:', data, 'erreur:', error);
    
    if (data) {
      setGameState(data);
      console.log('🔄 [Client] current_question_id:', data.current_question_id);
      
      // Charger la question séparément si elle existe
      if (data.current_question_id) {
        console.log('🔄 [Client] Chargement question:', data.current_question_id);
        const { data: questionData, error: qError } = await supabase
          .from('questions')
          .select('*')
          .eq('id', data.current_question_id)
          .single();
        
        console.log('🔄 [Client] question chargée:', questionData, 'erreur:', qError);
        
        if (questionData) {
          console.log('✅ [Client] Question définie:', questionData);
          setCurrentQuestion(questionData);
        } else {
          console.log('❌ [Client] Pas de questionData');
          setCurrentQuestion(null);
        }
      } else {
        console.log('⚠️ [Client] Pas de current_question_id dans game_state');
        setCurrentQuestion(null);
      }
      
      // Charger la finale si mode final actif
      if (data.final_mode && data.final_id) {
        loadFinal(data.final_id);
      }
    } else {
      console.log('❌ [Client] Pas de game_state');
      setGameState(null);
      setCurrentQuestion(null);
      setIsTimerActive(false);
      setTimerRemaining(0);
      setFinal(null);
      setIsFinalist(false);
    }
  };

  const loadFinal = async (finalId?: string) => {
    // Utiliser l'ID de la finale du gameState ou celui passé en paramètre
    const id = finalId || gameState?.final_id;
    
    if (!id || !teamId) {
      setFinal(null);
      setIsFinalist(false);
      return;
    }

    const { data } = await supabase
      .from('finals')
      .select('*')
      .eq('id', id)
      .single();

    if (data) {
      setFinal(data);
      // Vérifier si l'équipe actuelle est finaliste
      const finalistIds = (data.finalist_teams as string[]) || [];
      setIsFinalist(finalistIds.includes(teamId));
    } else {
      setFinal(null);
      setIsFinalist(false);
    }
  };

  const loadFirstBuzzer = async () => {
    if (!currentQuestionInstanceId || !sessionId) {
      setFirstBuzzerTeam(null);
      return;
    }

    const { data } = await supabase
      .from('buzzer_attempts')
      .select('*, teams(*)')
      .eq('question_instance_id', currentQuestionInstanceId)
      .eq('game_session_id', sessionId)
      .order('buzzed_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    setFirstBuzzerTeam(data?.teams || null);
  };

  const checkIfTeamBuzzed = async () => {
    if (!team?.id || !currentQuestionInstanceId || !sessionId) {
      return;
    }

    const { data } = await supabase
      .from('buzzer_attempts')
      .select('id')
      .eq('team_id', team.id)
      .eq('question_instance_id', currentQuestionInstanceId)
      .eq('game_session_id', sessionId)
      .maybeSingle();

    const teamHasBuzzed = !!data;
    console.log('🔔 Vérification buzzer équipe:', { teamHasBuzzed, data });
    setHasBuzzed(teamHasBuzzed);
  };

  const eliminateTwoWrongAnswers = (timestamp: number, questionOptions?: any, correctAnswer?: string) => {
    console.log('🎯 [Client] eliminateTwoWrongAnswers appelé, timestamp:', timestamp);
    console.log('🎯 [Client] questionOptions:', questionOptions, 'correctAnswer:', correctAnswer);
    
    // Utiliser les données de l'événement ou fallback sur currentQuestion
    const opts = questionOptions || currentQuestion?.options;
    const correct = correctAnswer || currentQuestion?.correct_answer;
    
    if (!opts || !correct) {
      console.log('❌ [Client] Pas de options ou correct_answer');
      return;
    }

    try {
      const options = typeof opts === 'string' ? JSON.parse(opts) : opts;
      
      console.log('🎯 [Client] Options parsed:', options);
      console.log('🎯 [Client] Correct answer:', correct);

      // Récupérer toutes les mauvaises réponses non éliminées, triées alphabétiquement
      const wrongAnswers = Object.values(options)
        .filter((value: any) => {
          const optionValue = String(value);
          const isWrong = optionValue !== correct;
          const notEliminated = !eliminatedOptions.includes(optionValue);
          console.log(`🎯 [Client] Checking "${optionValue}": isWrong=${isWrong}, notEliminated=${notEliminated}`);
          return isWrong && optionValue !== '' && notEliminated;
        })
        .map((value: any) => String(value))
        .sort();

      console.log('🎯 [Client] Wrong answers to choose from:', wrongAnswers);

      if (wrongAnswers.length === 0) {
        console.log('⚠️ [Client] Aucune mauvaise réponse disponible');
        return;
      }

      // Utiliser le timestamp comme seed
      const toEliminate: string[] = [];
      const index1 = timestamp % wrongAnswers.length;
      toEliminate.push(wrongAnswers[index1]);

      if (wrongAnswers.length > 1) {
        let index2 = (timestamp * 3) % wrongAnswers.length;
        if (index2 === index1) {
          index2 = (index2 + 1) % wrongAnswers.length;
        }
        toEliminate.push(wrongAnswers[index2]);
      }

      console.log('🎯 [Client] Options to eliminate:', toEliminate);

      // Jouer le son d'élimination
      playSound('eliminate');

      // Mettre à jour le state immédiatement avec toutes les options à éliminer
      setEliminatedOptions(prev => {
        const newEliminated = [...prev, ...toEliminate];
        console.log('🎯 [Client] New eliminatedOptions state:', newEliminated);
        return newEliminated;
      });
    } catch (error) {
      console.error('❌ [Client] Erreur élimination:', error);
    }
  };

  const createTeam = async () => {
    if (!teamName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nom d'équipe",
        variant: "destructive"
      });
      return;
    }

    try {
      const currentDeviceId = getDeviceId();
      console.log('🔧 Creating team with device_id:', currentDeviceId);

      const { data, error } = await supabase
        .from('teams')
        .insert([
          { name: teamName, color: teamColor, score: 0, connected_device_id: currentDeviceId }
        ])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating team:', error);
        toast({
          title: "Erreur",
          description: `Impossible de créer l'équipe: ${error.message}`,
          variant: "destructive"
        });
      } else if (data) {
        console.log('✅ Team created:', data);
        setTeam(data);
        window.history.replaceState(null, '', `/client/${data.id}`);
        toast({
          title: "Équipe créée !",
          description: `Bienvenue ${data.name} !`,
        });
      }
    } catch (err) {
      console.error('❌ Exception creating team:', err);
      toast({
        title: "Erreur technique",
        description: err instanceof Error ? err.message : "Erreur inconnue",
        variant: "destructive"
      });
    }
  };

  const connectWithPin = async () => {
    if (!pin.trim() || pin.length !== 4) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un code PIN à 4 chiffres",
        variant: "destructive"
      });
      return;
    }

    const currentDeviceId = getDeviceId();

    // Chercher l'équipe avec ce PIN
    const { data: teamData, error } = await supabase
      .from('teams')
      .select('*')
      .eq('connection_pin', pin)
      .maybeSingle();

    if (error || !teamData) {
      toast({
        title: "Code PIN invalide",
        description: "Aucune équipe trouvée avec ce code PIN",
        variant: "destructive"
      });
      return;
    }

    // Vérifier si l'équipe est exclue
    if (teamData.is_excluded) {
      toast({
        title: "❌ Équipe exclue",
        description: "Cette équipe a été exclue du jeu suite à 2 cartons jaunes",
        variant: "destructive"
      });
      return;
    }

    // Si c'est le même appareil, permettre la reconnexion (utile si déconnexion brutale)
    if (teamData.connected_device_id === currentDeviceId) {
      // Reconnexion du même appareil - autoriser
      await supabase
        .from('teams')
        .update({ is_active: true, last_seen_at: new Date().toISOString() })
        .eq('id', teamData.id);

      setTeam(teamData);
      window.history.replaceState(null, '', `/client/${teamData.id}`);
      toast({
        title: "Reconnexion réussie !",
        description: `Re-bienvenue ${teamData.name} !`,
      });
      return;
    }

    // Vérifier si un AUTRE appareil est connecté ET actif récemment (moins de 2 minutes)
    if (teamData.connected_device_id && teamData.last_seen_at) {
      const lastSeen = new Date(teamData.last_seen_at).getTime();
      const now = Date.now();
      const twoMinutesAgo = now - 120000; // 2 minutes

      // Si l'autre appareil était actif récemment, bloquer
      if (lastSeen > twoMinutesAgo) {
        toast({
          title: "Accès bloqué",
          description: "Un autre appareil est actuellement connecté à cette équipe",
          variant: "destructive"
        });
        return;
      }
      
      // Si l'appareil n'a pas été vu depuis plus de 2 minutes, permettre la prise de contrôle
      toast({
        title: "Prise de contrôle",
        description: "L'ancien appareil était inactif. Connexion en cours...",
      });
    }

    // Connecter l'appareil à l'équipe (nouveau ou prise de contrôle)
    await supabase
      .from('teams')
      .update({ 
        connected_device_id: currentDeviceId, 
        is_active: true,
        last_seen_at: new Date().toISOString()
      })
      .eq('id', teamData.id);

    setTeam(teamData);
    window.history.replaceState(null, '', `/client/${teamData.id}`);
    toast({
      title: "Connexion réussie !",
      description: `Bienvenue ${teamData.name} !`,
    });
  };

  const handleBuzzer = async () => {
    // Haptic feedback on press
    triggerHaptic('heavy');

    console.log('🔔 Tentative de buzzer', {
      team: team?.name,
      teamId: team?.id,
      question: currentQuestion?.id,
      instanceId: currentQuestionInstanceId,
      session: gameState?.game_session_id,
      buzzerActive: gameState?.is_buzzer_active,
      hasBuzzed,
      excludedTeams: gameState?.excluded_teams
    });

    if (!team || !currentQuestion || !currentQuestionInstanceId || !gameState?.is_buzzer_active || !gameState?.game_session_id) {
      console.log('❌ Buzzer bloqué - conditions non remplies');
      triggerHaptic('error');
      return;
    }

    if (hasBuzzed) {
      console.log('❌ Buzzer bloqué - déjà buzzé');
      triggerHaptic('error');
      toast({
        title: "⚠️ Déjà buzzé",
        description: "Vous avez déjà buzzé pour cette question",
        variant: "destructive"
      });
      return;
    }

    // Visual feedback - show buzzing state
    setIsBuzzing(true);

    // Vérifier si l'équipe est exclue - excluded_teams est un array d'UUID strings
    const excludedTeams = (gameState.excluded_teams || []) as string[];
    const isBlocked = excludedTeams.includes(team.id);
    
    console.log('🚫 Check exclusion in buzzer:', { teamId: team.id, excludedTeams, isBlocked });
    
    if (isBlocked) {
      console.log('❌ Buzzer bloqué - équipe exclue');
      toast({
        title: "🚫 Buzzer désactivé",
        description: "Vous êtes bloqué et ne pouvez plus buzzer pour cette question",
        variant: "destructive"
      });
      return;
    }

    // Double vérification dans la DB avant d'insérer
    const { data: existingBuzz } = await supabase
      .from('buzzer_attempts')
      .select('id')
      .eq('team_id', team.id)
      .eq('question_instance_id', currentQuestionInstanceId)
      .eq('game_session_id', gameState.game_session_id)
      .maybeSingle();

    if (existingBuzz) {
      console.log('❌ Buzzer bloqué - déjà buzzé dans la DB');
      setHasBuzzed(true);
      setIsBuzzing(false);
      triggerHaptic('error');
      toast({
        title: "⚠️ Déjà buzzé",
        description: "Vous avez déjà buzzé pour cette question",
        variant: "destructive"
      });
      return;
    }

    console.log('✅ Insertion du buzzer...');
    const { error } = await supabase
      .from('buzzer_attempts')
      .insert([
        {
          team_id: team.id,
          question_id: currentQuestion.id,
          question_instance_id: currentQuestionInstanceId,
          game_session_id: gameState.game_session_id,
          is_first: true
        }
      ]);

    setIsBuzzing(false);

    if (error) {
      console.error('❌ Erreur buzzer:', error);
      triggerHaptic('error');
      if (error.code === '23505') {
        setHasBuzzed(true);
        toast({
          title: "⚠️ Déjà buzzé",
          description: "Vous avez déjà buzzé pour cette question",
          variant: "destructive"
        });
      } else if (error.message?.includes('can_team_buzz') || error.message?.includes('policy')) {
        toast({
          title: "🚫 Buzzer refusé",
          description: "Votre équipe est bloquée",
          variant: "destructive"
        });
      } else {
        toast({
          title: "❌ Erreur",
          description: error.message,
          variant: "destructive"
        });
      }
    } else {
      console.log('✅ Buzzer enregistré avec succès');
      setHasBuzzed(true);
      triggerHaptic('success');
      playSound('buzz');
      toast({
        title: "✅ Buzzé !",
        description: "Votre buzzer a été enregistré avec succès",
      });
    }
  };

  const submitAnswer = async (answerValue?: string) => {
    const finalAnswer = answerValue || answer;
    
    // Bloquer l'envoi si le timer est terminé
    if (!isTimerActive) {
      toast({
        title: "Temps écoulé",
        description: "Les réponses ne sont plus acceptées",
        variant: "destructive"
      });
      return;
    }
    
    if (!team || !currentQuestion || !currentQuestionInstanceId || !finalAnswer.trim() || !gameState?.game_session_id || hasAnswered) return;

    console.log('📤 Client - Envoi réponse:', {
      teamId: team.id,
      questionId: currentQuestion.id,
      instanceId: currentQuestionInstanceId,
      sessionId: gameState.game_session_id,
      answer: finalAnswer,
      questionType: currentQuestion.question_type
    });

    // Stocker la réponse sélectionnée localement pour l'afficher lors du reveal
    setAnswer(finalAnswer);

    // Ne PAS calculer is_correct ici, sera fait au reveal
    const { data, error } = await supabase
      .from('team_answers')
      .insert([
        { 
          team_id: team.id, 
          question_id: currentQuestion.id,
          question_instance_id: currentQuestionInstanceId,
          answer: finalAnswer,
          is_correct: null,
          points_awarded: 0,
          game_session_id: gameState.game_session_id
        }
      ])
      .select();

    if (error) {
      console.error('❌ Client - Erreur envoi réponse:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la réponse",
        variant: "destructive"
      });
    } else {
      console.log('✅ Client - Réponse enregistrée:', data);
      setHasAnswered(true);
      toast({
        title: "Réponse enregistrée !",
        description: "En attente de la révélation...",
      });
    }
  };

  if (deviceBlocked) {
    return (
      <div className="min-h-screen bg-gradient-glow p-6 flex items-center justify-center">
        <Card className="w-full max-w-md p-8 bg-card/90 backdrop-blur-sm border-destructive/50">
          <div className="text-center">
            <X className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-bold text-destructive mb-4">Accès Bloqué</h1>
            <p className="text-muted-foreground">
              Un appareil est déjà connecté à cette équipe. Une seule connexion est autorisée par équipe.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-glow p-6 flex items-center justify-center">
        <Card className="w-full max-w-md p-8 bg-card/90 backdrop-blur-sm border-primary/20">
          <h1 className="text-4xl font-bold text-center bg-gradient-arena bg-clip-text text-transparent mb-8">
            ARENA
          </h1>
          <h2 className="text-2xl font-bold text-center mb-6">Rejoindre le jeu</h2>
          
          <Tabs defaultValue="pin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="pin">Code PIN</TabsTrigger>
              <TabsTrigger value="create">Créer une équipe</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pin" className="space-y-4">
              <div className="text-center mb-4">
                <Key className="h-12 w-12 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Entrez le code PIN fourni par l'organisateur
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Code PIN (4 chiffres)</label>
                <Input
                  placeholder="1234"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="bg-input border-border text-center text-2xl tracking-widest"
                  maxLength={4}
                  inputMode="numeric"
                />
              </div>
              <Button 
                onClick={connectWithPin} 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-gold h-12 text-lg"
                disabled={pin.length !== 4}
              >
                Se connecter
              </Button>
            </TabsContent>
            
            <TabsContent value="create" className="space-y-4">
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
                <div className="flex gap-3 flex-wrap">
                  {['#D4AF37', '#1E3A8A', '#6B21A8', '#B91C1C', '#047857', '#B45309', '#0E7490', '#7C2D12'].map((color) => (
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
                onClick={createTeam} 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-gold h-12 text-lg"
              >
                Créer l'équipe
              </Button>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    );
  }

  const getRankIcon = () => {
    const iconClass = "h-6 w-6 sm:h-8 sm:w-8";
    switch (teamRank) {
      case 1: return <Crown className={`${iconClass} text-yellow-500`} />;
      case 2: return <Medal className={`${iconClass} text-gray-400`} />;
      case 3: return <Award className={`${iconClass} text-amber-700`} />;
      default: return <Trophy className={`${iconClass} text-muted-foreground`} />;
    }
  };

  const getRankBadgeColor = () => {
    switch (teamRank) {
      case 1: return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-black";
      case 2: return "bg-gradient-to-r from-gray-300 to-gray-500 text-black";
      case 3: return "bg-gradient-to-r from-amber-600 to-amber-800 text-white";
      default: return "bg-primary/30 text-primary border border-primary/50";
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      {/* Confetti pour célébration - n'apparaît que pour bonnes réponses */}
      {showReveal && answerResult === 'correct' && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={300}
          recycle={false}
          colors={[team?.color || '#D4AF37', '#FFD700', '#FFA500', '#FF6B00']}
          gravity={0.3}
        />
      )}

      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 p-2 sm:p-4">
        {/* Connection Status Indicator */}
        <ConnectionStatus />

        {/* Sound Control */}
        <SoundControl />

        {/* Bouton de déconnexion amélioré */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleDisconnect}
              className="fixed top-2 left-2 p-2 rounded-lg bg-card/80 hover:bg-destructive/90 text-muted-foreground hover:text-destructive-foreground opacity-40 hover:opacity-100 transition-all duration-300 backdrop-blur-md shadow-sm hover:shadow-md z-50 border border-border/50 hover:border-destructive/50"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Se déconnecter</TooltipContent>
        </Tooltip>

        <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4 landscape-compact">
          {/* Logo configurable en haut avec animation */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center pt-2 sm:pt-4"
          >
            <img 
              src={activeSession?.logo_url || "/music-arena-logo.png"} 
              alt="Logo" 
              className="h-12 sm:h-16 w-auto drop-shadow-[0_0_20px_rgba(255,107,0,0.3)]"
            />
          </motion.div>

        {/* Header équipe premium avec classement - RESPONSIVE */}
        {isLoading ? (
          <Card className="p-6 animate-pulse">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-2 w-full" />
          </Card>
        ) : (
          <Card className="relative overflow-hidden bg-gradient-to-br from-card/95 via-card/90 to-card/95 backdrop-blur-xl border-2 shadow-2xl animate-fade-in"
                style={{ borderColor: team.color }}>
            {/* Effet de brillance */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative p-3 sm:p-6">
            <div className="flex items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
              {/* Avatar avec effet glow */}
              <div className="relative flex-shrink-0">
                <div 
                  className="w-14 h-14 sm:w-20 sm:h-20 rounded-full shadow-elegant animate-pulse"
                  style={{ 
                    backgroundColor: team.color,
                    boxShadow: `0 0 30px ${team.color}80`
                  }}
                />
                <div className="absolute -bottom-1 -right-1">
                  <div className="w-6 h-6 sm:w-8 sm:h-8">
                    {getRankIcon()}
                  </div>
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent truncate">
                    {team.name}
                  </h2>
                  <Badge className={`${getRankBadgeColor()} font-bold px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm flex-shrink-0`}>
                    #{teamRank}
                  </Badge>
                  {team.yellow_cards > 0 && (
                    <Badge variant="outline" className="bg-yellow-500/20 border-yellow-500 text-yellow-500 font-bold flex-shrink-0">
                      {'🟨'.repeat(team.yellow_cards)} {team.yellow_cards}/2
                    </Badge>
                  )}
                  {team.yellow_cards >= 2 && (
                    <Badge variant="destructive" className="font-bold flex-shrink-0 animate-pulse">
                      EXCLUS
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                  <p className="text-lg sm:text-2xl font-bold text-primary">
                    {team.score} pts
                  </p>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {teamRank === 1 && "🏆 En tête !"}
                    {teamRank === 2 && "🥈 Deuxième"}
                    {teamRank === 3 && "🥉 Troisième"}
                    {teamRank > 3 && `${teamRank}e position`}
                  </div>
                </div>
              </div>

              {/* Bouton d'aide amélioré - RESPONSIVE et VISIBLE */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={requestHelp}
                    disabled={isRequestingHelp}
                    variant="outline"
                    size="lg"
                    className={`
                      flex-shrink-0
                      bg-gradient-to-br from-red-500/10 to-orange-500/10
                      hover:from-red-500/20 hover:to-orange-500/20
                      border-2 border-red-500/50 hover:border-red-500
                      transition-all shadow-lg hover:shadow-xl
                      h-12 w-12 sm:h-14 sm:w-14 p-0
                      hover:scale-110 active:scale-95
                      ${!isRequestingHelp ? 'animate-pulse' : ''}
                    `}
                    style={{
                      boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    <HelpCircle className={`h-6 w-6 sm:h-7 sm:w-7 text-red-500 ${isRequestingHelp ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-base font-bold">
                  {isRequestingHelp ? '⏳ Demande envoyée...' : '🆘 Demander de l\'aide à la régie'}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Barre de progression vs leader (si pas leader) */}
            {teamRank > 1 && allTeams[0] && (
              <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/50">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Écart avec le leader</span>
                  <span className="font-bold">{allTeams[0].score - team.score} pts</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                    style={{ 
                      width: `${Math.max(10, (team.score / allTeams[0].score) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>
        )}

        {/* Panneau des Jokers pour les finalistes */}
        {gameState?.final_mode && final && isFinalist && (
          <JokerPanel 
            teamId={teamId!} 
            finalId={final.id} 
            isActive={final.status === 'active'}
            currentQuestion={currentQuestion}
          />
        )}

        {/* Vote du public pour les équipes éliminées */}
        {gameState?.final_mode && final && !isFinalist && (
          <PublicVotePanel 
            teamId={teamId!} 
            finalId={final.id}
            currentQuestionInstanceId={currentQuestionInstanceId}
            currentQuestion={currentQuestion}
            isEliminated={true}
          />
        )}

        {/* Barre de timer - Uniquement si timer actif ET question en cours ET (pas en mode final OU finaliste) */}
        {currentQuestion && isTimerActive && timerRemaining > 0 && (!gameState?.final_mode || isFinalist) && (
          <TimerBar 
            timerRemaining={timerRemaining}
            timerDuration={timerDuration || 30}
            timerActive={isTimerActive}
            questionType={currentQuestion.question_type}
          />
        )}

        {/* Buzzer - Uniquement pour blind test ET (pas en mode final OU finaliste) - RESPONSIVE */}
        {currentQuestion && currentQuestion.question_type === 'blind_test' && (!gameState?.final_mode || isFinalist) && (
          <Card className="relative overflow-hidden p-4 sm:p-8 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 backdrop-blur-xl border-2 border-primary/30 shadow-2xl animate-scale-in">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              {/* Désactiver COMPLÈTEMENT le buzzer si équipe bloquée */}
              {isTeamBlocked ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-24 sm:h-36 flex flex-col items-center justify-center bg-destructive/20 rounded-lg border-2 border-destructive backdrop-blur-sm"
                >
                  <X className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mb-2" />
                  <p className="text-lg sm:text-2xl font-bold text-destructive text-center px-4">
                    🚫 ÉQUIPE BLOQUÉE
                  </p>
                  <p className="text-sm sm:text-base text-destructive/80 text-center px-4 mt-1">
                    Vous ne pouvez plus buzzer
                  </p>
                </motion.div>
              ) : hasBuzzed ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    disabled
                    className="w-full h-24 sm:h-36 text-2xl sm:text-4xl font-bold bg-gradient-to-br from-primary via-secondary to-accent text-primary-foreground shadow-elegant opacity-50"
                  >
                    <Zap className="mr-2 sm:mr-4 h-10 w-10 sm:h-16 sm:w-16" />
                    ✅ BUZZÉ !
                  </Button>
                </motion.div>
              ) : gameState?.is_buzzer_active ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      whileTap={{ scale: 0.92 }}
                      className="w-full"
                    >
                      <Button
                        ref={buzzerButtonRef}
                        onClick={handleBuzzer}
                        disabled={isTeamBlocked || isBuzzing}
                        className={`w-full h-28 sm:h-40 text-2xl sm:text-4xl font-bold bg-gradient-to-br from-primary via-secondary to-accent hover:from-primary/90 hover:via-secondary/90 hover:to-accent/90 text-primary-foreground shadow-elegant transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation ${!isTeamBlocked && !isBuzzing ? 'animate-pulse' : ''}`}
                        style={{
                          boxShadow: isBuzzing
                            ? '0 0 60px rgba(255, 120, 0, 0.9), 0 0 120px rgba(255, 120, 0, 0.5)'
                            : '0 0 40px rgba(255, 120, 0, 0.5)',
                          animation: isBuzzing
                            ? 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                            : 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                          minHeight: '7rem',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        <Zap className={`mr-2 sm:mr-4 h-12 w-12 sm:h-20 sm:w-20 ${isBuzzing ? 'animate-spin' : ''}`} />
                        {isBuzzing ? '⚡ ENVOI...' : '⚡ BUZZER'}
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isTeamBlocked ? '🚫 Votre équipe est bloquée' : 'Appuyez pour buzzer et donner votre réponse !'}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-24 sm:h-36 flex items-center justify-center bg-muted/50 rounded-lg border-2 border-muted backdrop-blur-sm"
                >
                  <p className="text-lg sm:text-2xl font-bold text-muted-foreground text-center px-4">
                    {firstBuzzerTeam ? (
                      <span className="flex items-center gap-2">
                        🔒 <span className="text-primary">{firstBuzzerTeam.name}</span> a buzzé !
                      </span>
                    ) : (
                      <>🔒 Buzzer verrouillé</>
                    )}
                  </p>
                </motion.div>
              )}
            </div>
          </Card>
        )}

        {/* Question et réponse - Uniquement pour (pas en mode final OU finaliste) - RESPONSIVE */}
        {currentQuestion && (!gameState?.final_mode || isFinalist) && (
          <Card className="relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-card/95 via-card/90 to-card/95 backdrop-blur-xl border-2 border-secondary/30 shadow-2xl animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
            
            {/* Banner de révélation NON-bloquant en haut */}
            <AnimatePresence>
              {showReveal && answerResult && (
                <motion.div
                  initial={{ y: -150, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -150, opacity: 0 }}
                  transition={{ type: "spring", damping: 15 }}
                  className={`absolute top-0 left-0 right-0 z-40 mx-2 sm:mx-4 mt-2 sm:mt-4 rounded-2xl backdrop-blur-xl border-4 shadow-2xl ${
                    answerResult === 'correct'
                      ? 'bg-green-500/90 border-green-300'
                      : 'bg-red-500/90 border-red-300'
                  }`}
                  style={{
                    boxShadow: answerResult === 'correct'
                      ? '0 20px 60px rgba(34, 197, 94, 0.6)'
                      : '0 20px 60px rgba(239, 68, 68, 0.6)'
                  }}
                >
                  <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4">
                    <div className="animate-bounce">
                      {answerResult === 'correct' ? (
                        <Check className="w-10 h-10 sm:w-14 sm:h-14 text-white drop-shadow-lg" />
                      ) : (
                        <X className="w-10 h-10 sm:w-14 sm:h-14 text-white drop-shadow-lg" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-2xl sm:text-4xl font-black text-white drop-shadow-lg">
                        {answerResult === 'correct' ? '✓ BONNE RÉPONSE !' : '✗ MAUVAISE RÉPONSE'}
                      </p>
                      <p className="text-sm sm:text-lg text-white/90 font-bold mt-0.5 sm:mt-1">
                        {answerResult === 'correct' ? '🎉 Félicitations !' : '💪 Continuez à jouer !'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="relative">
              <div className="flex items-center gap-2 mb-3 sm:mb-4 flex-wrap">
                <Badge className="bg-gradient-to-r from-secondary to-accent text-white font-bold px-3 sm:px-4 py-0.5 sm:py-1 text-xs sm:text-sm">
                  {currentQuestion.question_type === 'blind_test' ? '🎵 Blind Test' : 
                   currentQuestion.question_type === 'qcm' ? '📋 QCM' : 
                   '✍️ Texte libre'}
                </Badge>
                <Badge variant="outline" className="font-bold text-xs sm:text-sm bg-green-500/10 text-green-600 border-green-500/30">
                  +{currentQuestion.points || 10} pts
                </Badge>
                {currentQuestion.penalty_points > 0 && (
                  <Badge variant="outline" className="font-bold text-xs sm:text-sm bg-red-500/10 text-red-600 border-red-500/30">
                    -{currentQuestion.penalty_points} pts
                  </Badge>
                )}
              </div>
              
              <h3 className="text-lg sm:text-2xl font-bold text-secondary mb-4 sm:mb-6 leading-relaxed">
                {currentQuestion.question_text}
              </h3>

              {/* Affichage de l'image si présente */}
              {currentQuestion.image_url && (
                <div className="mb-4 sm:mb-6">
                  <img 
                    src={currentQuestion.image_url} 
                    alt="Question" 
                    className="w-full max-h-64 sm:max-h-96 object-contain rounded-lg border-2 border-secondary/30"
                  />
                </div>
              )}

            {currentQuestion.question_type === 'qcm' && currentQuestion.options && (
              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                {(() => {
                  try {
                    const options = typeof currentQuestion.options === 'string' 
                      ? JSON.parse(currentQuestion.options) 
                      : currentQuestion.options;
                    // Filtrer les options vides
                    return Object.entries(options || {})
                      .map(([key, value]) => {
                        const optionValue = String(value);
                        if (optionValue.trim() === '') return null;
                        
                        const isEliminated = eliminatedOptions.includes(optionValue);
                        const isCorrectOption = showReveal && optionValue.toLowerCase().trim() === currentQuestion.correct_answer?.toLowerCase().trim();
                        const isSelectedOption = showReveal && answer === optionValue;
                      
                      return (
                        <motion.div
                          key={key}
                          initial={{ opacity: 1, scale: 1, height: 'auto' }}
                          animate={{ 
                            opacity: isEliminated ? 0 : 1,
                            scale: isEliminated ? 0.8 : 1,
                            height: isEliminated ? 0 : 'auto',
                            overflow: isEliminated ? 'hidden' : 'visible'
                          }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          style={{ marginBottom: isEliminated ? 0 : undefined }}
                        >
                          <Button
                            variant="outline"
                            disabled={hasAnswered || !isTimerActive || isEliminated}
                            className={`
                              w-full justify-start text-left h-auto
                              py-4 sm:py-6 px-5 sm:px-7
                              text-base sm:text-lg font-bold
                              disabled:opacity-100
                              transition-all duration-200
                              hover:scale-[1.02] hover:shadow-xl
                              active:scale-[0.98]
                              ${answer === optionValue && !showReveal ? 'ring-4 ring-primary scale-[1.02] shadow-xl bg-primary/10' : ''}
                              ${
                                showReveal && isCorrectOption
                                  ? 'bg-green-500/20 border-green-500 border-4 shadow-lg shadow-green-500/50'
                                  : showReveal && isSelectedOption && answerResult === 'incorrect'
                                  ? 'bg-red-500/20 border-red-500 border-4 shadow-lg shadow-red-500/50'
                                  : hasAnswered || !isTimerActive
                                  ? 'opacity-50'
                                  : 'hover:border-primary/50 hover:bg-primary/5'
                              }
                            `}
                            onClick={() => {
                              if (!isEliminated) {
                                setAnswer(optionValue);
                                submitAnswer(optionValue);
                              }
                            }}
                          >
                            <span className="text-primary font-bold mr-2 sm:mr-3">{key}.</span>
                            <span className="flex-1">{optionValue}</span>
                            {showReveal && isCorrectOption && (
                              <Check className="ml-auto h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0" />
                            )}
                            {showReveal && isSelectedOption && answerResult === 'incorrect' && (
                              <X className="ml-auto h-5 w-5 sm:h-6 sm:w-6 text-red-500 flex-shrink-0" />
                            )}
                          </Button>
                        </motion.div>
                      );
                    }).filter(Boolean);
                  } catch (e) {
                    return <p className="text-destructive text-sm sm:text-base">Erreur de chargement des options</p>;
                  }
                })()}
                {hasAnswered && !showReveal && (
                  <div className="text-center text-green-500 font-bold text-sm sm:text-base">
                    ✓ Réponse enregistrée
                  </div>
                )}
                {!isTimerActive && !hasAnswered && (
                  <div className="text-center text-destructive font-bold text-sm sm:text-base">
                    ⏱️ Temps écoulé - Réponses fermées
                  </div>
                )}
              </div>
            )}

            {currentQuestion.question_type === 'free_text' && (
              <div className="space-y-3 sm:space-y-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      placeholder="Votre réponse..."
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !hasAnswered && isTimerActive) {
                          submitAnswer();
                        }
                      }}
                      disabled={hasAnswered || !isTimerActive}
                      className="bg-input border-border text-sm sm:text-base h-10 sm:h-12 focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </TooltipTrigger>
                  <TooltipContent>Appuyez sur Entrée pour envoyer</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => submitAnswer()}
                      disabled={hasAnswered || !isTimerActive || !answer.trim()}
                      className="w-full h-10 sm:h-12 text-sm sm:text-base bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-glow-pink disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                    >
                      <Send className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      Envoyer la réponse
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!answer.trim() ? 'Tapez votre réponse d\'abord' : 
                     !isTimerActive ? 'Temps écoulé' : 
                     hasAnswered ? 'Réponse déjà envoyée' : 
                     'Cliquez pour valider votre réponse'}
                  </TooltipContent>
                </Tooltip>
                {hasAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-green-500 font-bold text-sm sm:text-base flex items-center justify-center gap-2"
                  >
                    <Check className="h-5 w-5" />
                    Réponse enregistrée
                  </motion.div>
                )}
                {!isTimerActive && !hasAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-destructive font-bold text-sm sm:text-base flex items-center justify-center gap-2"
                  >
                    <X className="h-5 w-5" />
                    Temps écoulé - Réponses fermées
                  </motion.div>
                )}
              </div>
            )}
            </div>
          </Card>
        )}

        {!currentQuestion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="p-12 bg-card/90 backdrop-blur-sm text-center border-2 border-primary/20">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="mb-4"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Trophy className="h-8 w-8 text-primary-foreground" />
                </div>
              </motion.div>
              <p className="text-xl text-muted-foreground font-medium">En attente de la prochaine question...</p>
              <p className="text-sm text-muted-foreground/70 mt-2">Restez prêt !</p>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
};

export default Client;

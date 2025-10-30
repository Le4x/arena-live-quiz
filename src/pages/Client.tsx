import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Zap, Check, X, Send, HelpCircle, Medal, Crown, Award, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { playSound } from "@/lib/sounds";
import { getGameEvents, type BuzzerResetEvent, type StartQuestionEvent, type TeamBuzzedEvent } from "@/lib/runtime/GameEvents";
import { TimerBar } from "@/components/TimerBar";
import { JokerPanel } from "@/components/client/JokerPanel";
import { PublicVotePanel } from "@/components/client/PublicVotePanel";
import { motion } from "framer-motion";

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

  // Générer ou récupérer l'ID unique de l'appareil
  const getDeviceId = () => {
    let deviceId = localStorage.getItem('arena_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('arena_device_id', deviceId);
    }
    return deviceId;
  };

  useEffect(() => {
    if (teamId) {
      loadTeam();
    }
    
    // Charger d'abord la session active
    loadActiveSession();
  }, [teamId]);

  // Charger le game state une fois qu'on a la session
  useEffect(() => {
    if (teamId && sessionId) {
      loadGameState();
      loadAllTeams();
      loadFinal();
    }
  }, [teamId, sessionId]);

  useEffect(() => {
    if (!teamId || !sessionId) return;

    const gameStateChannel = supabase
      .channel('client-game-state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, () => {
        loadGameState();
      })
      .subscribe();

    const teamsChannel = supabase
      .channel('client-teams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        loadTeam();
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
      setTimeout(() => window.location.href = '/', 2000);
    });

    const unsubKickTeam = gameEvents.on('KICK_TEAM', (event: any) => {
      if (event.data?.teamId === teamId) {
        toast({ title: "👋 Déconnecté par la régie" });
        setTimeout(() => window.location.href = '/', 2000);
      }
    });

    const unsubStartQuestion = gameEvents.on<StartQuestionEvent>('START_QUESTION', (event) => {
      console.log('🎯 Nouvelle question', event);
      setCurrentQuestionInstanceId(event.data.questionInstanceId);
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

    const unsubTeamBuzzed = gameEvents.on<TeamBuzzedEvent>('TEAM_BUZZED', (event) => {
      console.log('🔔 Équipe a buzzé:', event);
      const buzzedTeamId = event.data.teamId;
      const buzzedTeamName = event.data.teamName;
      const buzzedTeamColor = event.data.teamColor;
      
      // Afficher une notification visible pour TOUS les clients
      if (buzzedTeamId !== teamId) {
        // Pour les autres équipes, afficher qui a buzzé
        toast({
          title: `⚡ ${buzzedTeamName} a buzzé !`,
          description: "Les buzzers sont maintenant bloqués",
          duration: 4000,
          style: {
            borderLeft: `4px solid ${buzzedTeamColor}`,
          }
        });
      }
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
      unsubBuzzerReset();
      unsubStartQuestion();
      unsubReveal();
      unsubBlocked();
      unsubResetAll();
      unsubKick();
      unsubKickTeam();
      unsubJoker();
      unsubTeamBuzzed();
    };
  }, [teamId, sessionId, currentQuestionInstanceId]);

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
        
        // Reset le flag de notification de timeout
        hasShownTimeoutToast.current = false;
      }
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

  const loadTeam = async () => {
    if (!teamId) return;
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();
    
    if (data) {
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
      
      setTeam(data);
    }
  };

  const loadAllTeams = async () => {
    if (!sessionId) {
      console.log('⚠️ [Client] Pas de session ID, équipes non chargées');
      setAllTeams([]);
      return;
    }
    
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('game_session_id', sessionId)
      .order('score', { ascending: false });
      
    if (data) {
      console.log('✅ [Client] Équipes chargées pour session:', sessionId, '- Total:', data.length);
      setAllTeams(data);
      // Calculer le classement de l'équipe actuelle
      const rank = data.findIndex(t => t.id === teamId) + 1;
      setTeamRank(rank);
    } else {
      setAllTeams([]);
    }
  };

  const loadActiveSession = async () => {
    console.log('🔍 [Client] Chargement session active...');
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('status', 'active')
      .maybeSingle();
      
    if (error) {
      console.error('❌ [Client] Erreur chargement session:', error);
    }
    
    if (data) {
      console.log('✅ [Client] Session active trouvée:', data.name, data.id);
      setSessionId(data.id);
      setActiveSession(data);
    } else {
      console.warn('⚠️ [Client] Aucune session active');
      setSessionId(null);
      setActiveSession(null);
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
    if (!sessionId) {
      console.log('⚠️ [Client] Pas de session ID, game state non chargé');
      return;
    }
    
    console.log('🔍 [Client] Chargement game state pour session:', sessionId);
    
    const { data, error } = await supabase
      .from('game_state')
      .select('*, questions(*), current_round_id:rounds!current_round_id(*)')
      .eq('game_session_id', sessionId)
      .maybeSingle();
    
    if (error) {
      console.error('❌ [Client] Erreur chargement game state:', error);
    }
    
    if (data) {
      console.log('✅ [Client] Game state chargé:', {
        hasCurrentQuestion: !!data.current_question_id,
        questionId: data.current_question_id,
        questionInstanceId: data.current_question_instance_id
      });
      setGameState(data);
      setCurrentQuestion(data.questions);
      
      // Charger la finale si mode final actif
      if (data.final_mode && data.final_id) {
        loadFinal(data.final_id);
      }
    } else {
      console.log('⚠️ [Client] Aucun game state trouvé');
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

    const currentDeviceId = getDeviceId();

    const { data, error } = await supabase
      .from('teams')
      .insert([
        { name: teamName, color: teamColor, score: 0, connected_device_id: currentDeviceId }
      ])
      .select()
      .single();

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'équipe",
        variant: "destructive"
      });
    } else if (data) {
      setTeam(data);
      window.history.replaceState(null, '', `/client/${data.id}`);
      toast({
        title: "Équipe créée !",
        description: `Bienvenue ${data.name} !`,
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

    // Vérifier si un AUTRE appareil est connecté ET actif récemment (moins de 30 secondes)
    if (teamData.connected_device_id && teamData.last_seen_at) {
      const lastSeen = new Date(teamData.last_seen_at).getTime();
      const now = Date.now();
      const thirtySecondsAgo = now - 30000; // 30 secondes

      // Si l'autre appareil était actif récemment, bloquer
      if (lastSeen > thirtySecondsAgo) {
        toast({
          title: "Accès bloqué",
          description: "Un autre appareil est actuellement connecté à cette équipe",
          variant: "destructive"
        });
        return;
      }
      
      // Si l'appareil n'a pas été vu depuis plus de 30s, permettre la prise de contrôle
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
      return;
    }

    if (hasBuzzed) {
      console.log('❌ Buzzer bloqué - déjà buzzé');
      return;
    }

    // Vérifier si l'équipe est exclue
    const excludedTeams = (gameState.excluded_teams || []) as string[];
    if (excludedTeams.includes(team.id)) {
      console.log('❌ Buzzer bloqué - équipe exclue');
      toast({
        title: "Buzzer désactivé",
        description: "Vous ne pouvez plus buzzer pour cette question",
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

    if (error) {
      console.error('❌ Erreur buzzer:', error);
      if (error.code === '23505') {
        toast({
          title: "Déjà buzzé",
          description: "Vous avez déjà buzzé pour cette question",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive"
        });
      }
    } else {
      console.log('✅ Buzzer enregistré avec succès');
      setHasBuzzed(true);
      playSound('buzz');
      toast({
        title: "Buzzé !",
        description: "Votre buzzer a été enregistré",
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

    // Stocker la réponse sélectionnée localement pour l'afficher lors du reveal
    setAnswer(finalAnswer);

    // Ne PAS calculer is_correct ici, sera fait au reveal
    const { error } = await supabase
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
      ]);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la réponse",
        variant: "destructive"
      });
    } else {
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 p-2 sm:p-4">
      <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
        {/* Logo configurable en haut */}
        <div className="flex justify-center pt-2 sm:pt-4">
          <img 
            src={activeSession?.logo_url || "/music-arena-logo.png"} 
            alt="Logo" 
            className="h-12 sm:h-16 w-auto drop-shadow-[0_0_20px_rgba(255,107,0,0.3)]"
          />
        </div>

        {/* Header équipe premium avec classement - RESPONSIVE */}
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

              {/* Bouton d'aide - RESPONSIVE */}
              <Button
                onClick={requestHelp}
                disabled={isRequestingHelp}
                variant="outline"
                size="lg"
                className="flex-shrink-0 bg-gradient-to-br from-red-500/10 to-orange-500/10 hover:from-red-500/20 hover:to-orange-500/20 border-red-500/30 hover:border-red-500 transition-all shadow-glow-red h-10 w-10 sm:h-12 sm:w-12 p-0"
              >
                <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
              </Button>
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
        {gameState?.is_buzzer_active && currentQuestion && currentQuestion.question_type === 'blind_test' && (!gameState?.final_mode || isFinalist) && (
          <Card className="relative overflow-hidden p-4 sm:p-8 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 backdrop-blur-xl border-2 border-primary/30 shadow-2xl animate-scale-in">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <Button
                ref={buzzerButtonRef}
                onClick={handleBuzzer}
                disabled={hasBuzzed}
                className="w-full h-24 sm:h-36 text-2xl sm:text-4xl font-bold bg-gradient-to-br from-primary via-secondary to-accent hover:from-primary/90 hover:via-secondary/90 hover:to-accent/90 text-primary-foreground shadow-elegant disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                style={{
                  boxShadow: hasBuzzed ? 'none' : '0 0 40px rgba(255, 120, 0, 0.5)'
                }}
              >
                <Zap className="mr-2 sm:mr-4 h-10 w-10 sm:h-16 sm:w-16 animate-pulse" />
                {hasBuzzed ? "✅ BUZZÉ !" : "⚡ BUZZER"}
              </Button>
            </div>
          </Card>
        )}

        {/* Question et réponse - Uniquement pour (pas en mode final OU finaliste) - RESPONSIVE */}
        {currentQuestion && (!gameState?.final_mode || isFinalist) && (
          <Card className="relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-card/95 via-card/90 to-card/95 backdrop-blur-xl border-2 border-secondary/30 shadow-2xl animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
            
            {showReveal && answerResult && (
              <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${
                answerResult === 'correct' 
                  ? 'from-green-500/98 to-emerald-600/98' 
                  : 'from-red-500/98 to-rose-600/98'
              } rounded-lg animate-scale-in z-50 backdrop-blur-md shadow-2xl border-4 ${
                answerResult === 'correct' ? 'border-green-300' : 'border-red-300'
              }`}
              style={{
                animation: 'scale-in 0.5s ease-out, pulse 2s ease-in-out infinite'
              }}>
                <div className="text-center p-6 sm:p-8">
                  <div className="animate-bounce mb-4">
                    {answerResult === 'correct' ? (
                      <Check className="w-24 h-24 sm:w-40 sm:h-40 mx-auto text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]" 
                             style={{ filter: 'drop-shadow(0 0 30px white)' }} />
                    ) : (
                      <X className="w-24 h-24 sm:w-40 sm:h-40 mx-auto text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]" 
                         style={{ filter: 'drop-shadow(0 0 30px white)' }} />
                    )}
                  </div>
                  {answerResult === 'correct' ? (
                    <>
                      <p className="text-4xl sm:text-6xl font-black text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)] mb-3 animate-pulse">
                        BONNE RÉPONSE !
                      </p>
                      <p className="text-xl sm:text-3xl text-white/95 font-bold mt-2 sm:mt-4 animate-fade-in">
                        🎉 Félicitations ! 🎉
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-4xl sm:text-6xl font-black text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)] mb-3 animate-pulse">
                        MAUVAISE RÉPONSE
                      </p>
                      <p className="text-xl sm:text-3xl text-white/95 font-bold mt-2 sm:mt-4 animate-fade-in">
                        💪 Continuez à jouer !
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
            
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
                            className={`w-full justify-start text-left h-auto py-3 sm:py-4 px-4 sm:px-6 disabled:opacity-100 transition-all text-sm sm:text-base ${
                              showReveal && isCorrectOption 
                                ? 'bg-green-500/20 border-green-500 border-2' 
                                : showReveal && isSelectedOption && answerResult === 'incorrect'
                                ? 'bg-red-500/20 border-red-500 border-2'
                                : hasAnswered || !isTimerActive
                                ? 'opacity-50' 
                                : ''
                            }`}
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
                  className="bg-input border-border text-sm sm:text-base h-10 sm:h-12"
                />
                <Button
                  onClick={() => submitAnswer()}
                  disabled={hasAnswered || !isTimerActive}
                  className="w-full h-10 sm:h-12 text-sm sm:text-base bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-glow-pink disabled:opacity-50"
                >
                  <Send className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Envoyer la réponse
                </Button>
                {hasAnswered && (
                  <div className="text-center text-green-500 font-bold text-sm sm:text-base">
                    ✓ Réponse envoyée
                  </div>
                )}
                {!isTimerActive && !hasAnswered && (
                  <div className="text-center text-destructive font-bold text-sm sm:text-base">
                    ⏱️ Temps écoulé - Réponses fermées
                  </div>
                )}
              </div>
            )}
            </div>
          </Card>
        )}

        {!currentQuestion && (
          <Card className="p-12 bg-card/90 backdrop-blur-sm text-center">
            <p className="text-xl text-muted-foreground">En attente de la prochaine question...</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Client;

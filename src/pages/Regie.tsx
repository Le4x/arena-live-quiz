/**
 * Régie TV - Interface de contrôle pro
 * Layout optimisé 1366×768 sans scroll vertical
 */

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, Monitor, RotateCcw, Eye, EyeOff, Trophy, Sparkles, X, Radio, Home, Wifi, Award, Heart, Play, Pause, RotateCw, Clock, Volume2, CheckCircle2, AlertCircle, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { getAudioEngine, type Track } from "@/lib/audio/AudioEngine";
import { gameEvents, getGameEvents } from "@/lib/runtime/GameEvents";
import type { SoundWithCues } from "@/pages/AdminSounds";
import { QCMAnswersDisplay } from "@/components/QCMAnswersDisplay";
import { TextAnswersDisplay } from "@/components/TextAnswersDisplay";
import { BuzzerMonitor } from "@/components/BuzzerMonitor";
import { AudioDeck } from "@/components/audio/AudioDeck";
import { TimerBar } from "@/components/TimerBar";
import { HelpRequestMonitor } from "@/components/HelpRequestMonitor";
import { FinalManager } from "@/components/regie/FinalManager";
import { PublicVoteControl } from "@/components/regie/PublicVoteControl";
import { useRealtimeReconnect } from "@/hooks/useRealtimeReconnect";

const Regie = () => {
  const { toast } = useToast();
  const audioEngine = getAudioEngine();
  const previousBuzzersCount = useRef(0);
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [connectedTeams, setConnectedTeams] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [currentQuestionInstanceId, setCurrentQuestionInstanceId] = useState<string | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(30);
  const [audioTracks, setAudioTracks] = useState<Track[]>([]);
  const [buzzerLocked, setBuzzerLocked] = useState(false);
  const [buzzers, setBuzzers] = useState<any[]>([]);
  const [timerWhenBuzzed, setTimerWhenBuzzed] = useState<number>(0);
  const [blockedTeams, setBlockedTeams] = useState<string[]>([]);
  const [audioPositionWhenBuzzed, setAudioPositionWhenBuzzed] = useState<number>(0);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [clipStartTime, setClipStartTime] = useState<number>(0); // Position du CUE1 dans la piste
  const [showPublicVotes, setShowPublicVotes] = useState(false);
  const [audioPreloaded, setAudioPreloaded] = useState(false);
  const [audioPreloading, setAudioPreloading] = useState(false);

  // Hook de reconnexion automatique
  useRealtimeReconnect({
    onReconnect: () => {
      console.log('🔄 Regie: Reconnexion - rechargement des données');
      loadActiveSession();
      loadRounds();
      loadQuestions();
      loadTeams();
      loadAudioTracks();
      loadBuzzers();
      if (sessionId) {
        loadGameState();
      }
    }
  });

  useEffect(() => {
    loadActiveSession();
    loadRounds();
    loadQuestions();
    loadTeams();
    loadAudioTracks();
  }, []);

  // Écouteurs pour les votes du public
  useEffect(() => {
    const gameEventsManager = getGameEvents();
    
    const unsubShowVotes = gameEventsManager.on('SHOW_PUBLIC_VOTES', () => {
      setShowPublicVotes(true);
    });

    const unsubHideVotes = gameEventsManager.on('HIDE_PUBLIC_VOTES', () => {
      setShowPublicVotes(false);
    });

    return () => {
      unsubShowVotes();
      unsubHideVotes();
    };
  }, []);

  // Recharger les buzzers quand la question change
  useEffect(() => {
    console.log('📌 Regie: Question changed, reloading buzzers', { currentQuestionId, sessionId });
    if (currentQuestionId && sessionId) {
      loadBuzzers();
    }
  }, [currentQuestionId, sessionId]);

  // ⚡ OPTIMISATION: Polling désactivé - Utilisation exclusive de Realtime
  // Le canal 'regie-buzzers-realtime' (lignes 453-488) gère les buzzers en temps réel
  // Gain: 0 requête vs 30 req/s avec polling → Scalable pour 60+ équipes
  // Note: Si problème Realtime, vérifier status du canal et logs console

  useEffect(() => {
    if (!sessionId) return;
    const stateChannel = supabase.channel('game-state-regie')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state', filter: `game_session_id=eq.${sessionId}` }, loadGameState)
      .subscribe();
    loadGameState();
    return () => { supabase.removeChannel(stateChannel); };
  }, [sessionId]);

  useEffect(() => {
    if (!timerActive || timerRemaining <= 0) return;
    const interval = setInterval(async () => {
      setTimerRemaining(prev => {
        const next = prev - 1;
        if (next <= 0) { 
          setTimerActive(false); 
          audioEngine.stopWithFade(300); 
          toast({ title: '⏱️ Temps écoulé' });
          
          // Mettre à jour la DB pour arrêter le timer
          if (sessionId) {
            supabase.from('game_state').update({ 
              timer_active: false,
              timer_remaining: 0
            }).eq('game_session_id', sessionId);
          }
        }
        return Math.max(0, next);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timerRemaining, sessionId]);

  // Auto-lock buzzer quand premier arrive + notification pour nouveaux buzzers uniquement
  useEffect(() => {
    if (buzzers.length > previousBuzzersCount.current) {
      // Nouveau buzzer détecté - notifier pour chaque nouveau
      for (let i = previousBuzzersCount.current; i < buzzers.length; i++) {
        const buzzer = buzzers[i];
        console.log('🔔 Nouveau buzzer détecté:', buzzer);
        
        toast({ 
          title: `🔔 ${buzzer.teams?.name || 'Équipe inconnue'} a buzzé !`, 
          description: `Position #${i + 1}`,
          duration: 5000 
        });
      }
      
      // PREMIER BUZZER = ARRÊT IMMÉDIAT pour blind test (déplacé dans loadBuzzers pour plus de fiabilité)
    }
    
    // Mettre à jour le compteur
    previousBuzzersCount.current = buzzers.length;
  }, [buzzers]);

  const loadActiveSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('game_sessions').select('*').eq('status', 'active').single();
      if (error) {
        console.error('❌ Erreur chargement session active:', error);
        return;
      }
      if (data) {
        setSessionId(data.id);
        setCurrentSession(data);
        
        // S'assurer que le game_state est lié à cette session
        await supabase.from('game_state').update({
          game_session_id: data.id
        }).eq('id', '00000000-0000-0000-0000-000000000001');
      }
    } catch (error) {
      console.error('❌ Exception lors du chargement de la session:', error);
      toast({ 
        title: '⚠️ Erreur de connexion', 
        description: 'Impossible de charger la session',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const loadGameState = useCallback(async () => {
    if (!sessionId) return;
    try {
      const { data, error } = await supabase.from('game_state').select('*').eq('game_session_id', sessionId).single();
      if (error) {
        console.error('❌ Erreur chargement game state:', error);
        return;
      }
      if (data) {
        setGameState(data);
        
        // Restaurer les variables locales depuis le game_state pour persistance après rechargement
        if (data.current_question_id) {
          console.log('🔄 Restauration de la question en cours:', data.current_question_id);
          setCurrentQuestionId(data.current_question_id);
        }
        if (data.current_question_instance_id) {
          console.log('🔄 Restauration de l\'instance de question:', data.current_question_instance_id);
          setCurrentQuestionInstanceId(data.current_question_instance_id);
        }
        if (data.current_round_id) {
          console.log('🔄 Restauration de la manche:', data.current_round_id);
          setCurrentRoundId(data.current_round_id);
        }
        if (data.excluded_teams && Array.isArray(data.excluded_teams)) {
          setBlockedTeams(data.excluded_teams as string[]);
        }
        
        // Synchroniser le timer avec la DB
        if (data.timer_active) {
          setTimerActive(true);
          setTimerRemaining(data.timer_remaining || 0);
        } else {
          // Si timer inactif dans la DB, s'assurer qu'il est arrêté localement aussi
          setTimerActive(false);
        }
      }
    } catch (error) {
      console.error('❌ Exception lors du chargement du game state:', error);
    }
  }, [sessionId]);

  const loadRounds = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('rounds').select('*').order('created_at');
      if (error) {
        console.error('❌ Erreur chargement rounds:', error);
        return;
      }
      if (data) setRounds(data);
    } catch (error) {
      console.error('❌ Exception lors du chargement des rounds:', error);
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('questions').select('*').order('display_order');
      if (error) {
        console.error('❌ Erreur chargement questions:', error);
        return;
      }
      if (data) setQuestions(data);
    } catch (error) {
      console.error('❌ Exception lors du chargement des questions:', error);
    }
  }, []);

  const loadTeams = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('teams').select('*').order('score', { ascending: false });
      if (error) {
        console.error('❌ Erreur chargement teams:', error);
        return;
      }
      if (data) {
        // Charger les équipes sans présence (sera mise à jour par le canal)
        setConnectedTeams(data.map(t => ({ ...t, is_connected: false })));
      }
    } catch (error) {
      console.error('❌ Exception lors du chargement des équipes:', error);
    }
  }, []);

  const loadBuzzers = useCallback(async () => {
    // Utiliser les refs pour éviter les stale closures
    const qInstanceId = currentQuestionInstanceId;
    const sId = sessionId;
    
    console.log('🔍 Regie: loadBuzzers appelé', { qInstanceId, sId, timestamp: new Date().toISOString() });
    
    if (!qInstanceId || !sId) {
      console.log('⚠️ Regie: Pas de question instance ou session, buzzers vidés');
      setBuzzers([]);
      return;
    }
    
    try {
      // CRITIQUE: Filtrer par question_instance_id pour éviter les buzzers historiques
      const { data, error } = await supabase.from('buzzer_attempts')
        .select('*, teams(*)')
        .eq('question_instance_id', qInstanceId)
        .eq('game_session_id', sId)
        .order('buzzed_at', { ascending: true});
      
      if (error) {
        console.error('❌ Regie: Erreur chargement buzzers', error);
        // Ne pas vider les buzzers en cas d'erreur réseau temporaire
        return;
      }
      
      console.log('📥 Regie: Buzzers chargés depuis DB:', data?.length || 0, 'buzzers:', data);
      
      if (data) {
        // Filtrer les buzzers d'équipes bloquées IMMÉDIATEMENT
        const { data: currentGameState } = await supabase
          .from('game_state')
          .select('excluded_teams, current_question_id')
          .eq('game_session_id', sId)
          .maybeSingle();
        
        const excludedTeams = (currentGameState?.excluded_teams as any) || [];
        const blockedTeamIds = new Set<string>();
        
        if (Array.isArray(excludedTeams)) {
          excludedTeams.forEach((item: any) => {
            if (typeof item === 'string') {
              blockedTeamIds.add(item);
            } else if (item && typeof item === 'object') {
              const teamId = item.team_id || item.id || item.teamId;
              if (teamId) blockedTeamIds.add(teamId);
            }
          });
        }
        
        // FILTRER les buzzers bloqués AVANT de les traiter
        const validBuzzers = data.filter(buzzer => {
          const buzzTeamId = buzzer.team_id || '';
          const isBlocked = blockedTeamIds.has(buzzTeamId);
          
          if (isBlocked) {
            console.log(`🚫 Buzzer IGNORÉ de ${buzzer.teams?.name} (équipe bloquée)`);
          }
          
          return !isBlocked;
        });
        
        console.log(`🔔 Buzzers filtrés: ${data.length} total, ${validBuzzers.length} valides`);
        
        // Arrêter immédiatement l'audio si c'est le premier buzzer VALIDE pour un blind test
        if (validBuzzers.length > 0) {
          const currentQ = questions.find(q => q.id === currentGameState?.current_question_id);
          if (currentQ?.question_type === 'blind_test' && !buzzerLocked) {
            console.log('🛑 PREMIER BUZZER VALIDE DÉTECTÉ - Arrêt audio immédiat');
            const currentPos = audioEngine.getPosition();
            const relativePos = currentPos - clipStartTime;
            audioEngine.stopWithFade(30);
            setTimerWhenBuzzed(timerRemaining);
            setAudioPositionWhenBuzzed(relativePos);
            setBuzzerLocked(true);
            setTimerActive(false);
            console.log('💾 Audio stoppé à position:', currentPos, '| relative:', relativePos);
          }
        }
        
        setBuzzers(validBuzzers);
        console.log('✅ Regie: State buzzers mis à jour avec', validBuzzers.length, 'buzzers valides');
      }
    } catch (error) {
      console.error('❌ Regie: Exception lors du chargement des buzzers', error);
      // En cas d'erreur critique, on garde les buzzers existants
    }
  }, [currentQuestionInstanceId, sessionId, questions, timerRemaining, clipStartTime]);

  const loadAudioTracks = () => {
    const stored = localStorage.getItem('arena_sounds');
    if (stored) {
      try {
        const sounds: SoundWithCues[] = JSON.parse(stored);
        setAudioTracks(sounds.map(s => ({ 
          id: s.id, 
          name: s.name, 
          url: s.url, 
          cues: [
            { label: 'Extrait', time: s.cue1_time }, 
            { label: 'Solution', time: s.cue2_time }
          ] 
        })));
      } catch { setAudioTracks([]); }
    }
  };

  // Setup channels realtime après les déclarations de loadBuzzers et loadTeams
  useEffect(() => {
    console.log('🔄 Regie: Setup channels realtime');
    
    // Abonnement changements de teams (score, yellow_cards, etc) - IMMEDIAT
    const teamsChannel = supabase.channel('regie-teams-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'teams' 
      }, (payload) => {
        console.log('🔄 Regie: Teams changed realtime', payload);
        loadTeams();
      })
      .subscribe((status) => {
        console.log('📡 Teams channel status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Teams channel error - reconnecting...');
          setTimeout(() => loadTeams(), 2000);
        }
      });

    // Abonnement buzzers GLOBAL - NOM STABLE pour reconnexion fiable
    const buzzersChannel = supabase.channel('regie-buzzers-realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'buzzer_attempts' 
      }, (payload) => {
        console.log('🔔 Regie: Buzzer INSERT détecté (realtime)', payload);
        // Appeler loadBuzzers immédiatement pour refresh
        loadBuzzers();
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'buzzer_attempts' 
      }, (payload) => {
        console.log('🗑️ Regie: Buzzer DELETE détecté (realtime)', payload);
        loadBuzzers();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'buzzer_attempts' 
      }, (payload) => {
        console.log('🔄 Regie: Buzzer UPDATE détecté (realtime)', payload);
        loadBuzzers();
      })
      .subscribe((status) => {
        console.log('📡 Buzzers channel status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Buzzers channel subscribed successfully');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Buzzers channel error - reconnecting...');
          setTimeout(() => loadBuzzers(), 1000);
        }
      });

    // Canal de présence GLOBAL - écoute toutes les équipes connectées
    const presenceChannel = supabase.channel('team_presence')
      .on('presence', { event: 'sync' }, () => {
        const presenceState = presenceChannel.presenceState();
        const connectedTeamIds = new Set(
          Object.values(presenceState)
            .flat()
            .map((p: any) => p.team_id)
            .filter(Boolean)
        );
        
        console.log(`📊 Regie: ${connectedTeamIds.size} équipes connectées`, Array.from(connectedTeamIds));
        
        // Mettre à jour les équipes avec le statut de connexion
        setConnectedTeams(prev => 
          prev.map(t => ({
            ...t,
            is_connected: connectedTeamIds.has(t.id)
          }))
        );
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('✅ Regie: Équipe rejointe', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('👋 Regie: Équipe partie', key, leftPresences);
      })
      .subscribe((status) => {
        console.log('📡 Presence channel status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Presence channel error - reconnecting...');
          setTimeout(() => loadTeams(), 2000);
        }
      });

    return () => {
      console.log('🧹 Regie: Cleanup channels');
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(buzzersChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [loadBuzzers, loadTeams]);

  const startQuestion = async (question: any) => {
    console.log('🔄 RESET COMPLET - Démarrage d\'une nouvelle question');
    
    // ========== PHASE 1: ARRÊT IMMÉDIAT ==========
    // Arrêter toute lecture audio en cours
    audioEngine.stop();
    console.log('✅ Audio stoppé');
    
    // ========== PHASE 2: PURGE BASE DE DONNÉES ==========
    if (sessionId) {
      // Supprimer tous les buzzers de la session
      await supabase
        .from('buzzer_attempts')
        .delete()
        .eq('game_session_id', sessionId);
      console.log('✅ Buzzers purgés de la DB');
      
      // Supprimer toutes les réponses de l'instance précédente si elle existe
      if (currentQuestionInstanceId) {
        await supabase
          .from('team_answers')
          .delete()
          .eq('question_instance_id', currentQuestionInstanceId);
        console.log('✅ Réponses précédentes purgées');
      }
    }
    
    // ========== PHASE 3: RESET DES ÉTATS LOCAUX ==========
    const instanceId = crypto.randomUUID();
    setCurrentQuestionId(question.id);
    setCurrentQuestionInstanceId(instanceId);
    setCurrentRoundId(question.round_id);
    
    // Réinitialiser tous les compteurs et états
    previousBuzzersCount.current = 0;
    setBlockedTeams([]);
    setBuzzers([]);
    setBuzzerLocked(false);
    setTimerActive(false);
    setTimerWhenBuzzed(0);
    setAudioPositionWhenBuzzed(0);
    setClipStartTime(0);
    console.log('✅ États locaux réinitialisés');
    
    // Précharger le son pour les blind tests - CHARGÉ ET PRÊT À JOUER
    if (question.question_type === 'blind_test' && question.audio_url) {
      const track = audioTracks.find(t => t.url === question.audio_url);
      if (track) {
        console.log('🎵 Préchargement du son:', track.name);
        setAudioPreloading(true);
        setAudioPreloaded(false);
        toast({ title: '⏳ Chargement audio...', description: track.name });
        
        try {
          // Précharger le buffer
          await audioEngine.preloadTrack(track);
          
          // Charger ET jouer le track pour initialiser l'AudioContext
          await audioEngine.loadAndPlay(track);
          
          // Mettre en pause immédiatement pour qu'il soit prêt
          audioEngine.pause();
          
          setCurrentTrack(track);
          setAudioPreloaded(true);
          setAudioPreloading(false);
          toast({ 
            title: '✅ Son prêt à diffuser', 
            description: track.name,
            duration: 3000
          });
          console.log('✅ Audio complètement préchargé et prêt à jouer');
        } catch (error) {
          console.error('❌ Erreur préchargement:', error);
          setAudioPreloading(false);
          setAudioPreloaded(false);
          toast({ 
            title: '⚠️ Erreur audio', 
            description: 'Le son n\'a pas pu être chargé',
            variant: 'destructive'
          });
          setCurrentTrack(null);
        }
      }
    } else {
      setCurrentTrack(null);
      setAudioPreloaded(false);
      setAudioPreloading(false);
    }
    
    await supabase.from('question_instances').insert({
      id: instanceId,
      question_id: question.id,
      game_session_id: sessionId,
      started_at: new Date().toISOString()
    });
    
    const round = rounds.find(r => r.id === question.round_id);
    const timerDuration = round?.timer_duration || 30;
    
    // ========== PHASE 4: RESET GAME STATE EN DB ==========
    // NE PAS envoyer aux clients encore - juste préparer en régie
    await supabase.from('game_state').update({ 
      current_question_instance_id: instanceId, 
      current_round_id: question.round_id,
      current_question_id: null, // Important: ne pas encore montrer aux clients
      timer_remaining: timerDuration,
      timer_active: false,
      is_buzzer_active: false,
      show_leaderboard: false,
      show_waiting_screen: false,
      show_answer: false,
      answer_result: null,
      excluded_teams: [] // Réinitialiser les équipes bloquées
    }).eq('game_session_id', sessionId);
    console.log('✅ Game state réinitialisé en DB');
    
    // ========== PHASE 5: PRÉPARER POUR DÉMARRAGE ==========
    setTimerRemaining(timerDuration);
    
    console.log('✅ RESET COMPLET TERMINÉ - Système prêt');
    toast({ 
      title: '🔄 Système réinitialisé', 
      description: 'Question prête à être envoyée' 
    });
  };

  const sendQuestionToClients = async () => {
    if (!currentQuestionId || !sessionId) {
      toast({ title: '❌ Aucune question préparée', variant: 'destructive' });
      return;
    }

    const question = questions.find(q => q.id === currentQuestionId);
    if (!question) return;
    
    // Vérifier que l'audio est préchargé pour les blind tests
    if (question.question_type === 'blind_test' && !audioPreloaded) {
      toast({ 
        title: '⚠️ Audio non préchargé', 
        description: 'Veuillez attendre que le son soit chargé',
        variant: 'destructive'
      });
      return;
    }

    const round = rounds.find(r => r.id === question.round_id);
    const timerDuration = round?.timer_duration || 30;

    // D'abord arrêter le timer (pour forcer la resynchronisation sur Screen)
    await supabase.from('game_state').update({
      timer_active: false
    }).eq('game_session_id', sessionId);

    // Attendre un tout petit peu pour que le changement soit propagé
    await new Promise(resolve => setTimeout(resolve, 50));

    // Réinitialiser le chrono et le relancer
    setTimerRemaining(timerDuration);
    setTimerActive(true);

    // Envoyer la question aux clients et démarrer le chrono avec timestamp
    await supabase.from('game_state').update({
      current_question_id: currentQuestionId,
      is_buzzer_active: question.question_type === 'blind_test',
      timer_active: true,
      timer_started_at: new Date().toISOString(),
      timer_duration: timerDuration,
      timer_remaining: timerDuration // Garder pour compatibilité
    }).eq('game_session_id', sessionId);

    await gameEvents.startQuestion(currentQuestionId, currentQuestionInstanceId!, sessionId);
    
    // Lancer l'audio automatiquement pour les blind tests AU POINT DE CUE 1 (extrait)
    if (question.question_type === 'blind_test' && currentTrack && audioPreloaded) {
      console.log('🎵 Lancement automatique de l\'audio depuis l\'extrait:', currentTrack.name);
      // Sauvegarder la position de départ du clip (CUE1)
      const cue1Time = currentTrack.cues[0]?.time || 0;
      setClipStartTime(cue1Time);
      // Le track est déjà chargé, on peut directement jouer l'extrait
      await audioEngine.playClip30s(300);
      toast({ title: '🚀 Question envoyée !', description: '🎵 Extrait lancé' });
    } else {
      toast({ title: '🚀 Question envoyée !', description: 'Chrono lancé (30s)' });
    }
  };

  const handleWrongAnswer = async (teamId: string) => {
    // Bloquer l'équipe qui a donné une mauvaise réponse
    const newBlockedTeams = [...blockedTeams, teamId];
    setBlockedTeams(newBlockedTeams);
    
    // Envoyer une notification à l'équipe qu'elle est bloquée
    await gameEvents.blockTeam(teamId);
    
    // Déduire les points de pénalité si définis
    const currentQ = questions.find(q => q.id === currentQuestionId);
    if (currentQ?.penalty_points > 0) {
      const { data: team } = await supabase
        .from('teams')
        .select('score')
        .eq('id', teamId)
        .single();

      if (team) {
        await supabase
          .from('teams')
          .update({ score: Math.max(0, team.score - currentQ.penalty_points) })
          .eq('id', teamId);
      }
    }
    
    // IMPORTANT : Synchroniser avec la DB pour que les clients puissent voir qu'ils sont bloqués
    await supabase.from('game_state').update({ 
      answer_result: 'incorrect',
      excluded_teams: newBlockedTeams
    }).eq('game_session_id', sessionId);
    
    // Supprimer TOUS les buzzers pour permettre aux autres équipes de re-buzzer
    // (seule l'équipe bloquée ne pourra plus buzzer via excluded_teams)
    if (currentQuestionId && sessionId) {
      await supabase
        .from('buzzer_attempts')
        .delete()
        .eq('question_id', currentQuestionId)
        .eq('game_session_id', sessionId);
      
      // Vider le state local des buzzers
      setBuzzers([]);
      previousBuzzersCount.current = 0;
      console.log('🧹 Tous les buzzers supprimés - équipe bloquée:', teamId);
    }
    
    // Réactiver le buzzer et relancer la musique pour les autres équipes (après 2s de délai)
    setTimeout(async () => {
      await gameEvents.resetBuzzer(currentQuestionInstanceId!);
      setBuzzerLocked(false);
      
      const currentQ = questions.find(x => x.id === currentQuestionId);
      
      // Relancer la musique et le timer pour blind test
      if (currentQ?.question_type === 'blind_test') {
        console.log('🔄 Relance de la musique après mauvaise réponse');
        
        // Le track est déjà chargé (currentTrack), on peut directement reprendre
        if (currentTrack && audioPositionWhenBuzzed > 0) {
          // Reprendre EXACTEMENT à la position sauvegardée dans l'EXTRAIT
          const cue1Time = currentTrack.cues[0]?.time || 0;
          const resumePosition = cue1Time + audioPositionWhenBuzzed;
          const endPosition = cue1Time + 30; // L'extrait doit toujours finir 30s après le CUE1
          
          console.log('🎵 Reprise audio depuis:', resumePosition, 's (CUE1:', cue1Time, '+ offset:', audioPositionWhenBuzzed, ') jusqu\'à', endPosition, 's');
          console.log('📊 Durée restante:', endPosition - resumePosition, 's');
          
          // Vérifier que la position de reprise est valide (pas déjà à la fin)
          if (resumePosition < endPosition - 1) {
            // Utiliser playFromTo pour gérer automatiquement l'arrêt à la fin de l'extrait
            await audioEngine.playFromTo(resumePosition, endPosition, 300);
          } else {
            console.warn('⚠️ Position de reprise trop proche de la fin, pas de reprise');
            // Pas de reprise audio = pas de timer non plus
            await supabase.from('game_state').update({ 
              is_buzzer_active: true, 
              answer_result: null,
              timer_active: false
            }).eq('game_session_id', sessionId);
            toast({ 
              title: '⏱️ Fin de l\'extrait', 
              description: 'Plus de temps pour buzzer' 
            });
            return;
          }
        } else {
          console.warn('⚠️ Pas de track ou position audio invalide, pas de reprise');
          await supabase.from('game_state').update({ 
            is_buzzer_active: true, 
            answer_result: null,
            timer_active: false
          }).eq('game_session_id', sessionId);
          return;
        }
        
        // Reprendre avec le timer sauvegardé au moment du buzz (PAS tout le timer)
        setTimerRemaining(timerWhenBuzzed);
        setTimerActive(true);
        
        // Mettre à jour le timer dans la DB avec le temps restant sauvegardé
        await supabase.from('game_state').update({ 
          is_buzzer_active: true, 
          answer_result: null,
          timer_active: true,
          timer_remaining: timerWhenBuzzed // Reprendre avec le temps sauvegardé
        }).eq('game_session_id', sessionId);
        
        console.log('⏱️ Reprise timer à', timerWhenBuzzed);
      } else {
        await supabase.from('game_state').update({ is_buzzer_active: true, answer_result: null }).eq('game_session_id', sessionId);
      }
      
      const penaltyPoints = currentQ?.penalty_points || 0;
      if (penaltyPoints > 0) {
        toast({ title: `❌ Mauvaise réponse - ${penaltyPoints} points perdus` });
      } else {
        toast({ title: '❌ Mauvaise réponse - Reprise' });
      }
    }, 2000);
  };

  const handleCorrectAnswer = async (teamId: string, points: number) => {
    // Récupérer le speed_bonus du buzzer avant de supprimer
    let speedBonus = 0;
    if (currentQuestionInstanceId) {
      const { data: buzzerData } = await supabase
        .from('buzzer_attempts')
        .select('speed_bonus')
        .eq('team_id', teamId)
        .eq('question_instance_id', currentQuestionInstanceId)
        .single();

      speedBonus = buzzerData?.speed_bonus || 0;
    }

    // Supprimer immédiatement les buzzers (state local ET DB)
    if (currentQuestionId && sessionId) {
      await supabase
        .from('buzzer_attempts')
        .delete()
        .eq('question_id', currentQuestionId)
        .eq('game_session_id', sessionId);

      setBuzzers([]); // Vider le state local immédiatement
    }

    // Attribuer les points à l'équipe (base + bonus de rapidité)
    const totalPoints = points + speedBonus;
    const { data: team } = await supabase
      .from('teams')
      .select('score')
      .eq('id', teamId)
      .single();

    if (team) {
      await supabase
        .from('teams')
        .update({ score: team.score + totalPoints })
        .eq('id', teamId);

      // Toast avec le bonus si applicable
      if (speedBonus > 0) {
        toast({
          title: `✅ Bonne réponse ! +${points} pts + 🚀 ${speedBonus} pts bonus rapidité`,
          duration: 3000
        });
      }
      
      // Afficher l'animation "Bonne réponse" et révéler la réponse en dessous
      await supabase.from('game_state').update({ 
        answer_result: 'correct',
        show_answer: true 
      }).eq('game_session_id', sessionId);
    }

    
    await supabase.from('game_state').update({ 
      answer_result: 'correct', 
      is_buzzer_active: false, 
      timer_active: false,
      timer_started_at: null,
      timer_duration: null
    }).eq('game_session_id', sessionId);
    setTimerActive(false);
    const q = questions.find(x => x.id === currentQuestionId);
    if (q?.audio_url && q.question_type === 'blind_test') { 
      // Le track est déjà chargé (currentTrack), on peut directement jouer la solution
      if (currentTrack) { 
        await audioEngine.playSolution(8, 300, 300); 
      } 
    }
    
    setTimeout(async () => { 
      await supabase.from('game_state').update({ answer_result: null }).eq('game_session_id', sessionId);
      toast({ title: `✅ Bonne réponse ! +${points} points` }); 
    }, 2000);
  };

  const toggleBuzzer = async () => {
    const newState = !gameState?.is_buzzer_active;
    await supabase.from('game_state').update({ is_buzzer_active: newState }).eq('game_session_id', sessionId);
    await gameEvents.toggleBuzzer(newState);
    if (newState) {
      // Réinitialiser complètement l'état des buzzers
      await gameEvents.resetBuzzer(currentQuestionInstanceId || '');
      setBuzzerLocked(false);
      setTimerWhenBuzzed(null);
      setAudioPositionWhenBuzzed(null);
      console.log('🔄 Buzzers réinitialisés complètement');
    }
    toast({ title: newState ? '⚡ Buzzers activés' : '🚫 Buzzers désactivés' });
  };

  const showRoundIntro = async () => {
    const round = rounds.find(r => r.id === currentRoundId);
    if (!round) return;
    await supabase.from('game_state').update({ show_round_intro: true, current_round_intro: round.id }).eq('game_session_id', sessionId);
    if (round.jingle_url) await audioEngine.playJingle(round.jingle_url);
    setTimeout(async () => { 
      await supabase.from('game_state').update({ show_round_intro: false }).eq('game_session_id', sessionId); 
    }, 6000);
    toast({ title: '🎬 Intro manche lancée' });
  };

  const showReveal = async () => {
    // Arrêter le timer et révéler la réponse
    await supabase.from('game_state').update({ 
      show_answer: true,
      timer_active: false,
      timer_started_at: null,
      timer_duration: null,
      timer_remaining: 0
    }).eq('game_session_id', sessionId);
    
    setTimerActive(false);
    setTimerRemaining(0);
    
    // Attribution automatique des points
    const currentQ = questions.find(q => q.id === currentQuestionId);
    if (!currentQ || !sessionId) {
      toast({ title: '👁️ Réponse révélée' });
      return;
    }

    if (currentQ.question_type === 'qcm' || currentQ.question_type === 'blind_test') {
      // Pour QCM et Blind Test : vérification simple et attribution automatique
      const { data: answers } = await supabase
        .from('team_answers')
        .select('*, teams(score), speed_bonus')
        .eq('question_id', currentQuestionId)
        .eq('game_session_id', sessionId);

      if (answers) {
        let totalBonus = 0;
        for (const answer of answers) {
          const isCorrect = answer.answer.toLowerCase().trim() === currentQ.correct_answer?.toLowerCase().trim();
          const basePoints = isCorrect ? (currentQ.points || 10) : 0;
          const speedBonus = isCorrect ? (answer.speed_bonus || 0) : 0;
          const totalPoints = basePoints + speedBonus;

          if (speedBonus > 0) totalBonus += speedBonus;

          // Mettre à jour la réponse
          await supabase
            .from('team_answers')
            .update({
              is_correct: isCorrect,
              points_awarded: totalPoints
            })
            .eq('id', answer.id);

          // Mettre à jour le score de l'équipe (inclut le bonus)
          if (isCorrect && answer.teams) {
            await supabase
              .from('teams')
              .update({ score: (answer.teams.score || 0) + totalPoints })
              .eq('id', answer.team_id);
          }

          // Envoyer l'événement de reveal à chaque équipe
          await gameEvents.revealAnswer(answer.team_id, isCorrect, currentQ.correct_answer);
        }

        const correctAnswers = answers.filter(a => a.answer.toLowerCase().trim() === currentQ.correct_answer?.toLowerCase().trim());
        const bonusMsg = totalBonus > 0 ? ` (🚀 +${totalBonus} pts bonus rapidité)` : '';
        toast({
          title: '👁️ Réponse révélée et points attribués',
          description: `${correctAnswers.length} bonne(s) réponse(s)${bonusMsg}`
        });
      }
    } else if (currentQ.question_type === 'text' || currentQ.question_type === 'free_text') {
      // Pour les textes libres : utiliser les validations de la régie
      const { data: answers } = await supabase
        .from('team_answers')
        .select('*, teams(score)')
        .eq('question_id', currentQuestionId)
        .eq('game_session_id', sessionId);

      if (answers) {
        let correctCount = 0;
        let pendingCount = 0;
        
        for (const answer of answers) {
          // Si la régie a déjà validé (is_correct n'est pas null)
          if (answer.is_correct !== null) {
            const isCorrect = answer.is_correct;
            const points = answer.points_awarded || 0;
            
            // Mettre à jour le score de l'équipe
            if (points !== 0 && answer.teams) {
              await supabase
                .from('teams')
                .update({ score: (answer.teams.score || 0) + points })
                .eq('id', answer.team_id);
            }

            // Envoyer l'événement de reveal à chaque équipe
            await gameEvents.revealAnswer(answer.team_id, isCorrect, currentQ.correct_answer);
            
            if (isCorrect) correctCount++;
          } else {
            pendingCount++;
          }
        }
        
        if (pendingCount > 0) {
          toast({ 
            title: '⚠️ Réponses non validées', 
            description: `${pendingCount} réponse(s) non validée(s). Validez-les avant de révéler.`,
            variant: 'destructive'
          });
          return;
        } else {
          toast({ 
            title: '👁️ Réponse révélée et points attribués', 
            description: `${correctCount} bonne(s) réponse(s)`
          });
        }
      }
    } else {
      toast({ title: '👁️ Réponse révélée' });
    }
  };

  const hideReveal = async () => {
    await supabase.from('game_state').update({ 
      show_answer: false,
      timer_remaining: 0  // Reset à 0
    }).eq('game_session_id', sessionId);
    toast({ title: '🙈 Réponse cachée' });
  };

  const activateTransition = async () => {
    if (!sessionId) return;
    
    console.log('🔄 Activation écran de transition');
    
    // Arrêter tout
    audioEngine.stop();
    setTimerActive(false);
    setBuzzerLocked(true);
    
    // Purger les données de la question précédente
    await supabase
      .from('buzzer_attempts')
      .delete()
      .eq('game_session_id', sessionId);
    
    if (currentQuestionInstanceId) {
      await supabase
        .from('team_answers')
        .delete()
        .eq('question_instance_id', currentQuestionInstanceId);
    }
    
    // Réinitialiser les états locaux
    setBuzzers([]);
    setBlockedTeams([]);
    previousBuzzersCount.current = 0;
    
    // Activer l'écran de transition (sans message d'annonce)
    await supabase.from('game_state').update({
      current_question_id: null,
      current_question_instance_id: null,
      show_waiting_screen: true,
      show_leaderboard: false,
      show_answer: false,
      answer_result: null,
      timer_active: false,
      is_buzzer_active: false,
      excluded_teams: [],
      announcement_text: null
    }).eq('game_session_id', sessionId);
    
    toast({ 
      title: '✨ Transition activée', 
      description: 'Système purgé, prêt pour la prochaine question'
    });
  };

  const showLeaderboard = async () => {
    await supabase.from('game_state').update({ show_leaderboard: true }).eq('game_session_id', sessionId);
    toast({ title: '🏆 Classement affiché' });
  };

  const hideLeaderboard = async () => {
    await supabase.from('game_state').update({ show_leaderboard: false }).eq('game_session_id', sessionId);
  };

  const toggleWaitingScreen = async () => {
    const newValue = !gameState?.show_waiting_screen;
    
    if (newValue) {
      // En passant en mode attente, effacer la question en cours
      await supabase.from('game_state').update({ 
        show_waiting_screen: true,
        current_question_id: null,
        show_answer: false,
        timer_active: false,
        timer_remaining: 0,
        is_buzzer_active: false
      }).eq('game_session_id', sessionId);
      setCurrentQuestionId(null);
      setTimerActive(false);
    } else {
      // En sortant du mode attente, juste désactiver l'écran
      await supabase.from('game_state').update({ 
        show_waiting_screen: false 
      }).eq('game_session_id', sessionId);
    }
    
    toast({ title: newValue ? '⏸️ Écran d\'attente activé' : '▶️ Retour au jeu' });
  };

  const toggleWelcomeScreen = async () => {
    const newValue = !gameState?.show_welcome_screen;
    
    // Désactiver les autres écrans
    await supabase.from('game_state').update({ 
      show_welcome_screen: newValue,
      show_team_connection_screen: false,
      show_waiting_screen: false,
      current_question_id: null,
      show_answer: false,
      timer_active: false,
      is_buzzer_active: false
    }).eq('game_session_id', sessionId);
    
    toast({ title: newValue ? '🏠 Écran d\'accueil activé' : '▶️ Retour au jeu' });
  };

  const toggleTeamConnectionScreen = async () => {
    const newValue = !gameState?.show_team_connection_screen;
    
    // Désactiver les autres écrans
    await supabase.from('game_state').update({ 
      show_team_connection_screen: newValue,
      show_welcome_screen: false,
      show_waiting_screen: false,
      current_question_id: null,
      show_answer: false,
      timer_active: false,
      is_buzzer_active: false
    }).eq('game_session_id', sessionId);
    
    toast({ title: newValue ? '📡 Écran de connexion activé' : '▶️ Retour au jeu' });
  };

  const toggleSponsorsScreen = async () => {
    const newValue = !gameState?.show_sponsors_screen;
    
    await supabase.from('game_state').update({ 
      show_sponsors_screen: newValue,
      show_welcome_screen: false,
      show_waiting_screen: false,
      show_thanks_screen: false,
      current_question_id: null,
      show_answer: false,
      timer_active: false,
      is_buzzer_active: false
    }).eq('game_session_id', sessionId);
    
    toast({ title: newValue ? '🏆 Écran sponsors activé' : '▶️ Retour au jeu' });
  };

  const toggleThanksScreen = async () => {
    const newValue = !gameState?.show_thanks_screen;
    
    await supabase.from('game_state').update({ 
      show_thanks_screen: newValue,
      show_welcome_screen: false,
      show_waiting_screen: false,
      show_sponsors_screen: false,
      current_question_id: null,
      show_answer: false,
      timer_active: false,
      is_buzzer_active: false
    }).eq('game_session_id', sessionId);
    
    toast({ title: newValue ? '❤️ Écran de remerciements activé' : '▶️ Retour au jeu' });
  };

  /**
   * Fonction centralisée pour changer d'écran
   * Garantit qu'un seul écran est actif à la fois
   */
  const switchToScreen = async (screenType:
    'GAME' | 'WELCOME' | 'TEAM_CONNECTION' | 'WAITING' | 'SPONSORS' | 'THANKS' | 'LEADERBOARD'
  ) => {
    if (!sessionId) return;

    // Définir l'état de base : tous les écrans désactivés
    const baseState = {
      show_welcome_screen: false,
      show_team_connection_screen: false,
      show_waiting_screen: false,
      show_sponsors_screen: false,
      show_thanks_screen: false,
      show_leaderboard: false,
      announcement_text: null,
    };

    // Si on revient au jeu, ne pas toucher la question en cours
    if (screenType === 'GAME') {
      await supabase.from('game_state').update(baseState).eq('game_session_id', sessionId);
      toast({ title: '🎮 Retour au jeu', description: 'Question en cours affichée' });
      return;
    }

    // Pour les autres écrans, activer celui demandé et effacer la question
    const screenStates = {
      WELCOME: { ...baseState, show_welcome_screen: true },
      TEAM_CONNECTION: { ...baseState, show_team_connection_screen: true },
      WAITING: { ...baseState, show_waiting_screen: true },
      SPONSORS: { ...baseState, show_sponsors_screen: true },
      THANKS: { ...baseState, show_thanks_screen: true },
      LEADERBOARD: { ...baseState, show_leaderboard: true },
    };

    const newState = {
      ...screenStates[screenType],
      current_question_id: null,
      show_answer: false,
      timer_active: false,
      is_buzzer_active: false
    };

    await supabase.from('game_state').update(newState).eq('game_session_id', sessionId);

    const messages = {
      WELCOME: { title: '🏠 Écran d\'accueil', description: 'Affichage de l\'écran d\'accueil' },
      TEAM_CONNECTION: { title: '📡 Connexion équipes', description: 'Affichage des équipes connectées' },
      WAITING: { title: '⏸️ Écran d\'attente', description: 'Pause avec sponsors' },
      SPONSORS: { title: '🏆 Écran sponsors', description: 'Affichage des sponsors' },
      THANKS: { title: '❤️ Remerciements', description: 'Écran de remerciements' },
      LEADERBOARD: { title: '🏆 Classement', description: 'Affichage du classement' },
    };

    if (screenType in messages) {
      toast(messages[screenType as keyof typeof messages]);
    }
  };

  /**
   * Obtenir l'écran actuellement actif
   */
  const getActiveScreen = (): string => {
    if (!gameState) return 'AUCUN';
    if (gameState.show_welcome_screen) return 'ACCUEIL';
    if (gameState.show_team_connection_screen) return 'CONNEXION';
    if (gameState.show_waiting_screen) return 'ATTENTE';
    if (gameState.show_sponsors_screen) return 'SPONSORS';
    if (gameState.show_thanks_screen) return 'REMERCIEMENTS';
    if (gameState.show_leaderboard) return 'CLASSEMENT';
    if (gameState.show_round_intro) return 'INTRO MANCHE';
    if (gameState.final_mode) return 'FINALE';
    if (gameState.current_question_id) return 'QUESTION';
    return 'AUCUN';
  };

  const resetSession = async () => {
    if (!sessionId || !confirm('Réinitialiser toute la session ? Cela supprimera tous les buzzers, réponses et réinitialisera les scores.')) return;
    
    // Supprimer tous les buzzers
    await supabase.from('buzzer_attempts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Supprimer toutes les réponses
    await supabase.from('team_answers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Réinitialiser les scores
    await supabase.from('teams').update({ score: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Réinitialiser le game_state et forcer le changement de question
    await supabase.from('game_state').update({ 
      current_question_id: null, 
      current_question_instance_id: null, 
      current_round_id: null, 
      is_buzzer_active: false, 
      timer_active: false, 
      show_leaderboard: false,
      show_waiting_screen: false,
      show_answer: false,
      answer_result: null,
      excluded_teams: []
    }).eq('game_session_id', sessionId);
    
    setCurrentQuestionId(null);
    setCurrentQuestionInstanceId(null);
    setCurrentRoundId(null);
    setBuzzerLocked(false);
    setTimerActive(false);
    setTimerRemaining(30);
    
    // Notifier tous les clients pour qu'ils réinitialisent leur état
    await gameEvents.resetAll();
    
    loadTeams();
    toast({ title: '🔄 Session réinitialisée' });
  };

  const adjustTeamScore = async (teamId: string, delta: number) => {
    const team = connectedTeams.find(t => t.id === teamId);
    if (!team) return;
    const newScore = Math.max(0, (team.score || 0) + delta);
    await supabase.from('teams').update({ score: newScore }).eq('id', teamId);
    loadTeams();
    toast({ title: `${delta > 0 ? '+' : ''}${delta} pts pour ${team.name}` });
  };

  const resetAllScores = async () => {
    if (!confirm('Réinitialiser tous les scores des équipes ?')) return;
    await supabase.from('teams').update({ score: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
    loadTeams();
    toast({ title: '🔄 Scores réinitialisés' });
  };

  const disconnectTeam = async (teamId: string) => {
    await gameEvents.kickTeam(teamId);
    toast({ title: '👋 Équipe déconnectée' });
  };

  const disconnectAll = async () => {
    if (!confirm('Déconnecter toutes les équipes ?')) return;
    await gameEvents.kickAll();
    toast({ title: '👋 Toutes les équipes déconnectées' });
  };

  const resetTeamConnectionBlock = async (teamId: string) => {
    const team = connectedTeams.find(t => t.id === teamId);
    if (!team) return;
    
    // Réinitialiser le blocage de connexion
    await supabase.from('teams').update({ 
      connected_device_id: null,
      last_seen_at: null,
      is_active: false
    }).eq('id', teamId);
    
    loadTeams();
    toast({ 
      title: '🔓 Blocage réinitialisé', 
      description: `${team.name} peut se reconnecter immédiatement` 
    });
  };

  const roundQuestions = currentRoundId ? questions.filter(q => q.round_id === currentRoundId) : [];
  const connectedCount = connectedTeams.filter(t => t.is_connected).length;
  
  // Statistiques en temps réel
  const activeBuzzersCount = buzzers.filter(b => !blockedTeams.includes(b.team_id)).length;
  const totalScore = connectedTeams.reduce((sum, t) => sum + (t.score || 0), 0);
  const yellowCardsCount = connectedTeams.reduce((sum, t) => sum + (t.yellow_cards || 0), 0);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen bg-gradient-to-br from-background via-muted/30 to-background flex flex-col overflow-hidden">
        {/* Header - Amélioré avec meilleurs contrastes */}
        <div className="p-3 border-b border-border bg-card backdrop-blur-sm shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Arena TV
              </h1>
              
              {/* Statistiques en temps réel */}
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant={connectedCount > 0 ? "default" : "secondary"} className="gap-1.5 font-semibold transition-all hover:scale-105">
                      <Users className="h-3 w-3" />
                      {connectedCount}/{connectedTeams.length}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Équipes connectées</TooltipContent>
                </Tooltip>
                
                {totalScore > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="gap-1.5 bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400 transition-all hover:scale-105">
                        <Trophy className="h-3 w-3" />
                        {totalScore} pts
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Score total de la session</TooltipContent>
                  </Tooltip>
                )}
                
                {activeBuzzersCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="gap-1.5 bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 animate-pulse">
                        <Activity className="h-3 w-3" />
                        {activeBuzzersCount}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Buzzers actifs</TooltipContent>
                  </Tooltip>
                )}
                
                {yellowCardsCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="gap-1.5 bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400">
                        <AlertCircle className="h-3 w-3" />
                        {yellowCardsCount} 🟨
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Cartons jaunes actifs</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
            
            {/* Centre - Titre de session avec badge statut */}
            <div className="flex-1 text-center flex items-center justify-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                {currentSession?.name || 'Aucune session'}
              </h2>
              {sessionId && (
                <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400">
                  ● En direct
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => window.location.href = '/'}>
                    <Home className="h-3 w-3 mr-1" />
                    Menu
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Retour au menu principal</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="destructive" onClick={resetSession}>
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Réinitialiser toute la session</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

      {/* Main content - Layout réorganisé en 3 colonnes */}
      <div className="flex-1 overflow-hidden grid grid-cols-12 gap-2 p-2">
        {/* Colonne gauche - Questions + Contrôles TV (3 cols) */}
        <div className="col-span-3 flex flex-col gap-2 overflow-hidden">
          {/* Sélection de manche - Dropdown compact */}
          <Card className="flex-shrink-0 p-2">
            <select 
              className="w-full p-1.5 text-xs border rounded bg-background"
              value={currentRoundId || ''}
              onChange={(e) => setCurrentRoundId(e.target.value)}
            >
              <option value="">Sélectionner une manche...</option>
              {rounds.map(r => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
          </Card>

          {/* Questions - Tableau compact */}
          <Card className="flex-1 overflow-hidden flex flex-col min-h-0 transition-all hover:shadow-md">
            <div className="p-2 border-b flex-shrink-0 bg-gradient-to-r from-muted/50 to-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  Questions ({roundQuestions.length})
                </h3>
                {currentQuestionId && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400">
                    Active
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <tbody>
                  {roundQuestions.map(q => {
                    const typeIcons: Record<string, string> = {
                      'blind_test': '🎵',
                      'qcm': '✓',
                      'free_text': '✍️'
                    };
                    const typeColors: Record<string, string> = {
                      'blind_test': 'border-l-green-500 bg-green-500/5',
                      'qcm': 'border-l-blue-500 bg-blue-500/5',
                      'free_text': 'border-l-orange-500 bg-orange-500/5'
                    };
                    const typeBadgeColors: Record<string, string> = {
                      'blind_test': 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400',
                      'qcm': 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400',
                      'free_text': 'bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400'
                    };
                    const icon = typeIcons[q.question_type] || '?';
                    const borderColor = typeColors[q.question_type] || '';
                    const badgeColor = typeBadgeColors[q.question_type] || '';
                    const isActive = currentQuestionId === q.id;

                    return (
                      <tr
                        key={q.id}
                        className={`border-b border-l-4 hover:bg-muted/50 cursor-pointer transition-all ${borderColor} ${isActive ? 'bg-primary/10 shadow-sm font-semibold' : ''}`}
                        onClick={() => startQuestion(q)}
                      >
                        <td className="p-2 w-8 text-center">
                          <span className={`text-base ${isActive ? 'animate-pulse scale-110' : ''}`}>{icon}</span>
                        </td>
                        <td className="p-2">
                          <div className={`truncate ${isActive ? 'font-bold' : 'font-medium'}`}>{q.question_text}</div>
                        </td>
                        <td className="p-2 w-14 text-right">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${isActive ? 'bg-primary text-primary-foreground border-primary' : badgeColor}`}>
                            {q.points}p
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Contrôles de diffusion - REFONTE COMPLÈTE */}
          <Card className="flex-shrink-0 p-3 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-purple-500/10 border-purple-500/30 shadow-lg">
            {/* Indicateur d'écran actif - GROS ET VISIBLE */}
            <div className="mb-3 p-3 rounded-lg bg-gradient-to-r from-primary/20 to-secondary/20 border-2 border-primary/30">
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">ÉCRAN ACTIF</div>
              <div className="text-lg font-black text-primary">
                📺 {getActiveScreen()}
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Groupe: Contrôle Principal */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Principal</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    size="sm"
                    variant={getActiveScreen() === 'QUESTION' || getActiveScreen() === 'AUCUN' ? 'default' : 'outline'}
                    onClick={() => switchToScreen('GAME')}
                    className="h-9 text-xs font-semibold"
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    Jeu
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open('/screen', '_blank')}
                    className="h-9 text-xs hover:bg-accent"
                  >
                    <Monitor className="h-3.5 w-3.5 mr-1.5" />
                    Ouvrir TV
                  </Button>
                </div>
              </div>

              {/* Groupe: Écrans Utilitaires */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Utilitaires</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    size="sm"
                    variant={getActiveScreen() === 'ATTENTE' ? 'default' : 'outline'}
                    onClick={() => switchToScreen('WAITING')}
                    className={`h-9 text-xs ${getActiveScreen() === 'ATTENTE' ? 'bg-slate-600' : ''}`}
                  >
                    <Pause className="h-3.5 w-3.5 mr-1.5" />
                    Pause
                  </Button>

                  <Button
                    size="sm"
                    variant={getActiveScreen() === 'CLASSEMENT' ? 'default' : 'outline'}
                    onClick={() => switchToScreen('LEADERBOARD')}
                    className={`h-9 text-xs ${getActiveScreen() === 'CLASSEMENT' ? 'bg-yellow-600' : ''}`}
                  >
                    <Trophy className="h-3.5 w-3.5 mr-1.5" />
                    Classement
                  </Button>
                </div>
              </div>

              {/* Groupe: Écrans Spéciaux */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Écrans Spéciaux</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    size="sm"
                    variant={getActiveScreen() === 'ACCUEIL' ? 'default' : 'outline'}
                    onClick={() => switchToScreen('WELCOME')}
                    className={`h-9 text-xs ${getActiveScreen() === 'ACCUEIL' ? 'bg-blue-600' : ''}`}
                  >
                    <Home className="h-3.5 w-3.5 mr-1.5" />
                    Accueil
                  </Button>

                  <Button
                    size="sm"
                    variant={getActiveScreen() === 'CONNEXION' ? 'default' : 'outline'}
                    onClick={() => switchToScreen('TEAM_CONNECTION')}
                    className={`h-9 text-xs ${getActiveScreen() === 'CONNEXION' ? 'bg-cyan-600' : ''}`}
                  >
                    <Wifi className="h-3.5 w-3.5 mr-1.5" />
                    Connexion
                  </Button>

                  <Button
                    size="sm"
                    variant={getActiveScreen() === 'SPONSORS' ? 'default' : 'outline'}
                    onClick={() => switchToScreen('SPONSORS')}
                    className={`h-9 text-xs ${getActiveScreen() === 'SPONSORS' ? 'bg-amber-600' : ''}`}
                  >
                    <Award className="h-3.5 w-3.5 mr-1.5" />
                    Sponsors
                  </Button>

                  <Button
                    size="sm"
                    variant={getActiveScreen() === 'REMERCIEMENTS' ? 'default' : 'outline'}
                    onClick={() => switchToScreen('THANKS')}
                    className={`h-9 text-xs ${getActiveScreen() === 'REMERCIEMENTS' ? 'bg-pink-600' : ''}`}
                  >
                    <Heart className="h-3.5 w-3.5 mr-1.5" />
                    Merci
                  </Button>
                </div>
              </div>

              {/* Groupe: Contrôle Jeu */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Jeu</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 text-xs hover:bg-purple-500/20 border-purple-500/30"
                        onClick={showRoundIntro}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Intro Manche
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Afficher intro de la manche</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Toggle
                        size="sm"
                        pressed={gameState?.is_buzzer_active}
                        onPressedChange={toggleBuzzer}
                        className="h-9 text-xs font-semibold data-[state=on]:bg-green-600 data-[state=on]:text-white"
                      >
                        <Radio className="h-3.5 w-3.5 mr-1.5" />
                        Buzzer
                      </Toggle>
                    </TooltipTrigger>
                    <TooltipContent>Activer/Désactiver les buzzers</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={activateTransition}
                        className="h-9 text-xs bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30"
                      >
                        ✨ Transition
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Purger et préparer la prochaine question</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Colonne centrale - Réponses/Buzzers + Timer/Audio (6 cols) */}
        <div className="col-span-6 flex flex-col gap-2 overflow-hidden">
          {/* Réponses et buzzers - REMONTÉ EN PREMIER */}
          <Card className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="p-2 border-b flex-shrink-0 bg-muted/30 flex items-center justify-between">
              <h3 className="text-xs font-bold">
                {(() => {
                  const currentQ = questions.find(q => q.id === currentQuestionId);
                  if (!currentQ) return 'Réponses';
                  const typeNames: Record<string, string> = {
                    'blind_test': 'Buzzers',
                    'qcm': 'Réponses QCM',
                    'free_text': 'Réponses libres'
                  };
                  return typeNames[currentQ.question_type] || 'Réponses';
                })()}
              </h3>
              
              {/* Bouton Reveal */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle 
                    size="sm"
                    pressed={gameState?.show_answer}
                    onPressedChange={() => gameState?.show_answer ? hideReveal() : showReveal()}
                    className="h-7 text-xs data-[state=on]:bg-amber-600 data-[state=on]:text-white data-[state=on]:shadow-sm transition-all"
                  >
                    👁️ Révéler
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Afficher/masquer la réponse</TooltipContent>
              </Tooltip>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {(() => {
                const currentQ = questions.find(q => q.id === currentQuestionId);
                const questionType = currentQ?.question_type;

                if (questionType === 'blind_test') {
                  return (
                    <>
                      <BuzzerMonitor 
                        currentQuestionId={currentQuestionId} 
                        gameState={gameState} 
                        buzzers={buzzers}
                        questionPoints={currentQ?.points || 10}
                        onCorrectAnswer={handleCorrectAnswer}
                        onWrongAnswer={handleWrongAnswer}
                        blockedTeams={blockedTeams}
                      />
                      {blockedTeams.length > 0 && (
                        <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded">
                          <h4 className="text-xs font-bold text-destructive flex items-center gap-1 mb-1">
                            <X className="h-3 w-3" />
                            Bloqués ({blockedTeams.length})
                          </h4>
                          <div className="space-y-1">
                            {blockedTeams.map(teamId => {
                              const team = connectedTeams.find(t => t.id === teamId);
                              return team ? (
                                <div 
                                  key={teamId}
                                  className="flex items-center gap-2 p-1 rounded bg-destructive/20"
                                >
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
                                  <span className="font-medium text-xs">{team.name}</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  );
                }

                if (questionType === 'qcm') {
                  return (
                    <QCMAnswersDisplay 
                      currentQuestion={currentQ} 
                      gameState={gameState} 
                    />
                  );
                }

                if (questionType === 'free_text') {
                  return (
                    <TextAnswersDisplay 
                      currentQuestionId={currentQuestionId} 
                      gameState={gameState}
                      currentQuestion={currentQ}
                    />
                  );
                }

                return (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                    Sélectionnez et lancez une question
                  </div>
                );
              })()}
            </div>
          </Card>

          {/* Question en cours + Timer + Audio */}
          {currentQuestionId && (
            <Card className="flex-shrink-0 p-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex-1">
                  {questions.find(q => q.id === currentQuestionId)?.question_type === 'blind_test' && (
                    audioPreloading ? (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
                        ⏳ Chargement...
                      </Badge>
                    ) : audioPreloaded ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                        ✅ Audio prêt
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">
                        ⚠️ Audio non chargé
                      </Badge>
                    )
                  )}
                </div>
                <Button 
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 h-8"
                  onClick={sendQuestionToClients}
                  disabled={questions.find(q => q.id === currentQuestionId)?.question_type === 'blind_test' && !audioPreloaded}
                >
                  🚀 Envoyer
                </Button>
              </div>
            </Card>
          )}

          {/* Timer et Audio - Section AMÉLIORÉE */}
          <Card className={`flex-shrink-0 p-3 bg-gradient-to-br border-2 transition-all ${
            currentQuestionId && timerRemaining > 0 && timerRemaining <= 5 && timerActive
              ? 'from-red-500/20 via-orange-500/20 to-red-500/20 border-red-500/50 shadow-lg shadow-red-500/20 animate-pulse'
              : 'from-blue-500/5 via-cyan-500/5 to-blue-500/5 border-blue-500/20'
          }`}>
            {currentQuestionId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-4 w-4 ${
                      timerRemaining > 0 && timerRemaining <= 5 && timerActive
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`} />
                    <h3 className={`text-sm font-bold ${
                      timerRemaining > 0 && timerRemaining <= 5 && timerActive
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      Chronomètre
                      {timerRemaining > 0 && timerRemaining <= 5 && timerActive && (
                        <span className="ml-2 text-xs animate-pulse">⚠️ {timerRemaining}s</span>
                      )}
                      {timerRemaining <= 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">(Terminé)</span>
                      )}
                    </h3>
                  </div>

                  {/* Contrôles Timer */}
                  <div className="flex gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setTimerActive(!timerActive);
                            supabase.from('game_state').update({
                              timer_active: !timerActive
                            }).eq('game_session_id', sessionId);
                          }}
                          disabled={timerRemaining <= 0}
                        >
                          {timerActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{timerActive ? 'Pause (Espace)' : 'Reprendre (Espace)'}</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            const duration = rounds.find(r => r.id === currentRoundId)?.timer_duration || 30;
                            setTimerRemaining(duration);
                            setTimerActive(false);
                            supabase.from('game_state').update({
                              timer_remaining: duration,
                              timer_active: false
                            }).eq('game_session_id', sessionId);
                            toast({ title: '🔄 Timer réinitialisé' });
                          }}
                        >
                          <RotateCw className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reset timer (R)</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <TimerBar
                  timerRemaining={timerRemaining}
                  timerDuration={rounds.find(r => r.id === currentRoundId)?.timer_duration || 30}
                  timerActive={timerActive}
                  questionType={questions.find(q => q.id === currentQuestionId)?.question_type}
                />
              </div>
            )}
            
            {audioTracks.length > 0 && (
              <div className={currentQuestionId && timerRemaining > 0 ? "mt-3 pt-3 border-t border-border" : ""}>
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400">Audio</h3>
                  {currentTrack && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/10 border-purple-500/30">
                      {currentTrack.name}
                    </Badge>
                  )}
                </div>
                <AudioDeck 
                  tracks={currentTrack ? [currentTrack] : audioTracks}
                  onTrackChange={(track) => setCurrentTrack(track)}
                />
              </div>
            )}
          </Card>
        </div>

        {/* Colonne droite - Équipes et Finale (3 cols) */}
        <div className="col-span-3 flex flex-col gap-2 overflow-hidden">
          <Tabs defaultValue="equipes" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full flex-shrink-0 grid grid-cols-2">
              <TabsTrigger value="equipes" className="text-xs">Équipes</TabsTrigger>
              <TabsTrigger value="finale" className="text-xs">Finale</TabsTrigger>
            </TabsList>

            <TabsContent value="equipes" className="flex-1 overflow-hidden mt-2">
              <Card className="h-full overflow-hidden flex flex-col">
                <div className="p-2 border-b flex justify-between items-center flex-shrink-0">
                  <h3 className="font-bold text-xs">Équipes</h3>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={resetAllScores}>Reset</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={disconnectAll}>Kick</Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {connectedTeams.map(t => (
                    <div 
                      key={t.id} 
                      className="flex items-center gap-1.5 p-1.5 border rounded bg-muted/30 transition-all hover:bg-muted/50 hover:scale-[1.02] hover:shadow-sm"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all ${t.is_connected ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-gray-400'}`} />
                      <div className="w-6 h-6 rounded-full flex-shrink-0 ring-2 ring-background flex items-center justify-center text-xs" style={{ backgroundColor: t.color }}>
                        {t.avatar || '🎵'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs truncate flex items-center gap-1">
                          {t.name}
                          {t.yellow_cards > 0 && (
                            <span className="text-yellow-500 animate-pulse">
                              {'🟨'.repeat(t.yellow_cards)}
                            </span>
                          )}
                          {t.is_excluded && (
                            <Badge variant="destructive" className="text-[8px] px-1 py-0 ml-1">EXCLU</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">{t.score} pts</span>
                          {t.score > 0 && (
                            <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
                          )}
                        </div>
                      </div>
                      <div className="flex gap-0.5 flex-shrink-0">
                        {t.is_excluded ? (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-5 px-2 text-xs text-green-600 font-bold" 
                            onClick={async () => {
                              await supabase.from('teams').update({ 
                                is_excluded: false,
                                yellow_cards: 0
                              }).eq('id', t.id);
                              toast({ title: '✅ Équipe réintégrée', description: 'Les cartons ont été retirés' });
                            }}
                            title="Réintégrer l'équipe"
                          >
                            ✅ Réintégrer
                          </Button>
                        ) : (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                                  onClick={async () => {
                                    const newCount = Math.max(0, (t.yellow_cards || 0) - 1);
                                    await supabase.from('teams').update({ yellow_cards: newCount }).eq('id', t.id);
                                    toast({ title: newCount === 0 ? '✅ Cartons retirés' : `🟨 ${newCount} carton(s)` });
                                  }}
                                  disabled={!t.yellow_cards || t.yellow_cards === 0}
                                >
                                  ↓
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Retirer carton</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-xs text-yellow-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-yellow-100 dark:hover:bg-yellow-900/20"
                                  onClick={async () => {
                                    const newCount = (t.yellow_cards || 0) + 1;

                                    if (newCount >= 2) {
                                      // Exclure l'équipe DÉFINITIVEMENT
                                      await supabase.from('teams').update({
                                        yellow_cards: newCount,
                                        is_excluded: true,
                                        is_active: false,
                                        connected_device_id: null
                                      }).eq('id', t.id);

                                      // Kick l'équipe immédiatement
                                      await gameEvents.kickTeam(t.id);

                                      toast({
                                        title: '🟥 Équipe EXCLUE définitivement !',
                                        description: `${t.name} a reçu 2 cartons jaunes et ne peut plus se reconnecter`,
                                        variant: 'destructive'
                                      });
                                    } else {
                                      await supabase.from('teams').update({ yellow_cards: newCount }).eq('id', t.id);
                                      toast({ title: `🟨 Carton jaune donné (${newCount}/2)` });
                                    }
                                  }}
                                  disabled={t.is_excluded}
                                >
                                  🟨
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Donner carton jaune</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-xs hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600" onClick={() => adjustTeamScore(t.id, -1)}>-</Button>
                              </TooltipTrigger>
                              <TooltipContent>-1 point</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-xs hover:bg-green-100 dark:hover:bg-green-900/20 text-green-600" onClick={() => adjustTeamScore(t.id, 1)}>+</Button>
                              </TooltipTrigger>
                              <TooltipContent>+1 point</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-xs hover:bg-blue-100 dark:hover:bg-blue-900/20" onClick={() => resetTeamConnectionBlock(t.id)}>🔓</Button>
                              </TooltipTrigger>
                              <TooltipContent>Débloquer appareil</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-xs hover:bg-destructive hover:text-destructive-foreground" onClick={() => disconnectTeam(t.id)}>X</Button>
                              </TooltipTrigger>
                              <TooltipContent>Déconnecter</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="finale" className="flex-1 overflow-y-auto mt-2 space-y-2">
              <Card className="p-2">
                <h3 className="font-bold text-xs mb-2 flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  Mode Finale
                </h3>
                <FinalManager sessionId={sessionId!} gameState={gameState} />
              </Card>
              
              <Card className="p-2">
                <h3 className="font-bold text-xs mb-2">Vote public</h3>
                <PublicVoteControl
                  showPublicVotes={showPublicVotes}
                  finalId={gameState?.final_id}
                  currentQuestionInstanceId={currentQuestionInstanceId}
                />
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Moniteur des demandes d'aide */}
      <HelpRequestMonitor sessionId={sessionId} />
      
      <Toaster />
    </div>
    </TooltipProvider>
  );
};

export default Regie;
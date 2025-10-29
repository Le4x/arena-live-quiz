/**
 * Régie TV - Interface de contrôle pro
 * Layout optimisé 1366×768 sans scroll vertical
 */

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Monitor, RotateCcw, Eye, EyeOff, Trophy, Sparkles, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { getAudioEngine, type Track } from "@/lib/audio/AudioEngine";
import { gameEvents } from "@/lib/runtime/GameEvents";
import { ControlBar } from "@/components/regie/ControlBar";
import type { SoundWithCues } from "@/pages/AdminSounds";
import { QCMAnswersDisplay } from "@/components/QCMAnswersDisplay";
import { TextAnswersDisplay } from "@/components/TextAnswersDisplay";
import { BuzzerMonitor } from "@/components/BuzzerMonitor";
import { AudioDeck } from "@/components/audio/AudioDeck";

const Regie = () => {
  const { toast } = useToast();
  const audioEngine = getAudioEngine();
  const previousBuzzersCount = useRef(0);
  
  const [sessionId, setSessionId] = useState<string | null>(null);
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

  useEffect(() => {
    loadActiveSession();
    loadRounds();
    loadQuestions();
    loadTeams();
    loadAudioTracks();

    // Abonnement présence temps réel
    const teamsChannel = supabase.channel('regie-teams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, loadTeams)
      .subscribe();

    // Abonnement buzzers GLOBAL
    const buzzersChannel = supabase.channel('regie-buzzers-global')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'buzzer_attempts' 
      }, (payload) => {
        console.log('🔔 Regie: Buzzer INSERT détecté', payload);
        loadBuzzers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(buzzersChannel);
    };
  }, []);

  // Recharger les buzzers quand la question change
  useEffect(() => {
    console.log('📌 Regie: Question changed, reloading buzzers', { currentQuestionId, sessionId });
    loadBuzzers();
  }, [currentQuestionId, sessionId]);

  // Polling de secours pour les buzzers (500ms pour réactivité sans surcharge)
  useEffect(() => {
    if (!currentQuestionId || !sessionId) return;
    
    const interval = setInterval(() => {
      console.log('🔄 Regie: Polling buzzers');
      loadBuzzers();
    }, 500);
    
    return () => clearInterval(interval);
  }, [currentQuestionId, sessionId]);

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
      
      // Lock au premier buzzer + ARRÊTER LE TIMER IMMÉDIATEMENT pour blind test
      const currentQ = questions.find(q => q.id === currentQuestionId);
      if (previousBuzzersCount.current === 0 && buzzers.length === 1 && !buzzerLocked && gameState?.is_buzzer_active && currentQ?.question_type === 'blind_test') {
        console.log('🛑 PREMIER BUZZER - Arrêt timer et musique, timer était à', timerRemaining);
        console.log('🎵 Question type:', currentQ?.question_type, 'Audio URL:', currentQ?.audio_url);
        
        // Sauvegarder le timer et la position audio avant de l'arrêter
        setTimerWhenBuzzed(timerRemaining);
        const currentPos = audioEngine.getPosition();
        setAudioPositionWhenBuzzed(currentPos);
        console.log('💾 Position audio sauvegardée:', currentPos);
        
        setBuzzerLocked(true);
        setTimerActive(false);
        
        // Arrêter la musique immédiatement
        console.log('🎵 Arrêt audio avec fade...');
        audioEngine.stopWithFade(150); // Fade rapide
        
        // Mettre à jour le timer dans la DB IMMÉDIATEMENT
        if (sessionId) {
          supabase.from('game_state').update({ 
            timer_active: false,
            timer_remaining: timerRemaining
          }).eq('game_session_id', sessionId).then(() => {
            console.log('✅ DB mise à jour: timer_active=false, timer_remaining=', timerRemaining);
          });
        }
      }
    }
    
    // Mettre à jour le compteur
    previousBuzzersCount.current = buzzers.length;
  }, [buzzers]);

  const loadActiveSession = async () => {
    const { data } = await supabase.from('game_sessions').select('*').eq('status', 'active').single();
    if (data) setSessionId(data.id);
  };

  const loadGameState = async () => {
    if (!sessionId) return;
    const { data } = await supabase.from('game_state').select('*').eq('game_session_id', sessionId).single();
    if (data) setGameState(data);
  };

  const loadRounds = async () => {
    const { data } = await supabase.from('rounds').select('*').order('created_at');
    if (data) setRounds(data);
  };

  const loadQuestions = async () => {
    const { data } = await supabase.from('questions').select('*').order('display_order');
    if (data) setQuestions(data);
  };

  const loadTeams = async () => {
    const { data } = await supabase.from('teams').select('*').order('score', { ascending: false });
    if (data) {
      // Calculer présence (< 30s = connecté)
      const now = new Date();
      const withPresence = data.map(t => ({
        ...t,
        is_connected: t.last_seen_at ? (now.getTime() - new Date(t.last_seen_at).getTime()) < 30000 : false
      }));
      setConnectedTeams(withPresence);
    }
  };

  const loadBuzzers = async () => {
    // Utiliser les refs pour éviter les stale closures
    const qId = currentQuestionId;
    const sId = sessionId;
    
    console.log('🔍 Regie: loadBuzzers appelé', { qId, sId, currentBuzzersCount: buzzers.length });
    
    if (!qId || !sId) {
      console.log('⚠️ Regie: Pas de question ou session, buzzers vidés');
      setBuzzers([]);
      return;
    }
    
    const { data, error } = await supabase.from('buzzer_attempts')
      .select('*, teams(*)')
      .eq('question_id', qId)
      .eq('game_session_id', sId)
      .order('buzzed_at', { ascending: true });
    
    if (error) {
      console.error('❌ Regie: Erreur chargement buzzers', error);
      return;
    }
    
    console.log('📥 Regie: Buzzers chargés depuis DB:', data?.length || 0, 'buzzers:', data);
    if (data) {
      setBuzzers(data);
      console.log('✅ Regie: State buzzers mis à jour avec', data.length, 'buzzers');
    }
  };

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

  const startQuestion = async (question: any) => {
    const instanceId = crypto.randomUUID();
    setCurrentQuestionId(question.id);
    setCurrentQuestionInstanceId(instanceId);
    setCurrentRoundId(question.round_id);
    
    // Réinitialiser le compteur de buzzers et les équipes bloquées
    previousBuzzersCount.current = 0;
    setBlockedTeams([]);
    
    // Précharger le son pour les blind tests
    if (question.question_type === 'blind_test' && question.audio_url) {
      const track = audioTracks.find(t => t.url === question.audio_url);
      if (track) {
        console.log('🎵 Préchargement du son:', track.name);
        await audioEngine.preloadTrack(track);
        setCurrentTrack(track); // Définir uniquement le track de la question
        toast({ title: '🎵 Son préchargé', description: track.name });
      }
    } else {
      setCurrentTrack(null); // Pas de track pour les questions non-blind test
    }
    
    await supabase.from('question_instances').insert({
      id: instanceId,
      question_id: question.id,
      game_session_id: sessionId,
      started_at: new Date().toISOString()
    });
    
    const round = rounds.find(r => r.id === question.round_id);
    const timerDuration = round?.timer_duration || 30;
    
    await supabase.from('game_state').update({ 
      current_question_id: question.id, 
      current_question_instance_id: instanceId, 
      current_round_id: question.round_id, 
      is_buzzer_active: question.question_type === 'blind_test', // Buzzer actif uniquement pour blind test
      timer_active: false, // Timer ne démarre pas automatiquement pour que la régie lance l'extrait
      timer_remaining: timerDuration,
      show_leaderboard: false,
      show_waiting_screen: false,
      show_answer: false, // Réinitialiser le reveal pour éviter les révélations accidentelles
      answer_result: null 
    }).eq('game_session_id', sessionId);
    
    setBuzzerLocked(false);
    setBuzzers([]);
    setTimerRemaining(timerDuration);
    setTimerActive(false); // Ne pas démarrer le timer automatiquement
    
    await gameEvents.startQuestion(question.id, instanceId, sessionId!);
    toast({ title: '🎬 Question chargée - Lancez l\'extrait quand prêt' });
  };

  const handleWrongAnswer = async (teamId: string) => {
    // Bloquer l'équipe qui a donné une mauvaise réponse
    const newBlockedTeams = [...blockedTeams, teamId];
    setBlockedTeams(newBlockedTeams);
    
    // IMPORTANT : Synchroniser avec la DB pour que les clients puissent voir qu'ils sont bloqués
    await supabase.from('game_state').update({ 
      answer_result: 'incorrect',
      excluded_teams: newBlockedTeams
    }).eq('game_session_id', sessionId);
    
    // Supprimer le buzzer de l'équipe qui a raté
    if (currentQuestionId && sessionId) {
      await supabase
        .from('buzzer_attempts')
        .delete()
        .eq('team_id', teamId)
        .eq('question_id', currentQuestionId)
        .eq('game_session_id', sessionId);
    }
    
    setTimeout(async () => {
      await gameEvents.resetBuzzer(currentQuestionInstanceId!);
      setBuzzerLocked(false);
      
      const currentQ = questions.find(x => x.id === currentQuestionId);
      
      // Relancer la musique et le timer pour blind test
      if (currentQ?.question_type === 'blind_test') {
        if (currentQ?.audio_url) { 
          const s = audioTracks.find(t => t.url === currentQ.audio_url); 
          if (s) {
            // Reprendre à la position exacte où on s'était arrêté
            await audioEngine.loadAndPlay(s, audioPositionWhenBuzzed);
            console.log('🎵 Reprise musique à', audioPositionWhenBuzzed);
          }
        } 
        
        // Reprendre avec le timer sauvegardé au moment du buzz
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
      
      toast({ title: '❌ Mauvaise - Reprise' });
    }, 2000);
  };

  const handleCorrectAnswer = async (teamId: string, points: number) => {
    // Attribuer les points à l'équipe
    const { data: team } = await supabase
      .from('teams')
      .select('score')
      .eq('id', teamId)
      .single();

    if (team) {
      await supabase
        .from('teams')
        .update({ score: team.score + points })
        .eq('id', teamId);
      
      // Afficher l'animation "Bonne réponse" et révéler la réponse en dessous
      await supabase.from('game_state').update({ 
        answer_result: 'correct',
        show_answer: true 
      }).eq('game_session_id', sessionId);
    }

    
    await supabase.from('game_state').update({ answer_result: 'correct', is_buzzer_active: false, timer_active: false }).eq('game_session_id', sessionId);
    setTimerActive(false);
    const q = questions.find(x => x.id === currentQuestionId);
    if (q?.audio_url && q.question_type === 'blind_test') { 
      const s = audioTracks.find(t => t.url === q.audio_url); 
      if (s) { 
        await audioEngine.loadAndPlay(s); 
        await audioEngine.playSolution(8, 300, 300); 
      } 
    }
    
    // Nettoyer les buzzers après l'animation
    setTimeout(async () => { 
      await supabase.from('game_state').update({ answer_result: null }).eq('game_session_id', sessionId);
      
      // Supprimer tous les buzzers de la DB pour cette question
      if (currentQuestionId && sessionId) {
        await supabase
          .from('buzzer_attempts')
          .delete()
          .eq('question_id', currentQuestionId)
          .eq('game_session_id', sessionId);
        
        setBuzzers([]); // Vider le state local
      }
      
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
    }, 10000);
    toast({ title: '🎬 Intro manche lancée' });
  };

  const showReveal = async () => {
    await supabase.from('game_state').update({ show_answer: true }).eq('game_session_id', sessionId);
    
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
        .select('*, teams(score)')
        .eq('question_id', currentQuestionId)
        .eq('game_session_id', sessionId);

      if (answers) {
        for (const answer of answers) {
          const isCorrect = answer.answer.toLowerCase().trim() === currentQ.correct_answer?.toLowerCase().trim();
          const points = isCorrect ? (currentQ.points || 10) : 0;
          
          // Mettre à jour la réponse
          await supabase
            .from('team_answers')
            .update({ 
              is_correct: isCorrect,
              points_awarded: points
            })
            .eq('id', answer.id);

          // Mettre à jour le score de l'équipe
          if (isCorrect && answer.teams) {
            await supabase
              .from('teams')
              .update({ score: (answer.teams.score || 0) + points })
              .eq('id', answer.team_id);
          }

          // Envoyer l'événement de reveal à chaque équipe
          await gameEvents.revealAnswer(answer.team_id, isCorrect, currentQ.correct_answer);
        }
        toast({ title: '👁️ Réponse révélée et points attribués', description: `${answers.filter(a => a.answer.toLowerCase().trim() === currentQ.correct_answer?.toLowerCase().trim()).length} bonne(s) réponse(s)` });
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
    await supabase.from('game_state').update({ show_answer: false }).eq('game_session_id', sessionId);
    toast({ title: '🙈 Réponse cachée' });
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
    await supabase.from('game_state').update({ show_waiting_screen: newValue }).eq('game_session_id', sessionId);
    toast({ title: newValue ? '⏸️ Écran d\'attente activé' : '▶️ Retour au jeu' });
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

  const roundQuestions = currentRoundId ? questions.filter(q => q.round_id === currentRoundId) : [];
  const connectedCount = connectedTeams.filter(t => t.is_connected).length;

  return (
    <div className="h-screen bg-gradient-to-br from-background via-muted/30 to-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-primary/20 bg-card/90 backdrop-blur flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-arena bg-clip-text text-transparent">Régie TV</h1>
            <Badge variant="outline" className="gap-2">
              <Users className="h-3 w-3" />
              {connectedCount}/{connectedTeams.length}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => window.open('/screen', '_blank')}>
              <Monitor className="h-3 w-3 mr-1" />
              Écran
            </Button>
            <Button size="sm" variant="outline" onClick={toggleWaitingScreen}>
              {gameState?.show_waiting_screen ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </Button>
            <Button size="sm" variant="outline" onClick={showLeaderboard}>
              <Trophy className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="destructive" onClick={resetSession}>
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Audio Deck - Lecteur pro avec cue points */}
      {currentTrack && (
        <div className="p-3 flex-shrink-0">
          <AudioDeck 
            tracks={[currentTrack]}
            onTrackChange={(track) => {
              console.log('📻 Track changed:', track.name);
            }}
          />
        </div>
      )}

      {/* Control Bar */}
      <div className="p-3 flex-shrink-0">
        <ControlBar
          timer={{
            value: timerRemaining,
            active: timerActive,
            onToggle: () => setTimerActive(!timerActive),
            onReset: () => { setTimerRemaining(30); setTimerActive(false); }
          }}
          audio={{
            onPlayExtrait: () => {
              const q = questions.find(x => x.id === currentQuestionId);
              if (q?.audio_url) {
                const t = audioTracks.find(x => x.url === q.audio_url);
                if (t) { 
                  audioEngine.loadAndPlay(t); 
                  audioEngine.playClip30s(300);
                  // Démarrer le timer quand on lance l'extrait
                  setTimerActive(true);
                  if (sessionId) {
                    supabase.from('game_state').update({ timer_active: true }).eq('game_session_id', sessionId);
                  }
                }
              }
            },
            onPlaySolution: () => {
              const q = questions.find(x => x.id === currentQuestionId);
              if (q?.audio_url) {
                const t = audioTracks.find(x => x.url === q.audio_url);
                if (t) { audioEngine.loadAndPlay(t); audioEngine.playSolution(8, 300, 300); }
              }
            }
          }}
          buzzer={{
            locked: buzzerLocked,
            active: gameState?.is_buzzer_active || false,
            onToggle: toggleBuzzer,
            onReset: async () => {
              if (!currentQuestionInstanceId) {
                toast({ title: '❌ Aucune question en cours', variant: 'destructive' });
                return;
              }
              
              console.log('🔄 Reset buzzers pour instance:', currentQuestionInstanceId);
              
              // Supprimer les tentatives de buzzer pour cette question
              if (sessionId) {
                const { error } = await supabase.from('buzzer_attempts')
                  .delete()
                  .eq('question_instance_id', currentQuestionInstanceId)
                  .eq('game_session_id', sessionId);
                
                if (error) {
                  console.error('❌ Erreur suppression buzzers:', error);
                  toast({ title: '❌ Erreur reset', variant: 'destructive' });
                  return;
                }
              }
              
              // Envoyer l'événement de reset
              await gameEvents.resetBuzzer(currentQuestionInstanceId);
              setBuzzerLocked(false);
              setBuzzers([]);
              setBlockedTeams([]); // Réinitialiser les équipes bloquées
              previousBuzzersCount.current = 0;
              
              // IMPORTANT : Réinitialiser aussi excluded_teams dans la DB et réactiver le buzzer
              await supabase.from('game_state').update({ 
                excluded_teams: [],
                is_buzzer_active: true // Réactiver le buzzer pour tous
              }).eq('game_session_id', sessionId);
              
              toast({ title: '🔄 Buzzers réinitialisés' });
            }
          }}
          reveal={{
            onReveal: showReveal,
            onHide: hideReveal,
            isRevealed: gameState?.show_answer || false
          }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-3 px-3 pb-3">
        {/* Left: Questions + Answers */}
        <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
          {/* Questions */}
          <Card className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="p-3 border-b flex gap-2 overflow-x-auto flex-shrink-0">
            {rounds.map(r => (
              <Button 
                key={r.id} 
                variant={currentRoundId === r.id ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setCurrentRoundId(r.id)}
              >
                {r.title}
              </Button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {roundQuestions.map(q => (
              <div key={q.id} className="flex justify-between items-center p-3 border rounded bg-muted/30">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{q.question_text}</div>
                  <div className="text-xs text-muted-foreground">{q.points} pts</div>
                </div>
                <Button size="sm" onClick={() => startQuestion(q)}>Lancer</Button>
              </div>
            ))}
          </div>
        </Card>

          {/* Réponses QCM et Freetext */}
          <div className="flex-shrink-0 max-h-64 overflow-y-auto">
            <QCMAnswersDisplay currentQuestion={questions.find(q => q.id === currentQuestionId)} gameState={gameState} />
            <TextAnswersDisplay 
              currentQuestionId={currentQuestionId} 
              gameState={gameState}
              currentQuestion={questions.find(q => q.id === currentQuestionId)}
            />
          </div>
        </div>

        {/* Right: Buzzers + Teams */}
        <div className="w-full lg:w-96 flex flex-col gap-3 overflow-hidden min-h-0">
          {/* Buzzers */}
          <BuzzerMonitor 
            currentQuestionId={currentQuestionId} 
            gameState={gameState} 
            buzzers={buzzers}
            questionPoints={questions.find(q => q.id === currentQuestionId)?.points || 10}
            onCorrectAnswer={handleCorrectAnswer}
            onWrongAnswer={handleWrongAnswer}
            blockedTeams={blockedTeams}
          />

          {/* Équipes bloquées */}
          {blockedTeams.length > 0 && (
            <Card className="p-4 bg-destructive/10 border-destructive/20">
              <h3 className="text-sm font-bold text-destructive flex items-center gap-2 mb-3">
                <X className="h-4 w-4" />
                Équipes bloquées ({blockedTeams.length})
              </h3>
              <div className="space-y-2">
                {blockedTeams.map(teamId => {
                  const team = connectedTeams.find(t => t.id === teamId);
                  return team ? (
                    <div 
                      key={teamId}
                      className="flex items-center gap-2 p-2 rounded bg-destructive/20 border border-destructive/30"
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                      <span className="font-semibold text-sm">{team.name}</span>
                      <Badge variant="destructive" className="ml-auto text-xs">Bloqué</Badge>
                    </div>
                  ) : null;
                })}
              </div>
            </Card>
          )}

          {/* Teams */}
          <Card className="flex-1 overflow-hidden flex flex-col">
            <div className="p-3 border-b flex justify-between items-center flex-shrink-0">
              <h3 className="font-bold text-sm">Équipes</h3>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={resetAllScores}>Reset</Button>
                <Button size="sm" variant="ghost" onClick={disconnectAll}>Kick</Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {connectedTeams.map(t => (
                <div key={t.id} className="flex items-center gap-2 p-2 border rounded bg-muted/30">
                  <div className={`w-2 h-2 rounded-full ${t.is_connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{t.name}</div>
                    <div className="text-xs">{t.score} pts</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => adjustTeamScore(t.id, -1)}>-1</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => adjustTeamScore(t.id, 1)}>+1</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => adjustTeamScore(t.id, 5)}>+5</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => disconnectTeam(t.id)}>X</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Effets TV */}
          <Card className="p-3 flex-shrink-0">
            <h3 className="font-bold mb-2 text-sm">Effets TV</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={showRoundIntro}>
                <Sparkles className="h-3 w-3 mr-1" />
                Intro
              </Button>
              <Button size="sm" variant="outline" onClick={hideLeaderboard}>
                Masquer
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <Toaster />
    </div>
  );
};

export default Regie;
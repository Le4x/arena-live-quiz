/**
 * Hook pour simuler des équipes qui jouent automatiquement
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/utils/logger';
import { toast } from 'sonner';

interface SimulationConfig {
  enabled: boolean;
  buzzerResponseTime: {
    min: number; // ms
    max: number; // ms
  };
  correctAnswerProbability: number; // 0-1
  answerDelay: {
    min: number; // ms
    max: number; // ms
  };
}

const DEFAULT_CONFIG: SimulationConfig = {
  enabled: false,
  buzzerResponseTime: { min: 100, max: 3000 },
  correctAnswerProbability: 0.7,
  answerDelay: { min: 2000, max: 5000 },
};

export const useGameSimulation = () => {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [isRunning, setIsRunning] = useState(false);
  const [simulatedTeams, setSimulatedTeams] = useState<any[]>([]);
  const buzzerTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const answerTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const channelRef = useRef<any>(null);

  // Load simulation teams
  useEffect(() => {
    loadSimulationTeams();

    const teamsChannel = supabase
      .channel('simulation-teams')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'teams',
        filter: 'name=ilike.SIM-%'
      }, loadSimulationTeams)
      .subscribe();

    return () => {
      supabase.removeChannel(teamsChannel);
    };
  }, []);

  const loadSimulationTeams = async () => {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .ilike('name', 'SIM-%');
    
    if (data) {
      setSimulatedTeams(data);
      logger.info(`Loaded ${data.length} simulation teams`);
    }
  };

  // Start simulation
  const startSimulation = useCallback(async () => {
    if (simulatedTeams.length === 0) {
      toast.error('Aucune équipe de simulation trouvée');
      return;
    }

    setIsRunning(true);
    setConfig(prev => ({ ...prev, enabled: true }));
    
    console.log('🤖 ============================================');
    console.log('🤖 DÉMARRAGE DE LA SIMULATION');
    console.log('🤖 ============================================');
    console.log(`🤖 Équipes simulées: ${simulatedTeams.length}`);
    console.log(`🤖 Configuration:`, config);
    
    logger.info('🤖 Starting simulation...', { 
      teamCount: simulatedTeams.length,
      config: config 
    });
    
    try {
      // Check current game state immediately
      console.log('🔍 Vérification de la session active...');
      const { data: activeSessions, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('status', 'active')
        .maybeSingle();
      
      if (sessionError) {
        console.error('❌ Erreur lors de la récupération de la session:', sessionError);
        toast.error('Erreur lors du chargement de la session');
        return;
      }
      
      if (!activeSessions) {
        console.log('⚠️ Aucune session active trouvée');
        toast.warning('Aucune session active - la simulation attendra qu\'une question soit lancée');
      } else {
        console.log('✅ Session active trouvée:', activeSessions.name);
        
        const { data: currentGameState, error: stateError } = await supabase
          .from('game_state')
          .select('*')
          .eq('game_session_id', activeSessions.id)
          .maybeSingle();
        
        if (stateError) {
          console.error('❌ Erreur lors de la récupération du game state:', stateError);
        } else if (currentGameState) {
          console.log('🎮 État du jeu actuel:', {
            question: currentGameState.current_question_id,
            instance: currentGameState.current_question_instance_id,
            buzzerActive: currentGameState.is_buzzer_active
          });
          
          // Handle current question if active
          if (currentGameState.current_question_id && currentGameState.current_question_instance_id) {
            if (currentGameState.is_buzzer_active) {
              console.log('🔔 Buzzer déjà actif - simulation des buzzers...');
              await simulateBuzzers(
                currentGameState.current_question_id,
                currentGameState.current_question_instance_id,
                currentGameState.game_session_id
              );
            } else {
              console.log('📝 Question déjà affichée - simulation des réponses...');
              await simulateAnswers(
                currentGameState.current_question_id,
                currentGameState.current_question_instance_id,
                currentGameState.game_session_id
              );
            }
          } else {
            console.log('ℹ️ Aucune question active pour le moment');
          }
        }
      }
      
      // Subscribe to game state changes
      console.log('📡 Abonnement aux changements de game_state...');
      
      if (channelRef.current) {
        console.log('⚠️ Un channel existe déjà, on le supprime d\'abord');
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      channelRef.current = supabase
        .channel(`simulation-game-state-${Date.now()}`) // Nom unique pour éviter conflits
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_state'
        }, async (payload) => {
          const gameState = payload.new;
          console.log('🔄 ============================================');
          console.log('🔄 CHANGEMENT DÉTECTÉ DANS GAME_STATE');
          console.log('🔄 ============================================');
          console.log('🔄 Nouveau state:', gameState);
          
          logger.info('🔄 Game state updated', gameState);
          
          // Handle buzzer activation
          if (gameState.is_buzzer_active && gameState.current_question_id && gameState.current_question_instance_id) {
            console.log('🔔 Buzzer activé - démarrage simulation buzzers...');
            await simulateBuzzers(
              gameState.current_question_id,
              gameState.current_question_instance_id,
              gameState.game_session_id
            );
          }
          
          // Handle question display (for non-buzzer questions)
          if (gameState.current_question_id && 
              gameState.current_question_instance_id && 
              !gameState.is_buzzer_active) {
            console.log('📝 Question affichée - démarrage simulation réponses...');
            await simulateAnswers(
              gameState.current_question_id,
              gameState.current_question_instance_id,
              gameState.game_session_id
            );
          }
        })
        .subscribe(async (status) => {
          console.log(`📡 État du channel de simulation: ${status}`);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Channel de simulation connecté avec succès');
            
            // Vérifier les channels actifs
            const allChannels = supabase.getChannels();
            console.log(`📊 Total channels Supabase actifs: ${allChannels.length}`, allChannels.map(c => ({
              topic: c.topic,
              state: c.state
            })));
            
            toast.success('🤖 Simulation connectée et prête');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Erreur de connexion du channel de simulation');
            toast.error('Erreur de connexion de la simulation');
          } else if (status === 'TIMED_OUT') {
            console.error('⏱️ Timeout du channel de simulation');
            toast.error('Timeout de la simulation');
          } else if (status === 'CLOSED') {
            console.warn('⚠️ Channel de simulation fermé');
          }
          logger.info('📡 Simulation channel status', { status });
        });

      toast.success('🤖 Simulation démarrée');
      console.log('✅ Simulation démarrée avec succès');
      logger.info('✅ Game simulation started', { teamCount: simulatedTeams.length });
    } catch (error) {
      console.error('❌ Erreur lors du démarrage de la simulation:', error);
      logger.error('Failed to start simulation', error as Error);
      toast.error('Erreur lors du démarrage de la simulation');
      setIsRunning(false);
    }
  }, [simulatedTeams, config]);

  // Stop simulation
  const stopSimulation = useCallback(() => {
    setIsRunning(false);
    setConfig(prev => ({ ...prev, enabled: false }));
    
    // Clear all timeouts
    buzzerTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    answerTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    buzzerTimeoutsRef.current.clear();
    answerTimeoutsRef.current.clear();
    
    // Unsubscribe from channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    toast.info('⏸️ Simulation arrêtée');
    logger.info('Game simulation stopped');
  }, []);

  // Simulate buzzers
  const simulateBuzzers = async (
    questionId: string,
    questionInstanceId: string,
    sessionId: string
  ) => {
    console.log('🔔 ============================================');
    console.log('🔔 SIMULATION DES BUZZERS');
    console.log('🔔 ============================================');
    console.log(`🔔 Question ID: ${questionId}`);
    console.log(`🔔 Instance ID: ${questionInstanceId}`);
    console.log(`🔔 Session ID: ${sessionId}`);
    console.log(`🔔 Équipes disponibles: ${simulatedTeams.length}`);
    
    logger.info('🔔 Simulating buzzers', { 
      questionId, 
      questionInstanceId,
      teamCount: simulatedTeams.length 
    });

    try {
      // Check game state for blocked teams
      const { data: gameState } = await supabase
        .from('game_state')
        .select('excluded_teams')
        .eq('game_session_id', sessionId)
        .maybeSingle();
      
      // Parse excluded_teams - peut être un array d'objets ou de strings
      const excludedTeams = (gameState?.excluded_teams as any) || [];
      const blockedTeamIds = new Set<string>();
      
      if (Array.isArray(excludedTeams)) {
        excludedTeams.forEach((item: any) => {
          if (typeof item === 'string') {
            blockedTeamIds.add(item);
          } else if (item && typeof item === 'object') {
            // Peut être {team_id: "..."}, {id: "..."}, ou autre structure
            const teamId = item.team_id || item.id || item.teamId;
            if (teamId) blockedTeamIds.add(teamId);
          }
        });
      }
      
      console.log(`🚫 Équipes bloquées: ${blockedTeamIds.size}`, Array.from(blockedTeamIds));

      // Check if already buzzed for this question instance
      console.log('🔍 Vérification des buzzers existants...');
      const { data: existingBuzzers, error: buzzerError } = await supabase
        .from('buzzer_attempts')
        .select('team_id, teams(name), is_blocked:teams(is_excluded)')
        .eq('question_instance_id', questionInstanceId);

      if (buzzerError) {
        console.error('❌ Erreur lors de la récupération des buzzers:', buzzerError);
        return;
      }

      const buzzedTeamIds = new Set(existingBuzzers?.map(b => b.team_id) || []);
      console.log(`📊 Buzzers existants: ${buzzedTeamIds.size} équipes ont déjà buzzé`);

      // IMPORTANT: Filter out teams that:
      // 1. Already buzzed for this instance
      // 2. Are blocked/excluded
      const teamsWhoCanBuzz = simulatedTeams.filter(t => 
        !buzzedTeamIds.has(t.id) && !blockedTeamIds.has(t.id)
      );
      
      console.log(`✅ ${teamsWhoCanBuzz.length} équipes peuvent buzzer (pas buzzé + pas bloqué)`);
      console.log('📋 Équipes autorisées:', teamsWhoCanBuzz.map(t => t.name));
      
      // Cancel any pending buzzers for blocked teams
      blockedTeamIds.forEach(teamId => {
        const timeout = buzzerTimeoutsRef.current.get(teamId);
        if (timeout) {
          console.log(`🚫 Annulation du buzzer programmé pour équipe bloquée: ${teamId}`);
          clearTimeout(timeout);
          buzzerTimeoutsRef.current.delete(teamId);
        }
      });
      
      if (teamsWhoCanBuzz.length === 0) {
        console.log('⚠️ Aucune équipe disponible pour buzzer (déjà buzzé ou bloqué)');
        logger.warn('No teams available to buzz');
        return;
      }

      // Select 30-70% of available teams to buzz
      const teamsWhoWillBuzz = teamsWhoCanBuzz
        .filter(() => Math.random() < 0.5);

      console.log(`🎯 ${teamsWhoWillBuzz.length} équipes vont buzzer:`, teamsWhoWillBuzz.map(t => t.name));

      if (teamsWhoWillBuzz.length === 0) {
        console.log('⚠️ Aucune équipe sélectionnée pour buzzer (aléatoire)');
        return;
      }

      teamsWhoWillBuzz.forEach((team) => {
        const delay = randomBetween(
          config.buzzerResponseTime.min,
          config.buzzerResponseTime.max
        );

        console.log(`⏱️ ${team.name} va buzzer dans ${delay}ms`);

        const timeout = setTimeout(async () => {
          try {
            // Triple check before inserting:
            // 1. Not already buzzed
            // 2. Not blocked
            const { data: recheck } = await supabase
              .from('buzzer_attempts')
              .select('id')
              .eq('team_id', team.id)
              .eq('question_instance_id', questionInstanceId)
              .maybeSingle();
            
            if (recheck) {
              console.log(`⚠️ ${team.name} a déjà buzzé pendant le délai, annulation`);
              return;
            }
            
            // Check if team is now blocked
            const { data: currentGameState } = await supabase
              .from('game_state')
              .select('excluded_teams')
              .eq('game_session_id', sessionId)
              .maybeSingle();
            
            const currentExcluded = (currentGameState?.excluded_teams as any) || [];
            const currentBlockedIds = new Set<string>();
            
            if (Array.isArray(currentExcluded)) {
              currentExcluded.forEach((item: any) => {
                if (typeof item === 'string') {
                  currentBlockedIds.add(item);
                } else if (item && typeof item === 'object') {
                  const teamId = item.team_id || item.id || item.teamId;
                  if (teamId) currentBlockedIds.add(teamId);
                }
              });
            }
            
            if (currentBlockedIds.has(team.id)) {
              console.log(`🚫 ${team.name} est maintenant bloqué, annulation du buzzer`);
              logger.warn(`Team ${team.name} blocked, cancelling buzz`);
              return;
            }

            console.log(`🔔 ${team.name} buzze maintenant...`);
            const { error, data } = await supabase
              .from('buzzer_attempts')
              .insert({
                team_id: team.id,
                question_id: questionId,
                question_instance_id: questionInstanceId,
                game_session_id: sessionId,
                buzzed_at: new Date().toISOString(),
              })
              .select();

            if (!error) {
              console.log(`✅ ${team.name} a buzzé avec succès!`, data);
              logger.buzzer(`✅ Team ${team.name} buzzed`, { delay });
              toast.success(`🔔 ${team.name} a buzzé !`);
            } else {
              console.error(`❌ Erreur buzzer pour ${team.name}:`, error);
              logger.error('Buzzer insert error', error);
            }
          } catch (error) {
            console.error(`❌ Exception lors du buzzer de ${team.name}:`, error);
            logger.error('Buzzer simulation error', error as Error);
          }

          buzzerTimeoutsRef.current.delete(team.id);
        }, delay);

        buzzerTimeoutsRef.current.set(team.id, timeout);
      });
    } catch (error) {
      console.error('❌ Erreur globale dans simulateBuzzers:', error);
      logger.error('Global buzzer simulation error', error as Error);
    }
  };

  // Simulate answers
  const simulateAnswers = async (
    questionId: string,
    questionInstanceId: string,
    sessionId: string
  ) => {
    console.log('📝 ============================================');
    console.log('📝 SIMULATION DES RÉPONSES');
    console.log('📝 ============================================');
    console.log(`📝 Question ID: ${questionId}`);
    console.log(`📝 Instance ID: ${questionInstanceId}`);
    console.log(`📝 Session ID: ${sessionId}`);
    
    try {
      // Get question details
      console.log('🔍 Récupération des détails de la question...');
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .maybeSingle();

      if (questionError) {
        console.error('❌ Erreur lors de la récupération de la question:', questionError);
        return;
      }

      if (!question) {
        console.log('⚠️ Question non trouvée');
        logger.warn('Question not found', { questionId });
        return;
      }

      console.log('✅ Question trouvée:', {
        text: question.question_text,
        type: question.question_type,
        points: question.points
      });

      logger.info('📝 Simulating answers', { 
        questionId, 
        questionInstanceId,
        type: question.question_type,
        teamCount: simulatedTeams.length
      });

      // Check if already answered for this question instance
      console.log('🔍 Vérification des réponses existantes...');
      const { data: existingAnswers, error: answersError } = await supabase
        .from('team_answers')
        .select('team_id, teams(name), answer')
        .eq('question_instance_id', questionInstanceId);

      if (answersError) {
        console.error('❌ Erreur lors de la récupération des réponses:', answersError);
        return;
      }

      const answeredTeamIds = new Set(existingAnswers?.map(a => a.team_id) || []);
      console.log(`📊 Réponses existantes: ${answeredTeamIds.size} équipes ont déjà répondu`);
      if (existingAnswers && existingAnswers.length > 0) {
        console.log('📋 Équipes ayant déjà répondu:', existingAnswers);
      }

      // Select 60-90% of teams to answer
      const teamsWhoWillAnswer = simulatedTeams
        .filter(t => !answeredTeamIds.has(t.id))
        .filter(() => Math.random() < 0.75);

      console.log(`🎯 ${teamsWhoWillAnswer.length} équipes vont répondre:`, teamsWhoWillAnswer.map(t => t.name));
      logger.info(`🎯 ${teamsWhoWillAnswer.length} teams will answer`);

      if (teamsWhoWillAnswer.length === 0) {
        console.log('⚠️ Aucune équipe sélectionnée pour répondre');
        return;
      }

      teamsWhoWillAnswer.forEach((team) => {
        const delay = randomBetween(
          config.answerDelay.min,
          config.answerDelay.max
        );

        console.log(`⏱️ ${team.name} va répondre dans ${delay}ms`);

        const timeout = setTimeout(async () => {
          try {
            let answer = 'Pas de réponse'; // Valeur par défaut pour éviter undefined
            
            if (question.question_type === 'qcm' && question.options) {
              // QCM: choose random option, bias towards correct answer
              const options = question.options as any[];
              const correctOption = options.find(o => o.isCorrect);
              
              if (Math.random() < config.correctAnswerProbability && correctOption) {
                answer = correctOption.text || 'Réponse A';
                console.log(`✅ ${team.name} choisit la bonne réponse: ${answer}`);
              } else {
                // Choose random wrong answer
                const wrongOptions = options.filter(o => !o.isCorrect);
                const randomWrong = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
                answer = randomWrong?.text || options[0]?.text || 'Réponse aléatoire';
                console.log(`❌ ${team.name} choisit une mauvaise réponse: ${answer}`);
              }
            } else if (question.question_type === 'text') {
              // Text: submit variation of correct answer or random text
              if (Math.random() < config.correctAnswerProbability && question.correct_answer) {
                answer = generateAnswerVariation(question.correct_answer) || question.correct_answer || 'Réponse correcte';
                console.log(`✅ ${team.name} donne une bonne réponse: ${answer}`);
              } else {
                answer = generateRandomAnswer() || 'Je ne sais pas';
                console.log(`❌ ${team.name} donne une mauvaise réponse: ${answer}`);
              }
            }
            
            // Vérification finale - ne devrait jamais arriver mais sécurité
            if (!answer || answer.trim() === '') {
              answer = 'Sans réponse';
              console.warn(`⚠️ ${team.name} avait une réponse vide, valeur par défaut appliquée`);
            }

            console.log(`📝 ${team.name} envoie sa réponse...`);
            const { error, data } = await supabase
              .from('team_answers')
              .insert({
                team_id: team.id,
                question_id: questionId,
                question_instance_id: questionInstanceId,
                game_session_id: sessionId,
                answer: answer,
                answered_at: new Date().toISOString(),
              })
              .select();

            if (!error) {
              console.log(`✅ ${team.name} a répondu avec succès!`, data);
              logger.info(`Team ${team.name} answered`, { answer, delay });
            } else {
              console.error(`❌ Erreur réponse pour ${team.name}:`, error);
            }
          } catch (error) {
            console.error(`❌ Exception lors de la réponse de ${team.name}:`, error);
            logger.error('Answer simulation error', error as Error);
          }

          answerTimeoutsRef.current.delete(team.id);
        }, delay);

        answerTimeoutsRef.current.set(team.id, timeout);
      });
    } catch (error) {
      console.error('❌ Erreur globale dans simulateAnswers:', error);
      logger.error('Global answer simulation error', error as Error);
    }
  };

  // Update config
  const updateConfig = useCallback((updates: Partial<SimulationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSimulation();
    };
  }, [stopSimulation]);

  return {
    isRunning,
    simulatedTeams,
    config,
    startSimulation,
    stopSimulation,
    updateConfig,
  };
};

// Helper functions
const randomBetween = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const generateAnswerVariation = (correctAnswer: string): string => {
  if (!correctAnswer || correctAnswer.trim() === '') {
    return 'Réponse';
  }
  
  // Generate slight variations of the correct answer
  const variations = [
    correctAnswer,
    correctAnswer.toLowerCase(),
    correctAnswer.toUpperCase(),
    correctAnswer.replace(/\s+/g, ''),
    correctAnswer.trim(),
  ];
  
  const selected = variations[Math.floor(Math.random() * variations.length)];
  return selected || correctAnswer; // Fallback to original if somehow undefined
};

const generateRandomAnswer = (): string => {
  const randomAnswers = [
    'Je ne sais pas',
    'Pas sûr',
    'Peut-être',
    'Aucune idée',
    'Unknown',
    'X',
    '???',
  ];
  
  const selected = randomAnswers[Math.floor(Math.random() * randomAnswers.length)];
  return selected || 'Je ne sais pas'; // Fallback if somehow undefined
};

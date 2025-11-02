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
    
    logger.info('🤖 Starting simulation...', { 
      teamCount: simulatedTeams.length,
      config: config 
    });
    
    // Check current game state immediately
    const { data: activeSessions } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('status', 'active')
      .maybeSingle();
    
    if (activeSessions) {
      const { data: currentGameState } = await supabase
        .from('game_state')
        .select('*')
        .eq('game_session_id', activeSessions.id)
        .maybeSingle();
      
      if (currentGameState) {
        logger.info('🎮 Current game state detected', currentGameState);
        
        // Handle current question if active
        if (currentGameState.current_question_id && currentGameState.current_question_instance_id) {
          if (currentGameState.is_buzzer_active) {
            logger.info('🔔 Buzzer is active, simulating buzzers...');
            await simulateBuzzers(
              currentGameState.current_question_id,
              currentGameState.current_question_instance_id,
              currentGameState.game_session_id
            );
          } else {
            logger.info('📝 Question is active, simulating answers...');
            await simulateAnswers(
              currentGameState.current_question_id,
              currentGameState.current_question_instance_id,
              currentGameState.game_session_id
            );
          }
        }
      }
    }
    
    // Subscribe to game state changes
    channelRef.current = supabase
      .channel('simulation-game-state')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_state'
      }, async (payload) => {
        const gameState = payload.new;
        logger.info('🔄 Game state updated', gameState);
        
        // Handle buzzer activation
        if (gameState.is_buzzer_active && gameState.current_question_id && gameState.current_question_instance_id) {
          logger.info('🔔 Buzzer activated, simulating...');
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
          logger.info('📝 Question displayed, simulating answers...');
          await simulateAnswers(
            gameState.current_question_id,
            gameState.current_question_instance_id,
            gameState.game_session_id
          );
        }
      })
      .subscribe((status) => {
        logger.info('📡 Simulation channel subscribed', { status: status });
      });

    toast.success('🤖 Simulation démarrée');
    logger.info('✅ Game simulation started', { teamCount: simulatedTeams.length });
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
    logger.info('🔔 Simulating buzzers', { 
      questionId, 
      questionInstanceId,
      teamCount: simulatedTeams.length 
    });

    // Check if already buzzed for this question instance
    const { data: existingBuzzers } = await supabase
      .from('buzzer_attempts')
      .select('team_id')
      .eq('question_instance_id', questionInstanceId);

    const buzzedTeamIds = new Set(existingBuzzers?.map(b => b.team_id) || []);
    logger.info(`Already buzzed: ${buzzedTeamIds.size} teams`);

    // Select 30-70% of teams to buzz
    const teamsWhoWillBuzz = simulatedTeams
      .filter(t => !buzzedTeamIds.has(t.id))
      .filter(() => Math.random() < 0.5);

    logger.info(`🎯 ${teamsWhoWillBuzz.length} teams will buzz`);

    if (teamsWhoWillBuzz.length === 0) {
      logger.warn('No teams selected to buzz');
      return;
    }

    teamsWhoWillBuzz.forEach((team) => {
      const delay = randomBetween(
        config.buzzerResponseTime.min,
        config.buzzerResponseTime.max
      );

      const timeout = setTimeout(async () => {
        try {
          const { error } = await supabase
            .from('buzzer_attempts')
            .insert({
              team_id: team.id,
              question_id: questionId,
              question_instance_id: questionInstanceId,
              game_session_id: sessionId,
              buzzed_at: new Date().toISOString(),
            });

          if (!error) {
            logger.buzzer(`✅ Team ${team.name} buzzed`, { delay });
            toast.success(`🔔 ${team.name} a buzzé !`);
          } else {
            logger.error('Buzzer insert error', error);
          }
        } catch (error) {
          logger.error('Buzzer simulation error', error as Error);
        }

        buzzerTimeoutsRef.current.delete(team.id);
      }, delay);

      buzzerTimeoutsRef.current.set(team.id, timeout);
    });
  };

  // Simulate answers
  const simulateAnswers = async (
    questionId: string,
    questionInstanceId: string,
    sessionId: string
  ) => {
    // Get question details
    const { data: question } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .maybeSingle();

    if (!question) {
      logger.warn('Question not found', { questionId });
      return;
    }

    logger.info('📝 Simulating answers', { 
      questionId, 
      questionInstanceId,
      type: question.question_type,
      teamCount: simulatedTeams.length
    });

    // Check if already answered for this question instance
    const { data: existingAnswers } = await supabase
      .from('team_answers')
      .select('team_id')
      .eq('question_instance_id', questionInstanceId);

    const answeredTeamIds = new Set(existingAnswers?.map(a => a.team_id) || []);
    logger.info(`Already answered: ${answeredTeamIds.size} teams`);

    // Select 60-90% of teams to answer
    const teamsWhoWillAnswer = simulatedTeams
      .filter(t => !answeredTeamIds.has(t.id))
      .filter(() => Math.random() < 0.75);

    logger.info(`🎯 ${teamsWhoWillAnswer.length} teams will answer`);

    teamsWhoWillAnswer.forEach((team) => {
      const delay = randomBetween(
        config.answerDelay.min,
        config.answerDelay.max
      );

      const timeout = setTimeout(async () => {
        try {
          let answer = '';
          
          if (question.question_type === 'qcm' && question.options) {
            // QCM: choose random option, bias towards correct answer
            const options = question.options as any[];
            const correctOption = options.find(o => o.isCorrect);
            
            if (Math.random() < config.correctAnswerProbability && correctOption) {
              answer = correctOption.text;
            } else {
              // Choose random wrong answer
              const wrongOptions = options.filter(o => !o.isCorrect);
              answer = wrongOptions[Math.floor(Math.random() * wrongOptions.length)]?.text || options[0].text;
            }
          } else if (question.question_type === 'text') {
            // Text: submit variation of correct answer or random text
            if (Math.random() < config.correctAnswerProbability && question.correct_answer) {
              answer = generateAnswerVariation(question.correct_answer);
            } else {
              answer = generateRandomAnswer();
            }
          }

          const { error } = await supabase
            .from('team_answers')
            .insert({
              team_id: team.id,
              question_id: questionId,
              question_instance_id: questionInstanceId,
              game_session_id: sessionId,
              answer: answer,
              answered_at: new Date().toISOString(),
            });

          if (!error) {
            logger.info(`Team ${team.name} answered`, { answer, delay });
          }
        } catch (error) {
          logger.error('Answer simulation error', error as Error);
        }

        answerTimeoutsRef.current.delete(team.id);
      }, delay);

      answerTimeoutsRef.current.set(team.id, timeout);
    });
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
  // Generate slight variations of the correct answer
  const variations = [
    correctAnswer,
    correctAnswer.toLowerCase(),
    correctAnswer.toUpperCase(),
    correctAnswer.replace(/\s+/g, ''),
    correctAnswer.trim(),
  ];
  
  return variations[Math.floor(Math.random() * variations.length)];
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
  
  return randomAnswers[Math.floor(Math.random() * randomAnswers.length)];
};

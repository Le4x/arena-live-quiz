/**
 * Moteur de simulation pour tester la charge du système
 * Simule 30 équipes qui répondent automatiquement aux questions
 */

import { supabase } from "@/integrations/supabase/client";

const SIMULATION_TEAM_COUNT = 30;
const TEAM_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
  '#EC7063', '#AF7AC5', '#5DADE2', '#48C9B0', '#F5B041',
  '#EB984E', '#DC7633', '#A569BD', '#5499C7', '#45B39D'
];

export class SimulationEngine {
  private isActive = false;
  private sessionId: string;
  private simulatedTeamIds: string[] = [];
  private responseInterval: NodeJS.Timeout | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async start() {
    if (this.isActive) {
      console.log('⚠️ Simulation déjà active');
      return;
    }

    this.isActive = true;
    console.log('🚀 Démarrage simulation avec 30 équipes');
    
    // Créer 30 équipes simulées
    await this.createSimulatedTeams();
    
    // Démarrer l'écoute des questions
    this.startQuestionListener();
  }

  async stop() {
    this.isActive = false;
    if (this.responseInterval) {
      clearInterval(this.responseInterval);
      this.responseInterval = null;
    }
    
    // Supprimer toutes les équipes simulées
    if (this.simulatedTeamIds.length > 0) {
      await supabase
        .from('teams')
        .delete()
        .in('id', this.simulatedTeamIds);
      
      this.simulatedTeamIds = [];
      console.log('🛑 Simulation arrêtée, équipes supprimées');
    }
  }

  private async createSimulatedTeams() {
    const teams = [];
    
    for (let i = 1; i <= SIMULATION_TEAM_COUNT; i++) {
      teams.push({
        name: `SIM-${i.toString().padStart(2, '0')}`,
        color: TEAM_COLORS[i % TEAM_COLORS.length],
        score: 0,
        game_session_id: this.sessionId,
        is_active: true,
        connection_pin: `9${i.toString().padStart(3, '0')}`
      });
    }

    const { data, error } = await supabase
      .from('teams')
      .insert(teams)
      .select('id');

    if (error) {
      console.error('❌ Erreur création équipes simulées:', error);
      return;
    }

    if (data) {
      this.simulatedTeamIds = data.map(t => t.id);
      console.log(`✅ ${SIMULATION_TEAM_COUNT} équipes simulées créées`);
    }
  }

  private startQuestionListener() {
    // Écouter les changements de game_state pour détecter les nouvelles questions
    const channel = supabase
      .channel('simulation-listener')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_state',
          filter: `game_session_id=eq.${this.sessionId}`
        },
        async (payload) => {
          const newData = payload.new as any;
          
          // Détecter quand une question démarre (current_question_id est défini)
          if (newData.current_question_id && newData.current_question_instance_id) {
            console.log('🎯 Question détectée, simulation des réponses...');
            await this.simulateResponses(
              newData.current_question_id,
              newData.current_question_instance_id
            );
          }
        }
      )
      .subscribe();
  }

  private async simulateResponses(questionId: string, instanceId: string) {
    if (!this.isActive) return;

    // Récupérer la question pour connaître son type
    const { data: question, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (error || !question) {
      console.error('❌ Question introuvable:', error);
      return;
    }

    console.log(`📝 Simulation réponses pour question type: ${question.question_type}`);

    // Simuler avec des délais aléatoires pour chaque équipe
    const delayBetweenTeams = 50; // ms entre chaque équipe
    
    for (let i = 0; i < this.simulatedTeamIds.length; i++) {
      setTimeout(async () => {
        if (!this.isActive) return;
        
        const teamId = this.simulatedTeamIds[i];
        
        switch (question.question_type) {
          case 'qcm':
            await this.simulateQCMAnswer(teamId, questionId, instanceId, question);
            break;
          case 'free_text':
            await this.simulateFreeTextAnswer(teamId, questionId, instanceId, question);
            break;
          case 'blind_test':
            await this.simulateBuzzer(teamId, questionId);
            break;
        }
      }, i * delayBetweenTeams + Math.random() * 500);
    }
  }

  private async simulateQCMAnswer(
    teamId: string,
    questionId: string,
    instanceId: string,
    question: any
  ) {
    const options = question.options || [];
    if (options.length === 0) return;

    // 70% de chance de répondre correctement
    const isCorrect = Math.random() < 0.7;
    let selectedAnswer: string;

    if (isCorrect) {
      selectedAnswer = question.correct_answer;
    } else {
      // Choisir une mauvaise réponse au hasard
      const wrongAnswers = options.filter((opt: any) => opt.text !== question.correct_answer);
      selectedAnswer = wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)]?.text || options[0].text;
    }

    await supabase.from('team_answers').insert({
      team_id: teamId,
      question_id: questionId,
      question_instance_id: instanceId,
      game_session_id: this.sessionId,
      answer: selectedAnswer,
      is_correct: null // Sera validé automatiquement
    });
  }

  private async simulateFreeTextAnswer(
    teamId: string,
    questionId: string,
    instanceId: string,
    question: any
  ) {
    // 60% de chance de répondre correctement
    const isCorrect = Math.random() < 0.6;
    const correctAnswer = question.correct_answer || '';
    
    let answer: string;
    if (isCorrect) {
      // Réponse correcte avec quelques variations
      const variations = [
        correctAnswer,
        correctAnswer.toLowerCase(),
        correctAnswer.toUpperCase(),
        ` ${correctAnswer} ` // Avec espaces
      ];
      answer = variations[Math.floor(Math.random() * variations.length)];
    } else {
      // Réponse incorrecte aléatoire
      const wrongAnswers = [
        'Mauvaise réponse',
        'Autre chose',
        'Pas ça',
        'Réponse erronée',
        correctAnswer.split('').reverse().join('') // Inversé
      ];
      answer = wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)];
    }

    await supabase.from('team_answers').insert({
      team_id: teamId,
      question_id: questionId,
      question_instance_id: instanceId,
      game_session_id: this.sessionId,
      answer: answer,
      is_correct: null
    });
  }

  private async simulateBuzzer(teamId: string, questionId: string) {
    // Délai aléatoire entre 500ms et 5000ms pour buzzer
    const buzzerDelay = 500 + Math.random() * 4500;
    
    setTimeout(async () => {
      if (!this.isActive) return;
      
      // Récupérer l'instance actuelle de la question
      const { data: gameState } = await supabase
        .from('game_state')
        .select('current_question_instance_id')
        .eq('game_session_id', this.sessionId)
        .single();
      
      await supabase.from('buzzer_attempts').insert({
        team_id: teamId,
        question_id: questionId,
        question_instance_id: gameState?.current_question_instance_id || null,
        game_session_id: this.sessionId,
        is_first: false // Sera déterminé par le serveur
      });
    }, buzzerDelay);
  }

  isRunning() {
    return this.isActive;
  }
}

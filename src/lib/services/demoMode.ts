/**
 * Demo Mode - Mode d'entraînement pour le régisseur
 * Simule des équipes fictives et des événements automatiques
 */

import { supabase } from "@/integrations/supabase/client";

export interface DemoTeam {
  id: string;
  name: string;
  color: string;
  score: number;
}

const DEMO_TEAM_NAMES = [
  { name: "Les Rockers", color: "#ff3366" },
  { name: "Pop Stars", color: "#00ccff" },
  { name: "Jazz Masters", color: "#ffaa00" },
  { name: "Metal Heads", color: "#8b00ff" },
  { name: "Hip Hop Crew", color: "#00ff88" },
  { name: "Classical Fans", color: "#ff6600" },
];

/**
 * Créer des équipes de démo dans la DB
 */
export async function createDemoTeams(sessionId: string): Promise<DemoTeam[]> {
  console.log('🎭 [Demo] Création des équipes de démo...');

  const teams: DemoTeam[] = [];

  for (const teamData of DEMO_TEAM_NAMES) {
    const teamId = crypto.randomUUID();
    
    // Insérer l'équipe liée à la session
    const { error } = await supabase.from('teams').insert({
      id: teamId,
      name: `[DEMO] ${teamData.name}`,
      color: teamData.color,
      score: 0,
      is_active: true,
      connection_pin: Math.floor(1000 + Math.random() * 9000).toString(),
      game_session_id: sessionId, // Lier à la session
    });

    if (!error) {
      teams.push({
        id: teamId,
        name: `[DEMO] ${teamData.name}`,
        color: teamData.color,
        score: 0,
      });
    }
  }

  console.log('✅ [Demo] Équipes créées:', teams.length);
  return teams;
}

/**
 * Supprimer toutes les équipes de démo
 */
export async function cleanupDemoTeams(): Promise<void> {
  console.log('🧹 [Demo] Nettoyage des équipes de démo...');

  const { error } = await supabase
    .from('teams')
    .delete()
    .like('name', '[DEMO]%');

  if (error) {
    console.error('❌ [Demo] Erreur nettoyage:', error);
  } else {
    console.log('✅ [Demo] Équipes de démo supprimées');
  }
}

/**
 * Simuler un buzzer aléatoire
 */
export async function simulateBuzzer(
  questionId: string,
  questionInstanceId: string,
  sessionId: string,
  teams: DemoTeam[]
): Promise<void> {
  if (teams.length === 0) return;

  // Choisir une équipe au hasard
  const randomTeam = teams[Math.floor(Math.random() * teams.length)];

  console.log('⚡ [Demo] Simulation buzzer pour', randomTeam.name);

  // Vérifier combien de buzzers existent déjà
  const { data: existingBuzzers } = await supabase
    .from('buzzer_attempts')
    .select('id')
    .eq('question_instance_id', questionInstanceId);

  const isFirst = !existingBuzzers || existingBuzzers.length === 0;

  await supabase.from('buzzer_attempts').insert({
    team_id: randomTeam.id,
    game_session_id: sessionId,
    question_instance_id: questionInstanceId,
    question_id: questionId,
    is_first: isFirst,
    buzzed_at: new Date().toISOString(),
  });
}

/**
 * Simuler des réponses QCM aléatoires
 */
export async function simulateQCMAnswers(
  questionId: string,
  questionInstanceId: string,
  sessionId: string,
  teams: DemoTeam[],
  options: string[]
): Promise<void> {
  console.log('📝 [Demo] Simulation réponses QCM...');

  // 60-80% des équipes répondent
  const respondingTeams = teams.filter(() => Math.random() > 0.3);

  for (const team of respondingTeams) {
    // Choisir une réponse au hasard
    const randomAnswer = options[Math.floor(Math.random() * options.length)];

    // S'assurer que la réponse n'est pas vide
    if (randomAnswer && randomAnswer.trim()) {
      await supabase.from('team_answers').insert({
        team_id: team.id,
        game_session_id: sessionId,
        question_instance_id: questionInstanceId,
        question_id: questionId,
        answer: randomAnswer,
        answered_at: new Date().toISOString(),
      });
    }

    // Délai aléatoire entre réponses
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
  }

  console.log('✅ [Demo] Réponses simulées:', respondingTeams.length);
}

/**
 * Simuler des réponses texte aléatoires
 */
export async function simulateTextAnswers(
  questionId: string,
  questionInstanceId: string,
  sessionId: string,
  teams: DemoTeam[]
): Promise<void> {
  console.log('📝 [Demo] Simulation réponses texte...');

  const randomAnswers = [
    "Queen",
    "The Beatles",
    "Led Zeppelin",
    "Pink Floyd",
    "Rolling Stones",
    "David Bowie",
  ];

  // 50-70% des équipes répondent
  const respondingTeams = teams.filter(() => Math.random() > 0.4);

  for (const team of respondingTeams) {
    const randomAnswer = randomAnswers[Math.floor(Math.random() * randomAnswers.length)];

    // S'assurer que la réponse n'est pas vide
    if (randomAnswer && randomAnswer.trim()) {
      await supabase.from('team_answers').insert({
        team_id: team.id,
        game_session_id: sessionId,
        question_instance_id: questionInstanceId,
        question_id: questionId,
        answer: randomAnswer,
        answered_at: new Date().toISOString(),
      });
    }

    await new Promise(resolve => setTimeout(resolve, Math.random() * 800));
  }

  console.log('✅ [Demo] Réponses texte simulées:', respondingTeams.length);
}

/**
 * Activer le mode présence pour les équipes démo
 */
export async function activateDemoPresence(teams: DemoTeam[]): Promise<void> {
  console.log('👥 [Demo] Activation présence pour', teams.length, 'équipes');

  // Simuler la présence en mettant à jour last_seen_at
  for (const team of teams) {
    await supabase
      .from('teams')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', team.id);
  }
}

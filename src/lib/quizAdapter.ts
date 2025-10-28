import { supabase } from "@/integrations/supabase/client";

export type QuizQuestion = {
  id: string;
  type: 'buzzer' | 'qcm' | 'texte';
  text: string;
  options?: string[];
  answer?: number | string;
  points?: number;
  media?: { 
    audioUrl?: string; 
    imageUrl?: string; 
    videoUrl?: string;
  };
  cuePoints?: {
    search: { start: number; end: number };
    solution: { start: number; end: number };
  };
};

export type QuizRound = {
  id: string;
  name: string;
  type: string;
  jingleUrl?: string;
  questions: QuizQuestion[];
};

export type Quiz = {
  rounds: QuizRound[];
  currentRound: number;
  currentQuestion: number;
  points: { correct: number; incorrect: number };
};

/**
 * Charge le quiz complet depuis Supabase (rounds + questions)
 */
export async function loadQuizFromSupabase(): Promise<Quiz> {
  const hybridMode = import.meta.env.VITE_HYBRID_MODE === '1';
  
  if (!hybridMode) {
    throw new Error('Mode hybride non activé. Définir VITE_HYBRID_MODE=1');
  }

  // Charger tous les rounds avec leurs questions
  const { data: rounds, error: roundsError } = await supabase
    .from('rounds')
    .select(`
      id,
      title,
      type,
      jingle_url,
      questions (
        id,
        question_type,
        question_text,
        options,
        correct_answer,
        points,
        audio_url,
        cue_points,
        display_order
      )
    `)
    .order('created_at', { ascending: true });

  if (roundsError) {
    console.error('Erreur chargement rounds:', roundsError);
    throw new Error(`Impossible de charger le quiz: ${roundsError.message}`);
  }

  if (!rounds || rounds.length === 0) {
    throw new Error('Aucun quiz trouvé dans Supabase');
  }

  // Mapper vers le format Quiz
  const mappedRounds: QuizRound[] = rounds.map((round: any) => ({
    id: round.id,
    name: round.title,
    type: round.type,
    jingleUrl: round.jingle_url,
    questions: (round.questions || [])
      .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
      .map((q: any) => ({
        id: q.id,
        type: q.question_type,
        text: q.question_text,
        options: q.options || undefined,
        answer: q.correct_answer || undefined,
        points: q.points || 10,
        media: q.audio_url ? { audioUrl: q.audio_url } : undefined,
        cuePoints: q.cue_points || undefined,
      }))
  }));

  const totalQuestions = mappedRounds.reduce((sum, r) => sum + r.questions.length, 0);
  console.log(`✅ Quiz chargé: ${mappedRounds.length} manches, ${totalQuestions} questions`);

  return {
    rounds: mappedRounds,
    currentRound: 0,
    currentQuestion: 0,
    points: { correct: 10, incorrect: -5 }
  };
}

/**
 * Exporte le quiz au format JSON pour sauvegarde locale
 */
export function exportQuizToJSON(quiz: Quiz): string {
  return JSON.stringify(quiz, null, 2);
}

/**
 * Importe un quiz depuis JSON
 */
export function importQuizFromJSON(jsonString: string): Quiz {
  const quiz = JSON.parse(jsonString);
  
  // Validation minimale
  if (!quiz.rounds || !Array.isArray(quiz.rounds)) {
    throw new Error('Format JSON invalide: rounds manquant');
  }
  
  return quiz;
}

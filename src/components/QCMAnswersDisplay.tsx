import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Users } from "lucide-react";

interface QCMAnswersDisplayProps {
  currentQuestion: any | null;
  gameState: any | null;
}

export const QCMAnswersDisplay = ({ currentQuestion, gameState }: QCMAnswersDisplayProps) => {
  const [answers, setAnswers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (currentQuestion?.id && currentQuestion?.question_type === 'qcm') {
      loadAnswers();

      const answersChannel = supabase
        .channel('qcm-answers-changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'team_answers',
          filter: `question_id=eq.${currentQuestion.id}`
        }, () => {
          loadAnswers();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(answersChannel);
      };
    } else {
      setAnswers([]);
    }
  }, [currentQuestion?.id]);

  const loadTeams = async () => {
    const { data } = await supabase.from('teams').select('*');
    if (data) setTeams(data);
  };

  const loadAnswers = async () => {
    if (!currentQuestion?.id || !gameState?.game_session_id) return;

    const { data } = await supabase
      .from('team_answers')
      .select('*, teams(name, color)')
      .eq('question_id', currentQuestion.id)
      .eq('game_session_id', gameState.game_session_id)
      .order('answered_at', { ascending: true });

    if (data) {
      // Validation automatique
      const validatedAnswers = data.map(answer => {
        const isCorrect = answer.answer.toLowerCase().trim() === currentQuestion.correct_answer?.toLowerCase().trim();
        return { ...answer, is_correct: isCorrect };
      });
      setAnswers(validatedAnswers);
    }
  };

  if (!currentQuestion || currentQuestion.question_type !== 'qcm') return null;

  const correctAnswers = answers.filter(a => a.is_correct === true);
  const incorrectAnswers = answers.filter(a => a.is_correct === false);
  const notAnswered = teams.filter(t => !answers.find(a => a.team_id === t.id));

  return (
    <Card className="p-2 bg-card/90 backdrop-blur-sm border-primary/20">
      <div className="flex items-center justify-between mb-1.5">
        <h2 className="text-xs font-bold text-primary flex items-center gap-1">
          <Users className="h-3 w-3" />
          QCM
        </h2>
        <div className="flex gap-2 text-[10px]">
          <span className="flex items-center gap-0.5 text-green-500 font-medium">
            <CheckCircle2 className="h-3 w-3" />
            {correctAnswers.length}
          </span>
          <span className="flex items-center gap-0.5 text-red-500 font-medium">
            <XCircle className="h-3 w-3" />
            {incorrectAnswers.length}
          </span>
          <span className="flex items-center gap-0.5 text-muted-foreground font-medium">
            ⚪ {notAnswered.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {/* Bonnes réponses - Compact */}
        <div className="space-y-0.5">
          <h3 className="font-semibold text-green-500 text-[10px] mb-0.5">✓ Correctes</h3>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {correctAnswers.map((answer) => (
              <div
                key={answer.id}
                className="px-1.5 py-1 rounded bg-green-500/10 border border-green-500/30 flex items-center gap-1"
              >
                <div 
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: answer.teams?.color }}
                />
                <span className="text-[10px] truncate">{answer.teams?.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mauvaises réponses - Compact */}
        <div className="space-y-0.5">
          <h3 className="font-semibold text-red-500 text-[10px] mb-0.5">✗ Incorrectes</h3>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {incorrectAnswers.map((answer) => (
              <div
                key={answer.id}
                className="px-1.5 py-1 rounded bg-red-500/10 border border-red-500/30 flex items-center gap-1"
              >
                <div 
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: answer.teams?.color }}
                />
                <span className="text-[10px] truncate">{answer.teams?.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pas de réponse - Compact */}
        <div className="space-y-0.5">
          <h3 className="font-semibold text-muted-foreground text-[10px] mb-0.5">⚪ Non répondu</h3>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {notAnswered.map((team) => (
              <div
                key={team.id}
                className="px-1.5 py-1 rounded bg-muted/30 border border-muted flex items-center gap-1"
              >
                <div 
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: team.color }}
                />
                <span className="text-[10px] truncate">{team.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};
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
    <Card className="p-3 bg-card/90 backdrop-blur-sm border-primary/20">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-primary flex items-center gap-1">
          <Users className="h-4 w-4" />
          QCM
        </h2>
        <div className="flex gap-2 text-xs">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            {correctAnswers.length}
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="h-3 w-3 text-red-500" />
            {incorrectAnswers.length}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            {notAnswered.length}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-2">
        {/* Bonnes réponses */}
        <div className="space-y-1">
          <h3 className="font-bold text-green-500 text-xs mb-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Correctes ({correctAnswers.length})
          </h3>
          {correctAnswers.map((answer) => (
            <div
              key={answer.id}
              className="p-1.5 rounded bg-green-500/10 border border-green-500/30"
            >
              <div className="font-medium text-xs flex items-center gap-1">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: answer.teams?.color }}
                />
                <span className="truncate">{answer.teams?.name}</span>
              </div>
              <div className="text-[10px] mt-0.5 truncate">{answer.answer}</div>
            </div>
          ))}
        </div>

        {/* Mauvaises réponses */}
        <div className="space-y-1">
          <h3 className="font-bold text-red-500 text-xs mb-1 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Incorrectes ({incorrectAnswers.length})
          </h3>
          {incorrectAnswers.map((answer) => (
            <div
              key={answer.id}
              className="p-1.5 rounded bg-red-500/10 border border-red-500/30"
            >
              <div className="font-medium text-xs flex items-center gap-1">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: answer.teams?.color }}
                />
                <span className="truncate">{answer.teams?.name}</span>
              </div>
              <div className="text-[10px] mt-0.5 truncate">{answer.answer}</div>
            </div>
          ))}
        </div>

        {/* Pas de réponse */}
        <div className="space-y-1">
          <h3 className="font-bold text-muted-foreground text-xs mb-1">
            Non répondues ({notAnswered.length})
          </h3>
          {notAnswered.map((team) => (
            <div
              key={team.id}
              className="p-1.5 rounded bg-muted/30 border border-muted"
            >
              <div className="font-medium text-xs flex items-center gap-1">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <span className="truncate">{team.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
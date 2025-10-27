import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Users } from "lucide-react";

interface QCMAnswersDisplayProps {
  currentQuestion: any | null;
}

export const QCMAnswersDisplay = ({ currentQuestion }: QCMAnswersDisplayProps) => {
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
    if (!currentQuestion?.id) return;

    const { data } = await supabase
      .from('team_answers')
      .select('*, teams(name, color)')
      .eq('question_id', currentQuestion.id)
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
    <Card className="p-6 bg-card/90 backdrop-blur-sm border-primary/20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Users className="h-6 w-6" />
          Réponses QCM
        </h2>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            {correctAnswers.length} correct{correctAnswers.length > 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            {incorrectAnswers.length} incorrect{incorrectAnswers.length > 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            {notAnswered.length} non répondu{notAnswered.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Bonnes réponses */}
        <div className="space-y-2">
          <h3 className="font-bold text-green-500 mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Correctes ({correctAnswers.length})
          </h3>
          {correctAnswers.map((answer) => (
            <div
              key={answer.id}
              className="p-3 rounded-lg bg-green-500/10 border-2 border-green-500/30"
            >
              <div className="font-bold flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: answer.teams?.color }}
                />
                {answer.teams?.name}
              </div>
              <div className="text-sm mt-1">{answer.answer}</div>
            </div>
          ))}
        </div>

        {/* Mauvaises réponses */}
        <div className="space-y-2">
          <h3 className="font-bold text-red-500 mb-3 flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            Incorrectes ({incorrectAnswers.length})
          </h3>
          {incorrectAnswers.map((answer) => (
            <div
              key={answer.id}
              className="p-3 rounded-lg bg-red-500/10 border-2 border-red-500/30"
            >
              <div className="font-bold flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: answer.teams?.color }}
                />
                {answer.teams?.name}
              </div>
              <div className="text-sm mt-1">{answer.answer}</div>
            </div>
          ))}
        </div>

        {/* Pas de réponse */}
        <div className="space-y-2">
          <h3 className="font-bold text-muted-foreground mb-3">
            Non répondues ({notAnswered.length})
          </h3>
          {notAnswered.map((team) => (
            <div
              key={team.id}
              className="p-3 rounded-lg bg-muted/30 border-2 border-muted"
            >
              <div className="font-bold flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                {team.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
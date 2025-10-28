import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TextAnswersDisplayProps {
  currentQuestionId: string | null;
  gameState: any | null;
}

export const TextAnswersDisplay = ({ currentQuestionId, gameState }: TextAnswersDisplayProps) => {
  const { toast } = useToast();
  const [answers, setAnswers] = useState<any[]>([]);

  useEffect(() => {
    if (currentQuestionId) {
      loadAnswers();

      const answersChannel = supabase
        .channel('text-answers-changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'team_answers',
          filter: `question_id=eq.${currentQuestionId}`
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
  }, [currentQuestionId]);

  const loadAnswers = async () => {
    if (!currentQuestionId || !gameState?.game_session_id) return;

    const { data } = await supabase
      .from('team_answers')
      .select('*, teams(name, color)')
      .eq('question_id', currentQuestionId)
      .eq('game_session_id', gameState.game_session_id)
      .order('answered_at', { ascending: true });

    if (data) setAnswers(data);
  };

  const markAnswer = async (answerId: string, teamId: string, isCorrect: boolean, points: number) => {
    // Récupérer le score actuel de l'équipe et l'ancien statut de la réponse
    const answer = answers.find(a => a.id === answerId);
    if (!answer) return;

    const { data: team } = await supabase
      .from('teams')
      .select('score')
      .eq('id', teamId)
      .single();

    if (!team) return;

    // Calculer l'ajustement de score
    const oldPoints = answer.points_awarded || 0;
    const newPoints = isCorrect ? points : 0;
    const scoreDelta = newPoints - oldPoints;

    // Mettre à jour la réponse
    const { error } = await supabase
      .from('team_answers')
      .update({ 
        is_correct: isCorrect,
        points_awarded: newPoints
      })
      .eq('id', answerId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de noter la réponse",
        variant: "destructive"
      });
      return;
    }

    // Ajuster le score de l'équipe
    if (scoreDelta !== 0) {
      await supabase
        .from('teams')
        .update({ score: team.score + scoreDelta })
        .eq('id', teamId);
    }

    toast({
      title: isCorrect ? "Réponse correcte" : "Réponse incorrecte",
      description: scoreDelta !== 0 ? `Score ajusté de ${scoreDelta > 0 ? '+' : ''}${scoreDelta} pts` : undefined
    });
    
    loadAnswers();
  };

  if (!currentQuestionId || answers.length === 0) return null;

  return (
    <Card className="p-6 bg-card/80 backdrop-blur-sm border-accent/20">
      <h2 className="text-2xl font-bold text-accent mb-4">
        Réponses texte ({answers.length})
      </h2>
      <div className="space-y-3">
        {answers.map((answer) => (
          <div
            key={answer.id}
            className="p-4 rounded-lg border border-border bg-muted/50"
            style={{ borderLeftColor: answer.teams?.color, borderLeftWidth: '4px' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="font-bold mb-1" style={{ color: answer.teams?.color }}>
                  {answer.teams?.name}
                </div>
                <div className="text-lg mb-2">{answer.answer}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(answer.answered_at).toLocaleTimeString('fr-FR')}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={answer.is_correct === true ? "default" : "outline"}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => markAnswer(answer.id, answer.team_id, true, 10)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={answer.is_correct === false ? "default" : "outline"}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => markAnswer(answer.id, answer.team_id, false, 0)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {answer.is_correct !== null && (
              <div className={`mt-2 text-sm font-bold ${answer.is_correct ? 'text-green-500' : 'text-red-500'}`}>
                {answer.is_correct ? `✓ Correct (+${answer.points_awarded} pts)` : '✗ Incorrect'}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

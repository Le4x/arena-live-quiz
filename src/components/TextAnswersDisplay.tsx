import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TextAnswersDisplayProps {
  currentQuestionId: string | null;
  gameState: any | null;
  currentQuestion: any | null;
}

export const TextAnswersDisplay = memo(({ currentQuestionId, gameState, currentQuestion }: TextAnswersDisplayProps) => {
  const { toast } = useToast();
  const [answers, setAnswers] = useState<any[]>([]);

  // Charger les réponses dès que les données sont disponibles
  useEffect(() => {
    console.log('💬 TextAnswersDisplay - Props changed:', { 
      currentQuestionId, 
      questionType: currentQuestion?.question_type,
      sessionId: gameState?.game_session_id,
      instanceId: gameState?.current_question_instance_id
    });
    
    if (currentQuestionId && currentQuestion?.question_type === 'free_text' && gameState?.game_session_id && gameState?.current_question_instance_id) {
      console.log('💬 TextAnswersDisplay - Conditions OK, loading answers');
      loadAnswers();

      // Canal unique pour éviter les conflits
      const channelName = `text-answers-${currentQuestionId}-${gameState.current_question_instance_id}`;
      console.log('💬 TextAnswersDisplay - Subscribing to channel:', channelName);
      
      const answersChannel = supabase
        .channel(channelName)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'team_answers',
          filter: `question_instance_id=eq.${gameState.current_question_instance_id}`
        }, (payload) => {
          console.log('💬 TextAnswersDisplay - Realtime update:', payload);
          loadAnswers();
        })
        .subscribe((status) => {
          console.log('💬 TextAnswersDisplay - Subscription status:', status);
        });

      return () => {
        console.log('💬 TextAnswersDisplay - Cleaning up channel:', channelName);
        supabase.removeChannel(answersChannel);
      };
    } else {
      console.log('💬 TextAnswersDisplay - Conditions not met, clearing answers');
      setAnswers([]);
    }
  }, [currentQuestionId, currentQuestion?.question_type, gameState?.game_session_id, gameState?.current_question_instance_id]);

  const loadAnswers = async () => {
    if (!currentQuestionId || !gameState?.game_session_id || !gameState?.current_question_instance_id) {
      console.log('💬 TextAnswersDisplay - Missing required data:', {
        hasQuestionId: !!currentQuestionId,
        hasSessionId: !!gameState?.game_session_id,
        hasInstanceId: !!gameState?.current_question_instance_id
      });
      return;
    }

    console.log('💬 TextAnswersDisplay - Loading answers with:', { 
      currentQuestionId, 
      sessionId: gameState.game_session_id,
      instanceId: gameState.current_question_instance_id
    });

    const { data, error } = await supabase
      .from('team_answers')
      .select('*, teams(name, color)')
      .eq('question_instance_id', gameState.current_question_instance_id)
      .eq('game_session_id', gameState.game_session_id)
      .order('answered_at', { ascending: true });

    if (error) {
      console.error('💬 TextAnswersDisplay - Error loading answers:', error);
    } else {
      console.log('💬 TextAnswersDisplay - Loaded', data?.length || 0, 'answers:', data);
      if (data) setAnswers(data);
    }
  };

  const markAnswer = async (answerId: string, isCorrect: boolean, teamId: string, pointsValue: number) => {
    const pointsToAward = isCorrect ? pointsValue : 0;
    
    // Marquer la réponse
    const { error } = await supabase
      .from('team_answers')
      .update({ 
        is_correct: isCorrect,
        points_awarded: pointsToAward
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
    
    // Mettre à jour le score de l'équipe
    const { data: team } = await supabase
      .from('teams')
      .select('score')
      .eq('id', teamId)
      .single();
    
    if (team) {
      await supabase
        .from('teams')
        .update({ score: team.score + pointsToAward })
        .eq('id', teamId);
    }
    
    toast({
      title: isCorrect ? "✅ Réponse validée" : "❌ Réponse refusée",
      description: isCorrect ? `+${pointsValue} points` : "0 point"
    });
    
    loadAnswers();
  };

  // Ne rien afficher si pas une question free text
  if (!currentQuestion || currentQuestion.question_type !== 'free_text') return null;
  
  // Afficher le composant même sans réponse pour voir qu'il y a une question active
  if (!currentQuestionId) return null;

  const validatedCount = useMemo(() => answers.filter(a => a.is_correct !== null).length, [answers]);

  return (
    <Card className="p-3 bg-card/80 backdrop-blur-sm border-accent/20 mt-2">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold text-accent">
          Réponses texte ({answers.length})
        </h3>
        <span className="text-xs text-muted-foreground">
          {validatedCount}/{answers.length} validées
        </span>
      </div>
      {answers.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-2">
          En attente de réponses...
        </div>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {answers.map((answer) => (
            <div
              key={answer.id}
              className="flex items-center gap-2 p-2 rounded border border-border bg-muted/30 text-sm"
              style={{ borderLeftColor: answer.teams?.color, borderLeftWidth: '3px' }}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: answer.teams?.color }}
              />
              <div className="font-bold truncate w-20 flex-shrink-0" style={{ color: answer.teams?.color }}>
                {answer.teams?.name}
              </div>
              <div className="flex-1 truncate">{answer.answer}</div>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  variant={answer.is_correct === true ? "default" : "ghost"}
                  className={`h-6 w-6 p-0 ${answer.is_correct === true ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-600/20'}`}
                  onClick={() => markAnswer(answer.id, true, answer.team_id, currentQuestion?.points || 10)}
                  disabled={answer.is_correct !== null}
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant={answer.is_correct === false ? "default" : "ghost"}
                  className={`h-6 w-6 p-0 ${answer.is_correct === false ? 'bg-red-600 hover:bg-red-700' : 'hover:bg-red-600/20'}`}
                  onClick={() => markAnswer(answer.id, false, answer.team_id, currentQuestion?.points || 10)}
                  disabled={answer.is_correct !== null}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
});

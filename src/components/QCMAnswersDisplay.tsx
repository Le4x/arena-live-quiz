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

  console.log('📊 [QCMAnswersDisplay] Props reçues:', {
    questionId: currentQuestion?.id,
    questionType: currentQuestion?.question_type,
    sessionId: gameState?.game_session_id
  });

  useEffect(() => {
    if (gameState?.game_session_id) {
      loadTeams();
    }
  }, [gameState?.game_session_id]);

  useEffect(() => {
    console.log('📊 QCMAnswersDisplay - Question changed:', { 
      questionId: currentQuestion?.id, 
      questionType: currentQuestion?.question_type,
      sessionId: gameState?.game_session_id 
    });

    if (currentQuestion?.id && currentQuestion?.question_type === 'qcm' && gameState?.game_session_id) {
      loadAnswers();

      // Canal unique pour éviter les conflits
      const channelName = `qcm-answers-${currentQuestion.id}-${gameState.game_session_id}`;
      const answersChannel = supabase
        .channel(channelName)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'team_answers',
          filter: `question_id=eq.${currentQuestion.id}`
        }, (payload) => {
          console.log('📊 QCMAnswersDisplay - Realtime update:', payload);
          loadAnswers();
        })
        .subscribe((status) => {
          console.log('📊 QCMAnswersDisplay - Subscription status:', status);
        });

      return () => {
        console.log('📊 QCMAnswersDisplay - Cleaning up channel');
        supabase.removeChannel(answersChannel);
      };
    } else {
      setAnswers([]);
    }
  }, [currentQuestion?.id, currentQuestion?.question_type, gameState?.game_session_id]);

  const loadTeams = async () => {
    if (!gameState?.game_session_id) {
      console.log('📊 [QCMAnswersDisplay] Pas de session, équipes non chargées');
      setTeams([]);
      return;
    }
    
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('game_session_id', gameState.game_session_id);
      
    if (data) {
      console.log('📊 [QCMAnswersDisplay] Équipes chargées:', data.length);
      setTeams(data);
    } else {
      setTeams([]);
    }
  };

  const loadAnswers = async () => {
    if (!currentQuestion?.id || !gameState?.game_session_id) return;

    console.log('🔄 [QCMAnswersDisplay] Chargement réponses pour question:', currentQuestion.id);

    const { data } = await supabase
      .from('team_answers')
      .select('*, teams(name, color)')
      .eq('question_id', currentQuestion.id)
      .eq('game_session_id', gameState.game_session_id)
      .order('answered_at', { ascending: true });

    console.log('📊 [QCMAnswersDisplay] Réponses chargées:', data?.length || 0);

    if (data) {
      // Validation automatique et mise à jour en base
      let hasUpdates = false;
      for (const answer of data) {
        if (answer.is_correct === null) {
          const isCorrect = answer.answer.toLowerCase().trim() === currentQuestion.correct_answer?.toLowerCase().trim();
          console.log('✅ [QCMAnswersDisplay] Validation auto:', answer.teams?.name, isCorrect ? 'CORRECT' : 'INCORRECT');
          await supabase
            .from('team_answers')
            .update({ 
              is_correct: isCorrect,
              points_awarded: isCorrect ? (currentQuestion.points || 10) : 0
            })
            .eq('id', answer.id);
          hasUpdates = true;
        }
      }
      
      // Recharger les réponses après validation si nécessaire
      if (hasUpdates) {
        const { data: updatedData } = await supabase
          .from('team_answers')
          .select('*, teams(name, color)')
          .eq('question_id', currentQuestion.id)
          .eq('game_session_id', gameState.game_session_id)
          .order('answered_at', { ascending: true });
        
        if (updatedData) {
          console.log('✅ [QCMAnswersDisplay] Réponses mises à jour affichées');
          setAnswers(updatedData);
        }
      } else {
        // Pas de validation nécessaire, afficher directement
        setAnswers(data);
      }
    }
  };

  if (!currentQuestion || currentQuestion.question_type !== 'qcm') {
    console.log('📊 [QCMAnswersDisplay] Pas de question QCM, masqué');
    return null;
  }

  const correctAnswers = answers.filter(a => a.is_correct === true);
  const incorrectAnswers = answers.filter(a => a.is_correct === false);
  const notAnswered = teams.filter(t => !answers.find(a => a.team_id === t.id));

  return (
    <Card className="p-3 bg-card/80 backdrop-blur-sm border-accent/20 mb-2">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-accent flex items-center gap-2">
          <Users className="h-4 w-4" />
          QCM ({answers.length}/{teams.length})
        </h3>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            <span className="font-bold">{correctAnswers.length}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5 text-red-500" />
            <span className="font-bold">{incorrectAnswers.length}</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="font-bold">{notAnswered.length}</span> non répondu
          </span>
        </div>
      </div>
      
      {/* Affichage compact des équipes */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {correctAnswers.map((answer) => (
          <div
            key={answer.id}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/20 border border-green-500/40"
            title={`${answer.teams?.name} - ${answer.answer}`}
          >
            <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: answer.teams?.color }}
            />
            <span className="text-xs font-bold truncate max-w-[100px]">{answer.teams?.name}</span>
          </div>
        ))}
        {incorrectAnswers.map((answer) => (
          <div
            key={answer.id}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/20 border border-red-500/40"
            title={`${answer.teams?.name} - ${answer.answer}`}
          >
            <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: answer.teams?.color }}
            />
            <span className="text-xs font-bold truncate max-w-[100px]">{answer.teams?.name}</span>
          </div>
        ))}
        {notAnswered.map((team) => (
          <div
            key={team.id}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/30 border border-muted"
            title={team.name}
          >
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: team.color }}
            />
            <span className="text-xs font-bold text-muted-foreground truncate max-w-[100px]">{team.name}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
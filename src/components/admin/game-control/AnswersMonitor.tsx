/**
 * AnswersMonitor - Monitoring des réponses des équipes
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { BuzzerMonitor } from '@/components/BuzzerMonitor';
import { QCMAnswersDisplay } from '@/components/QCMAnswersDisplay';
import { TextAnswersDisplay } from '@/components/TextAnswersDisplay';
import { useState, useEffect } from 'react';

interface AnswersMonitorProps {
  sessionId: string;
  currentQuestion: any;
  teams: any[];
  gameState: any;
  onLoadData: () => void;
}

export const AnswersMonitor = ({
  sessionId,
  currentQuestion,
  teams,
  gameState,
  onLoadData,
}: AnswersMonitorProps) => {
  const { toast } = useToast();
  const [buzzers, setBuzzers] = useState<any[]>([]);
  const [qcmAnswers, setQcmAnswers] = useState<any[]>([]);
  const [textAnswers, setTextAnswers] = useState<any[]>([]);

  // Load answers based on question type
  useEffect(() => {
    if (!currentQuestion) return;

    const loadAnswers = async () => {
      if (currentQuestion.question_type === 'buzzer') {
        const { data } = await supabase
          .from('buzzers')
          .select('*')
          .eq('question_id', currentQuestion.id)
          .order('created_at', { ascending: true });
        setBuzzers(data || []);
      } else if (currentQuestion.question_type === 'qcm') {
        const { data } = await supabase
          .from('qcm_answers')
          .select('*')
          .eq('question_id', currentQuestion.id);
        setQcmAnswers(data || []);
      } else if (currentQuestion.question_type === 'free_text') {
        const { data } = await supabase
          .from('text_answers')
          .select('*')
          .eq('question_id', currentQuestion.id);
        setTextAnswers(data || []);
      }
    };

    loadAnswers();
  }, [currentQuestion]);

  const toggleReveal = async () => {
    try {
      await supabase.from('game_state').update({
        show_answer: !gameState?.show_answer,
      }).eq('game_session_id', sessionId);

      toast({
        title: gameState?.show_answer ? 'Réponse cachée' : 'Réponse révélée',
      });
      onLoadData();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (!currentQuestion) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Aucune question active</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{currentQuestion.question_text}</h3>
            <p className="text-sm text-muted-foreground">
              Type: {currentQuestion.question_type}
            </p>
          </div>
          <Button onClick={toggleReveal} variant={gameState?.show_answer ? 'default' : 'outline'}>
            {gameState?.show_answer ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Cacher réponse
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Révéler réponse
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Answers Display */}
      <Card className="p-6">
        {currentQuestion.question_type === 'buzzer' && (
          <BuzzerMonitor
            teams={teams}
            buzzers={buzzers}
            currentQuestionId={currentQuestion.id}
          />
        )}

        {currentQuestion.question_type === 'qcm' && (
          <QCMAnswersDisplay
            teams={teams}
            answers={qcmAnswers}
            currentQuestionId={currentQuestion.id}
            questionOptions={currentQuestion.options}
            correctAnswer={currentQuestion.correct_answer}
          />
        )}

        {currentQuestion.question_type === 'free_text' && (
          <TextAnswersDisplay
            teams={teams}
            answers={textAnswers}
            currentQuestionId={currentQuestion.id}
          />
        )}
      </Card>
    </div>
  );
};

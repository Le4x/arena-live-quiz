/**
 * QuestionSelector - Sélection et lancement de questions
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Play, CheckCircle, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuestionSelectorProps {
  sessionId: string;
  rounds: any[];
  questions: any[];
  currentQuestion: any;
  currentRound: any;
  gameState: any;
  onLoadData: () => void;
}

export const QuestionSelector = ({
  sessionId,
  rounds,
  questions,
  currentQuestion,
  currentRound,
  gameState,
  onLoadData,
}: QuestionSelectorProps) => {
  const { toast } = useToast();

  const activateQuestion = async (questionId: string) => {
    try {
      await supabase.from('game_state').update({
        current_question_id: questionId,
        show_answer: false,
        timer_active: false,
      }).eq('session_id', sessionId);

      toast({ title: 'Question activée' });
      onLoadData();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">Questions disponibles</h3>
        <div className="space-y-2">
          {questions.map((q, idx) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <div
                className={`p-4 rounded-lg border-2 transition-all ${
                  currentQuestion?.id === q.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge>{q.question_type}</Badge>
                      <Badge variant="secondary">{q.points} pts</Badge>
                      {currentQuestion?.id === q.id && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                    <p className="font-semibold">{q.question_text}</p>
                  </div>
                  <Button
                    onClick={() => activateQuestion(q.id)}
                    disabled={currentQuestion?.id === q.id}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Activer
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
};

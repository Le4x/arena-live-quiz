import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Heart, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface PublicVotePanelProps {
  teamId: string;
  finalId: string;
  currentQuestionInstanceId: string | null;
  currentQuestion: any;
  isEliminated: boolean;
}

export const PublicVotePanel = ({ 
  teamId, 
  finalId, 
  currentQuestionInstanceId,
  currentQuestion,
  isEliminated 
}: PublicVotePanelProps) => {
  const { toast } = useToast();
  const [answerOptions, setAnswerOptions] = useState<any[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEliminated && currentQuestionInstanceId && currentQuestion) {
      loadAnswerOptions();
      checkIfVoted();
    }
  }, [isEliminated, currentQuestionInstanceId, finalId, currentQuestion]);

  const loadAnswerOptions = async () => {
    if (!currentQuestion) return;

    if (currentQuestion.question_type === 'qcm') {
      // Pour QCM : afficher les options A, B, C, D
      const options = currentQuestion.options || {};
      const optionsList = Object.entries(options)
        .filter(([_, value]) => value)
        .map(([key, value]) => ({
          id: key,
          text: value as string,
          type: 'option'
        }));
      setAnswerOptions(optionsList);
    } else if (currentQuestion.question_type === 'free_text') {
      // Pour free text : charger les réponses des finalistes
      const { data: answers } = await supabase
        .from('team_answers')
        .select('*, teams(name, color)')
        .eq('question_instance_id', currentQuestionInstanceId)
        .not('answer', 'is', null);

      if (answers) {
        const answersList = answers.map((a: any) => ({
          id: a.id,
          text: a.answer,
          teamName: a.teams?.name,
          teamColor: a.teams?.color,
          type: 'answer'
        }));
        setAnswerOptions(answersList);
      }
    }
  };

  const checkIfVoted = async () => {
    if (!currentQuestionInstanceId) return;

    const { data } = await supabase
      .from('public_votes')
      .select('id')
      .eq('voter_team_id', teamId)
      .eq('question_instance_id', currentQuestionInstanceId)
      .eq('final_id', finalId)
      .maybeSingle();

    setHasVoted(!!data);
  };

  const voteForAnswer = async (answer: string) => {
    if (!currentQuestionInstanceId) {
      toast({
        title: "Impossible de voter",
        description: "Aucune question active",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Vérifier si déjà voté
      const { data: existingVote } = await supabase
        .from('public_votes')
        .select('id')
        .eq('voter_team_id', teamId)
        .eq('question_instance_id', currentQuestionInstanceId)
        .maybeSingle();

      if (existingVote) {
        toast({
          title: "Déjà voté",
          description: "Vous avez déjà voté pour cette question",
          variant: "destructive"
        });
        setHasVoted(true);
        return;
      }

      // Enregistrer le vote
      await supabase.from('public_votes').insert({
        final_id: finalId,
        question_instance_id: currentQuestionInstanceId,
        voter_team_id: teamId,
        voted_answer: answer
      });

      toast({
        title: "✅ Vote enregistré !",
        description: "Merci d'avoir participé"
      });

      setHasVoted(true);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Ne rien afficher si pas éliminé ou pas de question active
  if (!isEliminated || !currentQuestionInstanceId || answerOptions.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-purple-500" />
        <h3 className="font-bold text-lg">Vote du Public</h3>
        {hasVoted && (
          <Badge variant="outline" className="ml-auto">
            <Heart className="h-3 w-3 mr-1" />
            Voté
          </Badge>
        )}
      </div>

      {hasVoted ? (
        <div className="text-center py-6">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-lg font-semibold">Merci pour votre vote !</p>
          <p className="text-sm text-muted-foreground mt-2">
            Votre vote a bien été pris en compte
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            Votez pour la réponse que vous pensez être la bonne :
          </p>

          <div className="grid grid-cols-1 gap-2">
            {answerOptions.map((option) => (
              <motion.div
                key={option.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  onClick={() => voteForAnswer(option.text)}
                  disabled={loading}
                  className="w-full justify-start h-auto py-3 border-2 hover:border-purple-500"
                >
                  {option.type === 'option' ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mr-3">
                        {option.id}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold">{option.text}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div 
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: option.teamColor }}
                      />
                      <div className="flex-1 text-left">
                        <p className="text-xs text-muted-foreground mb-1">{option.teamName}</p>
                        <p className="font-semibold">{option.text}</p>
                      </div>
                    </>
                  )}
                  <CheckCircle2 className="h-4 w-4 text-green-500 ml-2" />
                </Button>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
};

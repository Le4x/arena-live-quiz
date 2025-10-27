import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RoundCreator } from "@/components/RoundCreator";
import { QuestionCreator } from "@/components/QuestionCreator";
import { useToast } from "@/hooks/use-toast";

const AdminSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rounds, setRounds] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    loadRounds();
    loadQuestions();
  }, []);

  const loadRounds = async () => {
    const { data } = await supabase.from('rounds').select('*').order('created_at', { ascending: false });
    if (data) setRounds(data);
  };

  const loadQuestions = async () => {
    const { data } = await supabase.from('questions').select('*').order('display_order', { ascending: true });
    if (data) setQuestions(data);
  };

  const deleteRound = async (roundId: string) => {
    const { error } = await supabase.from('rounds').delete().eq('id', roundId);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer la manche", variant: "destructive" });
    } else {
      toast({ title: "Manche supprimée" });
      loadRounds();
      loadQuestions();
    }
  };

  const deleteQuestion = async (questionId: string) => {
    const { error } = await supabase.from('questions').delete().eq('id', questionId);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer la question", variant: "destructive" });
    } else {
      toast({ title: "Question supprimée" });
      loadQuestions();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-glow p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between py-8">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-arena bg-clip-text text-transparent">
              Configuration du jeu
            </h1>
            <p className="text-muted-foreground text-xl mt-2">Créer et gérer les manches et questions</p>
          </div>
          <Button onClick={() => navigate('/admin')} variant="outline" size="lg">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Retour à la configuration
          </Button>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <RoundCreator onRoundCreated={loadRounds} />
          <QuestionCreator rounds={rounds} onQuestionCreated={loadQuestions} />
        </div>

        {/* Liste des manches et questions */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-secondary/20">
          <h2 className="text-2xl font-bold text-secondary mb-4">Manches créées ({rounds.length})</h2>
          <div className="space-y-4">
            {rounds.map((round) => {
              const roundQuestions = questions.filter(q => q.round_id === round.id);
              return (
                <div key={round.id} className="border border-border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold">{round.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {round.type} • {roundQuestions.length} question{roundQuestions.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteRound(round.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {roundQuestions.length > 0 && (
                    <div className="space-y-2 mt-3 pl-4 border-l-2 border-secondary/30">
                      {roundQuestions.map((question) => (
                        <div
                          key={question.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex-1">
                            <div className="font-semibold">{question.question_text}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {question.question_type} • {question.points} pts
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteQuestion(question.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminSetup;
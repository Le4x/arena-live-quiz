import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, ListMusic, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QuestionCreator } from "@/components/QuestionCreator";
import { RoundCard } from "@/components/admin/RoundCard";
import { RoundDialog } from "@/components/admin/RoundDialog";
import { useToast } from "@/hooks/use-toast";

const AdminSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rounds, setRounds] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [roundDialogOpen, setRoundDialogOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadRounds(), loadQuestions()]);
    setLoading(false);
  };

  const loadRounds = async () => {
    const { data } = await supabase.from('rounds').select('*').order('created_at', { ascending: false });
    if (data) setRounds(data);
  };

  const loadQuestions = async () => {
    const { data } = await supabase.from('questions').select('*').order('display_order', { ascending: true });
    if (data) setQuestions(data);
  };

  const handleCreateRound = () => {
    setSelectedRound(null);
    setRoundDialogOpen(true);
  };

  const handleEditRound = (round: any) => {
    setSelectedRound(round);
    setRoundDialogOpen(true);
  };

  const deleteRound = async (roundId: string) => {
    try {
      // Supprimer d'abord toutes les questions de cette manche
      await supabase.from('questions').delete().eq('round_id', roundId);
      
      // Puis supprimer la manche
      const { error } = await supabase.from('rounds').delete().eq('id', roundId);
      if (error) throw error;
      
      toast({ 
        title: "Manche supprimée", 
        description: "La manche et ses questions ont été supprimées" 
      });
      loadData();
    } catch (error: any) {
      toast({ 
        title: "Erreur", 
        description: error.message || "Impossible de supprimer la manche", 
        variant: "destructive" 
      });
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
              Manches & Questions
            </h1>
            <p className="text-muted-foreground text-xl mt-2">Créez et gérez le contenu de votre jeu</p>
          </div>
          <Button onClick={() => navigate('/admin')} variant="outline" size="lg">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Retour
          </Button>
        </header>

        {loading ? (
          <Card className="p-12 text-center">
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Chargement...
            </div>
          </Card>
        ) : (
          <>
            {/* Section Manches */}
            <Card className="p-6 bg-card/80 backdrop-blur-sm border-secondary/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-secondary flex items-center gap-2">
                  <ListMusic className="h-6 w-6" />
                  Manches ({rounds.length})
                </h2>
                <Button onClick={handleCreateRound} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nouvelle manche
                </Button>
              </div>

              {rounds.length === 0 ? (
                <div className="text-center py-12">
                  <ListMusic className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-bold mb-2">Aucune manche créée</h3>
                  <p className="text-muted-foreground mb-6">
                    Créez votre première manche pour commencer
                  </p>
                  <Button onClick={handleCreateRound} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Créer ma première manche
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {rounds.map((round) => {
                    const roundQuestions = questions.filter(q => q.round_id === round.id);
                    return (
                      <RoundCard
                        key={round.id}
                        round={round}
                        questionsCount={roundQuestions.length}
                        onEdit={handleEditRound}
                        onDelete={deleteRound}
                      />
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Section Questions */}
            <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20">
              <h2 className="text-2xl font-bold text-primary mb-6">
                Ajouter des questions
              </h2>
              <QuestionCreator rounds={rounds} onQuestionCreated={loadQuestions} />
            </Card>
          </>
        )}

        {/* Liste des questions par manche */}
        {!loading && rounds.length > 0 && (
          <Card className="p-6 bg-card/80 backdrop-blur-sm border-accent/20">
            <h2 className="text-2xl font-bold text-accent mb-4">
              Questions par manche ({questions.length} total)
            </h2>
            <div className="space-y-4">
              {rounds.map((round) => {
                const roundQuestions = questions.filter(q => q.round_id === round.id);
                if (roundQuestions.length === 0) return null;
                
                return (
                  <div key={round.id} className="border border-border rounded-lg p-4 bg-muted/30">
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                      {round.title}
                      <span className="text-xs text-muted-foreground font-normal">
                        ({roundQuestions.length} question{roundQuestions.length > 1 ? 's' : ''})
                      </span>
                    </h3>
                    
                    <div className="space-y-2 pl-4 border-l-2 border-accent/30">
                      {roundQuestions.map((question) => (
                        <div
                          key={question.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex-1">
                            <div className="font-semibold">{question.question_text}</div>
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                              <span>{question.question_type}</span>
                              <span>•</span>
                              <span className="text-green-600">+{question.points} pts</span>
                              {question.penalty_points > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-red-600">-{question.penalty_points} pts</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteQuestion(question.id)}
                            className="hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Dialog pour créer/éditer les manches */}
      <RoundDialog
        open={roundDialogOpen}
        onOpenChange={setRoundDialogOpen}
        round={selectedRound}
        onSave={loadData}
      />
    </div>
  );
};

export default AdminSetup;
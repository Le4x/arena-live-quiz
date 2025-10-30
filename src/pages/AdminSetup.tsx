import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, ListMusic, MessageSquareText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoundCard } from "@/components/admin/RoundCard";
import { RoundDialog } from "@/components/admin/RoundDialog";
import { QuestionCard } from "@/components/admin/QuestionCard";
import { QuestionDialog } from "@/components/admin/QuestionDialog";
import { useToast } from "@/hooks/use-toast";

const AdminSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rounds, setRounds] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [roundDialogOpen, setRoundDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<any | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null);
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

  const handleCreateQuestion = () => {
    setSelectedQuestion(null);
    setQuestionDialogOpen(true);
  };

  const handleEditQuestion = (question: any) => {
    setSelectedQuestion(question);
    setQuestionDialogOpen(true);
  };

  const handleDuplicateQuestion = async (question: any) => {
    try {
      const { id, created_at, ...questionData } = question;
      const { error } = await supabase
        .from('questions')
        .insert([{
          ...questionData,
          question_text: `${questionData.question_text} (copie)`
        }]);

      if (error) throw error;

      toast({
        title: "Question dupliquée",
        description: "La question a été dupliquée avec succès"
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
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
    try {
      const { error } = await supabase.from('questions').delete().eq('id', questionId);
      if (error) throw error;

      toast({ 
        title: "Question supprimée",
        description: "La question a été supprimée avec succès"
      });
      loadData();
    } catch (error: any) {
      toast({ 
        title: "Erreur", 
        description: error.message || "Impossible de supprimer la question", 
        variant: "destructive" 
      });
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
          <Tabs defaultValue="rounds" className="space-y-6">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="rounds" className="gap-2">
                <ListMusic className="h-4 w-4" />
                Manches ({rounds.length})
              </TabsTrigger>
              <TabsTrigger value="questions" className="gap-2">
                <MessageSquareText className="h-4 w-4" />
                Questions ({questions.length})
              </TabsTrigger>
            </TabsList>

            {/* Onglet Manches */}
            <TabsContent value="rounds">
              <Card className="p-6 bg-card/80 backdrop-blur-sm border-secondary/20">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-secondary flex items-center gap-2">
                    <ListMusic className="h-6 w-6" />
                    Gestion des manches
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
                          questions={roundQuestions}
                          onEdit={handleEditRound}
                          onDelete={deleteRound}
                          onEditQuestion={handleEditQuestion}
                          onDeleteQuestion={deleteQuestion}
                          onDuplicateQuestion={handleDuplicateQuestion}
                          onCreateQuestion={() => {
                            setSelectedQuestion({ round_id: round.id });
                            setQuestionDialogOpen(true);
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Onglet Questions */}
            <TabsContent value="questions">
              <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                    <MessageSquareText className="h-6 w-6" />
                    Toutes les questions
                  </h2>
                  <Button onClick={handleCreateQuestion} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nouvelle question
                  </Button>
                </div>

                {questions.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquareText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-bold mb-2">Aucune question créée</h3>
                    <p className="text-muted-foreground mb-6">
                      Créez votre première question pour commencer
                    </p>
                    <Button onClick={handleCreateQuestion} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Créer ma première question
                    </Button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {questions.map((question) => {
                      const round = rounds.find(r => r.id === question.round_id);
                      return (
                        <QuestionCard
                          key={question.id}
                          question={question}
                          roundTitle={round?.title || "Manche inconnue"}
                          onEdit={handleEditQuestion}
                          onDelete={deleteQuestion}
                          onDuplicate={handleDuplicateQuestion}
                        />
                      );
                    })}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Dialog pour créer/éditer les manches */}
      <RoundDialog
        open={roundDialogOpen}
        onOpenChange={setRoundDialogOpen}
        round={selectedRound}
        onSave={loadData}
      />

      {/* Dialog pour créer/éditer les questions */}
      <QuestionDialog
        open={questionDialogOpen}
        onOpenChange={setQuestionDialogOpen}
        question={selectedQuestion}
        rounds={rounds}
        onSave={loadData}
      />
    </div>
  );
};

export default AdminSetup;
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, Gamepad2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { SessionCard } from "@/components/admin/SessionCard";
import { SessionDialog } from "@/components/admin/SessionDialog";

const AdminSessions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      console.error('Error loading sessions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les sessions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedSession(null);
    setDialogOpen(true);
  };

  const handleEdit = (session: any) => {
    setSelectedSession(session);
    setDialogOpen(true);
  };

  const handleDelete = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('game_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Session supprimée",
        description: "La session a été supprimée avec succès"
      });
      loadSessions();
    } catch (error: any) {
      console.error('Error deleting session:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleActivate = async (sessionId: string) => {
    try {
      // Désactiver toutes les autres sessions
      await supabase
        .from('game_sessions')
        .update({ status: 'draft' })
        .neq('id', sessionId);

      // Activer la session sélectionnée
      const { error } = await supabase
        .from('game_sessions')
        .update({
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Session activée",
        description: "La session est maintenant active"
      });
      loadSessions();
    } catch (error: any) {
      console.error('Error activating session:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDuplicate = async (session: any) => {
    try {
      toast({
        title: "Duplication en cours...",
        description: "Création de la copie de la session"
      });

      // Parse selected_rounds
      const selectedRounds = session.selected_rounds ?
        (typeof session.selected_rounds === 'string' ? JSON.parse(session.selected_rounds) : session.selected_rounds)
        : [];

      // Map old round IDs to new round IDs
      const roundIdMap: Record<string, string> = {};

      // Duplicate each round and its questions
      for (const oldRoundId of selectedRounds) {
        // Fetch the original round
        const { data: originalRound, error: roundFetchError } = await supabase
          .from('rounds')
          .select('*')
          .eq('id', oldRoundId)
          .single();

        if (roundFetchError) {
          console.error('Error fetching round:', roundFetchError);
          continue;
        }

        // Create new round (without id, let DB generate it)
        const { data: newRound, error: roundInsertError } = await supabase
          .from('rounds')
          .insert({
            title: originalRound.title,
            type: originalRound.type,
            status: 'pending',
            jingle_url: originalRound.jingle_url,
            timer_duration: originalRound.timer_duration
          })
          .select()
          .single();

        if (roundInsertError || !newRound) {
          console.error('Error creating round:', roundInsertError);
          continue;
        }

        roundIdMap[oldRoundId] = newRound.id;

        // Fetch all questions for this round
        const { data: questions, error: questionsFetchError } = await supabase
          .from('questions')
          .select('*')
          .eq('round_id', oldRoundId);

        if (questionsFetchError) {
          console.error('Error fetching questions:', questionsFetchError);
          continue;
        }

        // Duplicate each question
        if (questions && questions.length > 0) {
          const newQuestions = questions.map(q => ({
            round_id: newRound.id,
            question_text: q.question_text,
            question_type: q.question_type,
            correct_answer: q.correct_answer,
            options: q.options,
            audio_url: q.audio_url,
            image_url: q.image_url,
            points: q.points,
            penalty_points: q.penalty_points,
            display_order: q.display_order,
            stop_time: q.stop_time,
            lyrics: q.lyrics,
            cue_points: q.cue_points
          }));

          const { error: questionsInsertError } = await supabase
            .from('questions')
            .insert(newQuestions);

          if (questionsInsertError) {
            console.error('Error creating questions:', questionsInsertError);
          }
        }
      }

      // Create the new session with updated round IDs
      const newSelectedRounds = selectedRounds.map((oldId: string) => roundIdMap[oldId] || oldId);

      const { error: sessionInsertError } = await supabase
        .from('game_sessions')
        .insert({
          name: `Copie de ${session.name}`,
          status: 'draft',
          selected_rounds: newSelectedRounds,
          has_final: session.has_final,
          logo_url: session.logo_url
        });

      if (sessionInsertError) throw sessionInsertError;

      toast({
        title: "Session dupliquée",
        description: "La copie a été créée avec succès"
      });
      loadSessions();
    } catch (error: any) {
      console.error('Error duplicating session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de dupliquer la session",
        variant: "destructive"
      });
    }
  };

  const activeSessions = sessions.filter(s => s.status === 'active');
  const draftSessions = sessions.filter(s => s.status === 'draft');
  const endedSessions = sessions.filter(s => s.status === 'ended');

  return (
    <div className="min-h-screen bg-gradient-glow p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between py-8">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-arena bg-clip-text text-transparent">
              Gestion des sessions
            </h1>
            <p className="text-muted-foreground text-xl mt-2">
              Créez et gérez vos parties de jeu
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleCreateNew} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Nouvelle session
            </Button>
            <Button onClick={() => navigate('/admin')} variant="outline" size="lg">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Retour
            </Button>
          </div>
        </header>

        {loading ? (
          <Card className="p-12 text-center">
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Chargement des sessions...
            </div>
          </Card>
        ) : sessions.length === 0 ? (
          <Card className="p-12 text-center bg-card/80 backdrop-blur-sm">
            <Gamepad2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-2xl font-bold mb-2">Aucune session créée</h3>
            <p className="text-muted-foreground mb-6">
              Créez votre première session pour commencer à organiser vos jeux
            </p>
            <Button onClick={handleCreateNew} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Créer ma première session
            </Button>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Sessions actives */}
            {activeSessions.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                  Session active
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {activeSessions.map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onActivate={handleActivate}
                      onDuplicate={handleDuplicate}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Brouillons */}
            {draftSessions.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">
                  Brouillons ({draftSessions.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {draftSessions.map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onActivate={handleActivate}
                      onDuplicate={handleDuplicate}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sessions terminées */}
            {endedSessions.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 text-muted-foreground">
                  Terminées ({endedSessions.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {endedSessions.map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onActivate={handleActivate}
                      onDuplicate={handleDuplicate}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog pour créer/éditer */}
      <SessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        session={selectedSession}
        onSave={loadSessions}
      />
    </div>
  );
};

export default AdminSessions;

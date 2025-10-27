import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Play, Trash2, RefreshCw, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function AdminSessions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [newSessionName, setNewSessionName] = useState("");
  const [selectedRounds, setSelectedRounds] = useState<string[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadSessions();
    loadRounds();
  }, []);

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from("game_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading sessions:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les sessions",
        variant: "destructive",
      });
      return;
    }

    setSessions(data || []);
  };

  const loadRounds = async () => {
    const { data } = await supabase
      .from("rounds")
      .select("*")
      .order("created_at", { ascending: true });
    
    setRounds(data || []);
  };

  const createSession = async () => {
    if (!newSessionName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nom de session",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("game_sessions")
      .insert({
        name: newSessionName,
        selected_rounds: selectedRounds,
        status: "draft",
      });

    if (error) {
      console.error("Error creating session:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la session",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Succès",
      description: "Session créée avec succès",
    });

    setNewSessionName("");
    setSelectedRounds([]);
    setShowCreateForm(false);
    loadSessions();
  };

  const startSession = async (sessionId: string) => {
    // Désactiver toutes les autres sessions
    await supabase
      .from("game_sessions")
      .update({ status: "completed" })
      .neq("id", sessionId)
      .in("status", ["active"]);

    // Activer la session sélectionnée
    const { error } = await supabase
      .from("game_sessions")
      .update({
        status: "active",
        started_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) {
      console.error("Error starting session:", error);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer la session",
        variant: "destructive",
      });
      return;
    }

    // Mettre à jour game_state avec cette session
    const { data: gameStateData } = await supabase
      .from("game_state")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (gameStateData) {
      await supabase
        .from("game_state")
        .update({ game_session_id: sessionId })
        .eq("id", gameStateData.id);
    }

    toast({
      title: "Succès",
      description: "Session démarrée",
    });

    loadSessions();
  };

  const resetSession = async (sessionId: string) => {
    const { error } = await supabase.rpc("reset_game_session", {
      session_id: sessionId,
    });

    if (error) {
      console.error("Error resetting session:", error);
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser la session",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Succès",
      description: "Session réinitialisée",
    });
  };

  const deleteSession = async (sessionId: string) => {
    const { error } = await supabase
      .from("game_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      console.error("Error deleting session:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la session",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Succès",
      description: "Session supprimée",
    });

    loadSessions();
  };

  const toggleRoundSelection = (roundId: string) => {
    setSelectedRounds(prev =>
      prev.includes(roundId)
        ? prev.filter(id => id !== roundId)
        : [...prev, roundId]
    );
  };

  const getRoundNames = (roundIds: string[]) => {
    return rounds
      .filter(r => roundIds.includes(r.id))
      .map(r => r.title)
      .join(", ");
  };

  return (
    <div className="min-h-screen bg-gradient-glow p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-4xl font-bold text-foreground">
              Gestion des Sessions
            </h1>
          </div>

          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="mr-2 h-5 w-5" />
            Nouvelle Session
          </Button>
        </div>

        {showCreateForm && (
          <Card className="p-6 space-y-4">
            <h2 className="text-2xl font-bold">Créer une nouvelle session</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Nom de la session
              </label>
              <Input
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="Ex: Soirée Quiz du 27 octobre"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Sélectionner les manches
              </label>
              <div className="space-y-2">
                {rounds.map((round) => (
                  <div key={round.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={round.id}
                      checked={selectedRounds.includes(round.id)}
                      onCheckedChange={() => toggleRoundSelection(round.id)}
                    />
                    <label
                      htmlFor={round.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {round.title} ({round.type})
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={createSession} className="bg-primary">
                Créer la session
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewSessionName("");
                  setSelectedRounds([]);
                }}
              >
                Annuler
              </Button>
            </div>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Sessions existantes</h2>
          {sessions.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              Aucune session créée. Créez votre première session pour commencer !
            </Card>
          ) : (
            sessions.map((session) => (
              <Card key={session.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{session.name}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          session.status === "active"
                            ? "bg-green-500/20 text-green-500"
                            : session.status === "completed"
                            ? "bg-gray-500/20 text-gray-500"
                            : "bg-blue-500/20 text-blue-500"
                        }`}
                      >
                        {session.status === "active"
                          ? "Active"
                          : session.status === "completed"
                          ? "Terminée"
                          : "Brouillon"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Manches: {getRoundNames(session.selected_rounds) || "Aucune manche sélectionnée"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Créée le {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {session.status !== "active" && (
                      <Button
                        size="sm"
                        onClick={() => startSession(session.id)}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Démarrer
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resetSession(session.id)}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Réinitialiser
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteSession(session.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

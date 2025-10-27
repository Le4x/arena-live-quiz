import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, SkipForward, Trophy, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Regie = () => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<any[]>([]);
  const [gameState, setGameState] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);

  useEffect(() => {
    loadTeams();
    loadGameState();
    
    // Realtime subscriptions
    const teamsChannel = supabase
      .channel('teams-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        loadTeams();
      })
      .subscribe();

    const gameStateChannel = supabase
      .channel('game-state-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, () => {
        loadGameState();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(gameStateChannel);
    };
  }, []);

  const loadTeams = async () => {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .order('score', { ascending: false });
    if (data) setTeams(data);
  };

  const loadGameState = async () => {
    const { data } = await supabase
      .from('game_state')
      .select('*, questions(*)')
      .single();
    if (data) {
      setGameState(data);
      setCurrentQuestion(data.questions);
    }
  };

  const toggleBuzzer = async () => {
    if (!gameState) return;
    
    const { error } = await supabase
      .from('game_state')
      .update({ is_buzzer_active: !gameState.is_buzzer_active })
      .eq('id', gameState.id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'activer le buzzer",
        variant: "destructive"
      });
    } else {
      toast({
        title: gameState.is_buzzer_active ? "Buzzer désactivé" : "Buzzer activé",
        description: gameState.is_buzzer_active ? "Les buzzers sont maintenant désactivés" : "Les équipes peuvent buzzer !",
      });
    }
  };

  const showLeaderboard = async () => {
    if (!gameState) return;
    
    await supabase
      .from('game_state')
      .update({ show_leaderboard: !gameState.show_leaderboard })
      .eq('id', gameState.id);

    toast({
      title: gameState.show_leaderboard ? "Classement masqué" : "Classement affiché",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-glow p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="text-center py-8 animate-slide-in">
          <h1 className="text-6xl font-bold bg-gradient-arena bg-clip-text text-transparent animate-pulse-glow">
            ARENA
          </h1>
          <p className="text-muted-foreground text-xl mt-2">Régie - MusicArena #1</p>
        </header>

        {/* Contrôles principaux */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20">
          <h2 className="text-2xl font-bold text-primary mb-4">Contrôles du jeu</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              size="lg" 
              className="h-20 bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-gold"
              onClick={toggleBuzzer}
            >
              <Zap className="mr-2 h-6 w-6" />
              {gameState?.is_buzzer_active ? "Désactiver Buzzer" : "Activer Buzzer"}
            </Button>
            <Button 
              size="lg" 
              variant="secondary" 
              className="h-20 bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-glow-blue"
            >
              <Play className="mr-2 h-6 w-6" />
              Lancer Musique
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="h-20 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
            >
              <Pause className="mr-2 h-6 w-6" />
              Pause
            </Button>
            <Button 
              size="lg" 
              className="h-20 bg-gradient-arena hover:opacity-90"
              onClick={showLeaderboard}
            >
              <Trophy className="mr-2 h-6 w-6" />
              {gameState?.show_leaderboard ? "Masquer" : "Afficher"} Classement
            </Button>
          </div>
        </Card>

        {/* Équipes connectées */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-secondary/20">
          <h2 className="text-2xl font-bold text-secondary mb-4">
            Équipes connectées ({teams.length}/30)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="p-4 rounded-lg border border-border bg-muted/50 hover:bg-muted/80 transition-colors"
                style={{ borderLeftColor: team.color, borderLeftWidth: '4px' }}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">{team.name}</h3>
                  <span className="text-2xl font-bold text-primary">{team.score}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {team.is_active ? "🟢 Actif" : "🔴 Inactif"}
                </div>
              </div>
            ))}
            {teams.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Aucune équipe connectée
              </div>
            )}
          </div>
        </Card>

        {/* Question actuelle */}
        {currentQuestion && (
          <Card className="p-6 bg-card/80 backdrop-blur-sm border-accent/20">
            <h2 className="text-2xl font-bold text-accent mb-4">Question actuelle</h2>
            <p className="text-xl">{currentQuestion.question_text}</p>
            <div className="mt-4 text-sm text-muted-foreground">
              Type: {currentQuestion.question_type} • Points: {currentQuestion.points}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Regie;

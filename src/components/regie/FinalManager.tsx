import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trophy, Play, Settings, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FinalManagerProps {
  sessionId: string;
  gameState: any;
}

export const FinalManager = ({ sessionId, gameState }: FinalManagerProps) => {
  const { toast } = useToast();
  const [jokerTypes, setJokerTypes] = useState<any[]>([]);
  const [jokerConfig, setJokerConfig] = useState<{ [key: string]: number }>({});
  const [final, setFinal] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadJokerTypes();
    loadTeams();
    loadFinal();
  }, [sessionId]);

  const loadJokerTypes = async () => {
    const { data } = await supabase
      .from('joker_types')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (data) {
      setJokerTypes(data);
      // Initialiser la config avec 2 jokers de chaque type
      const config: { [key: string]: number } = {};
      data.forEach(jt => config[jt.id] = 2);
      setJokerConfig(config);
    }
  };

  const loadTeams = async () => {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .order('score', { ascending: false });
    
    if (data) setTeams(data);
  };

  const loadFinal = async () => {
    const { data } = await supabase
      .from('finals')
      .select('*')
      .eq('game_session_id', sessionId)
      .maybeSingle();
    
    if (data) setFinal(data);
  };

  const createFinal = async () => {
    if (teams.length < 8) {
      toast({
        title: "Erreur",
        description: "Il faut au moins 8 équipes pour lancer la finale",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Sélectionner les 8 meilleures équipes
      const top8Teams = teams.slice(0, 8).map(t => t.id);

      // Créer la finale
      const { data: newFinal, error: finalError } = await supabase
        .from('finals')
        .insert({
          game_session_id: sessionId,
          status: 'pending',
          finalist_teams: top8Teams
        })
        .select()
        .single();

      if (finalError) throw finalError;

      // Créer les jokers pour chaque équipe
      const jokersToInsert = [];
      for (const teamId of top8Teams) {
        for (const [jokerTypeId, quantity] of Object.entries(jokerConfig)) {
          if (quantity > 0) {
            jokersToInsert.push({
              final_id: newFinal.id,
              team_id: teamId,
              joker_type_id: jokerTypeId,
              quantity
            });
          }
        }
      }

      const { error: jokersError } = await supabase
        .from('final_jokers')
        .insert(jokersToInsert);

      if (jokersError) throw jokersError;

      toast({
        title: "🏆 Finale créée !",
        description: `Les 8 finalistes ont été sélectionnés avec leurs jokers`
      });

      setFinal(newFinal);
    } catch (error: any) {
      console.error('Error creating final:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startFinalIntro = async () => {
    if (!final) return;

    try {
      // Mettre la finale en mode intro
      await supabase
        .from('finals')
        .update({ status: 'intro', started_at: new Date().toISOString() })
        .eq('id', final.id);

      // Activer le mode final dans game_state
      await supabase
        .from('game_state')
        .update({ 
          final_mode: true,
          final_id: final.id,
          show_welcome_screen: false,
          show_waiting_screen: false
        })
        .eq('game_session_id', sessionId);

      toast({
        title: "🎬 Introduction lancée !",
        description: "L'écran d'introduction de la finale est affiché"
      });

      loadFinal();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const activateFinal = async () => {
    if (!final) return;

    try {
      await supabase
        .from('finals')
        .update({ status: 'active' })
        .eq('id', final.id);

      toast({
        title: "🏁 Finale activée !",
        description: "Le mode final est maintenant actif"
      });

      loadFinal();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const top8 = teams.slice(0, 8);
  const finalists = final?.finalist_teams || [];

  return (
    <Card className="p-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="h-8 w-8 text-yellow-500" />
        <div>
          <h2 className="text-2xl font-bold text-yellow-500">Mode Final</h2>
          <p className="text-sm text-muted-foreground">Gérez la finale avec les 8 meilleures équipes</p>
        </div>
      </div>

      {!final ? (
        <>
          {/* Configuration des jokers */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Configuration des Jokers</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jokerTypes.map(jt => (
                <div key={jt.id} className="flex items-center gap-3 p-3 bg-card/50 rounded-lg border border-border">
                  <span className="text-3xl">{jt.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{jt.name.replace('_', ' ')}</p>
                    <p className="text-xs text-muted-foreground">{jt.description}</p>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    value={jokerConfig[jt.id] || 0}
                    onChange={(e) => setJokerConfig({
                      ...jokerConfig,
                      [jt.id]: parseInt(e.target.value) || 0
                    })}
                    className="w-16 text-center"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Top 8 Preview */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Top 8 Actuel</h3>
              <Badge variant="outline" className="ml-auto">
                {teams.length} équipes au total
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {top8.map((team, index) => (
                <div
                  key={team.id}
                  className="flex items-center gap-2 p-2 bg-card/50 rounded border border-border"
                >
                  <Badge className="bg-yellow-500 text-black font-bold">#{index + 1}</Badge>
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="text-sm font-semibold truncate">{team.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{team.score}pts</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bouton créer finale */}
          <Button
            onClick={createFinal}
            disabled={loading || teams.length < 8}
            size="lg"
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold text-lg h-14"
          >
            <Trophy className="mr-2 h-6 w-6" />
            {loading ? "Création..." : "🏆 Créer la Finale"}
          </Button>
        </>
      ) : (
        <>
          {/* Finale existante */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-yellow-500/20 rounded-lg border-2 border-yellow-500">
              <div>
                <p className="font-bold text-lg">Finale créée</p>
                <p className="text-sm text-muted-foreground">
                  8 finalistes sélectionnés - Statut: <Badge>{final.status}</Badge>
                </p>
              </div>
              <Trophy className="h-12 w-12 text-yellow-500" />
            </div>

            {final.status === 'pending' && (
              <Button
                onClick={startFinalIntro}
                size="lg"
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-lg h-14"
              >
                <Play className="mr-2 h-6 w-6" />
                🎬 Lancer l'Introduction
              </Button>
            )}

            {final.status === 'intro' && (
              <Button
                onClick={activateFinal}
                size="lg"
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-lg h-14"
              >
                <Play className="mr-2 h-6 w-6" />
                🏁 Activer la Finale
              </Button>
            )}

            {final.status === 'active' && (
              <div className="p-6 bg-green-500/20 rounded-lg border-2 border-green-500 text-center">
                <p className="text-2xl font-bold text-green-500">🔥 FINALE EN COURS 🔥</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Les jokers sont activables par les finalistes
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
};

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trophy, Play, Settings, Users, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FinalStatsPanel } from "./FinalStatsPanel";

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
    const initializeManager = async () => {
      await cleanupOrphanedFinales();
      loadJokerTypes();
      loadTeams();
      loadFinal();
    };

    initializeManager();
  }, [sessionId]);

  const cleanupOrphanedFinales = async () => {
    try {
      // Vérifier s'il y a une finale active alors que le game_state dit final_mode=false
      const { data: gameState } = await supabase
        .from('game_state')
        .select('final_mode, final_id')
        .eq('game_session_id', sessionId)
        .single();

      if (!gameState?.final_mode) {
        // Nettoyer toutes les finales non-completed pour cette session
        await supabase
          .from('finals')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('game_session_id', sessionId)
          .neq('status', 'completed');

        console.log('🧹 Finales orphelines nettoyées');
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
    }
  };

  const loadJokerTypes = async () => {
    const { data } = await supabase
      .from('joker_types')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (data) {
      setJokerTypes(data);
      // Initialiser la config avec 1 joker de chaque type (3 jokers au total)
      const config: { [key: string]: number } = {};
      data.forEach(jt => config[jt.id] = 1);
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
      .neq('status', 'completed') // Ne pas charger les finales terminées/désactivées
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
      // Nettoyer d'abord tous les jokers orphelins de cette session
      const { data: allFinalsInSession } = await supabase
        .from('finals')
        .select('id')
        .eq('game_session_id', sessionId);

      if (allFinalsInSession && allFinalsInSession.length > 0) {
        const finalIds = allFinalsInSession.map(f => f.id);
        await supabase
          .from('final_jokers')
          .delete()
          .in('final_id', finalIds);
      }

      // Vérifier si une finale existe déjà pour cette session
      const { data: existingFinal } = await supabase
        .from('finals')
        .select('*')
        .eq('game_session_id', sessionId)
        .maybeSingle();

      let finalId: string;

      if (existingFinal) {
        // Réutiliser la finale existante et la réinitialiser
        const top8Teams = teams.slice(0, 8).map(t => t.id);
        
        await supabase
          .from('finals')
          .update({
            status: 'pending',
            finalist_teams: top8Teams,
            started_at: null,
            completed_at: null
          })
          .eq('id', existingFinal.id);

        // Supprimer les anciens jokers
        await supabase
          .from('final_jokers')
          .delete()
          .eq('final_id', existingFinal.id);

        finalId = existingFinal.id;
      } else {
        // Créer une nouvelle finale
        const top8Teams = teams.slice(0, 8).map(t => t.id);

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
        finalId = newFinal.id;
      }

      // Créer les jokers pour chaque équipe finaliste
      const top8Teams = teams.slice(0, 8).map(t => t.id);
      const jokersToInsert = [];
      
      for (const teamId of top8Teams) {
        for (const [jokerTypeId, quantity] of Object.entries(jokerConfig)) {
          if (quantity > 0) {
            jokersToInsert.push({
              final_id: finalId,
              team_id: teamId,
              joker_type_id: jokerTypeId,
              quantity
            });
          }
        }
      }

      if (jokersToInsert.length > 0) {
        const { error: jokersError } = await supabase
          .from('final_jokers')
          .insert(jokersToInsert);

        if (jokersError) throw jokersError;
      }

      toast({
        title: "🏆 Finale créée !",
        description: `Les 8 finalistes ont été sélectionnés avec leurs jokers`
      });

      loadFinal();
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

  const deactivateFinal = async () => {
    if (!final) return;

    try {
      // Désactiver le mode final dans game_state
      await supabase
        .from('game_state')
        .update({
          final_mode: false,
          final_id: null
        })
        .eq('game_session_id', sessionId);

      // Mettre la finale en statut 'completed' (cancelled n'existe pas dans la DB)
      await supabase
        .from('finals')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', final.id);

      toast({
        title: "❌ Mode final désactivé",
        description: "Le mode final a été désactivé et vous pouvez reprendre le jeu normal"
      });

      setFinal(null);
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
              <div className="flex-1">
                <p className="font-bold text-lg">Finale créée</p>
                <p className="text-sm text-muted-foreground">
                  8 finalistes sélectionnés - Statut: <Badge>{final.status}</Badge>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Trophy className="h-12 w-12 text-yellow-500" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deactivateFinal}
                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Désactiver
                </Button>
              </div>
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
              <>
                <div className="p-6 bg-green-500/20 rounded-lg border-2 border-green-500 text-center">
                  <p className="text-2xl font-bold text-green-500">🔥 FINALE EN COURS 🔥</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Les jokers sont activables par les finalistes
                  </p>
                </div>

                {/* Statistiques en temps réel */}
                <FinalStatsPanel 
                  finalId={final.id} 
                  currentQuestionInstanceId={gameState?.current_question_instance_id}
                />
              </>
            )}
          </div>
        </>
      )}
    </Card>
  );
};

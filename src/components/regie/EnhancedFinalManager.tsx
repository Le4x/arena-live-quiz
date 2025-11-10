/**
 * EnhancedFinalManager - Gestion de finale ultra personnalisable
 * Avec modes variés, jokers cool, système de vies, etc.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FinalConfigPanel, type FinalConfig } from './FinalConfigPanel';
import { Trophy, Play, XCircle, Heart, Skull, Target, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

interface EnhancedFinalManagerProps {
  sessionId: string;
  gameState: any;
}

export const EnhancedFinalManager = ({
  sessionId,
  gameState,
}: EnhancedFinalManagerProps) => {
  const { toast } = useToast();

  const [jokerTypes, setJokerTypes] = useState<any[]>([]);
  const [final, setFinal] = useState<any>(null);
  const [finalLives, setFinalLives] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([
          loadJokerTypes(),
          loadTeams(),
          loadFinal()
        ]);
      } catch (err: any) {
        console.error('Error loading final data:', err);
        setError(err.message || 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      loadData();
    }
  }, [sessionId]);

  useEffect(() => {
    if (final?.id) {
      loadFinalLives();
    }
  }, [final?.id]);

  const loadJokerTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('joker_types')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading joker types:', error);

        // Si c'est une erreur de colonne manquante
        if (error.message.includes('column') || error.message.includes('does not exist')) {
          toast({
            title: '⚠️ Migration requise',
            description: 'Les colonnes nécessaires n\'existent pas. Applique MIGRATION_FINALE.sql depuis Supabase Studio',
            variant: 'destructive',
          });
        } else {
          toast({
            title: '⚠️ Erreur',
            description: error.message,
            variant: 'destructive',
          });
        }
        throw error; // Propager l'erreur pour que le useEffect la capture
      }

      console.log('Joker types loaded:', data?.length);
      if (data) setJokerTypes(data);
    } catch (error: any) {
      console.error('Error loading joker types:', error);
      throw error; // Propager l'erreur
    }
  };

  const loadTeams = async () => {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('game_session_id', sessionId)
      .order('score', { ascending: false });

    if (data) setTeams(data);
  };

  const loadFinal = async () => {
    const { data } = await supabase
      .from('finals')
      .select('*')
      .eq('game_session_id', sessionId)
      .maybeSingle();

    if (data) {
      setFinal(data);
      setShowConfig(false);
    }
  };

  const loadFinalLives = async () => {
    if (!final?.id) return;

    const { data } = await supabase
      .from('final_lives')
      .select('*, teams(*)')
      .eq('final_id', final.id)
      .order('lives_remaining', { ascending: false });

    if (data) setFinalLives(data);
  };

  const createFinal = async (config: FinalConfig) => {
    if (teams.length < config.nbFinalists) {
      toast({
        title: 'Erreur',
        description: `Il faut au moins ${config.nbFinalists} équipes`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Sélectionner les N meilleures équipes
      const topTeams = teams.slice(0, config.nbFinalists).map((t) => t.id);

      // Créer la finale
      const { data: newFinal, error: finalError } = await supabase
        .from('finals')
        .insert({
          game_session_id: sessionId,
          status: 'pending',
          finalist_teams: topTeams,
          mode: config.mode,
          nb_finalists: config.nbFinalists,
          starting_lives: config.startingLives,
          points_to_win: config.pointsToWin,
          allow_comebacks: config.allowComebacks,
          joker_refill_enabled: config.jokerRefillEnabled,
          config: config,
        })
        .select()
        .single();

      if (finalError) throw finalError;

      // Créer les jokers pour chaque finaliste
      const jokersToInsert = [];
      for (const teamId of topTeams) {
        for (const [jokerTypeId, quantity] of Object.entries(config.jokerConfig)) {
          if (quantity > 0) {
            jokersToInsert.push({
              final_id: newFinal.id,
              team_id: teamId,
              joker_type_id: jokerTypeId,
              quantity,
            });
          }
        }
      }

      if (jokersToInsert.length > 0) {
        await supabase.from('final_jokers').insert(jokersToInsert);
      }

      // Créer les vies pour mode Lives
      if (config.mode === 'lives' || config.mode === 'sudden_death') {
        const livesToInsert = topTeams.map((teamId) => ({
          final_id: newFinal.id,
          team_id: teamId,
          lives_remaining:
            config.mode === 'sudden_death' ? 1 : config.startingLives,
        }));

        await supabase.from('final_lives').insert(livesToInsert);
      }

      toast({
        title: '🏆 Finale créée !',
        description: `${config.nbFinalists} finalistes avec mode ${config.mode}`,
      });

      loadFinal();
    } catch (error: any) {
      console.error('Error creating final:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const startFinalIntro = async () => {
    if (!final) return;

    try {
      await supabase
        .from('finals')
        .update({ status: 'intro', started_at: new Date().toISOString() })
        .eq('id', final.id);

      await supabase
        .from('game_state')
        .update({
          final_mode: true,
          final_id: final.id,
          show_welcome_screen: false,
          show_waiting_screen: false,
        })
        .eq('game_session_id', sessionId);

      toast({
        title: '🎬 Introduction lancée !',
        description: "L'écran d'introduction de la finale est affiché",
      });

      loadFinal();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
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
        title: '🏁 Finale activée !',
        description: 'Le mode final est maintenant actif',
      });

      loadFinal();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deactivateFinal = async () => {
    if (!final) return;

    if (!confirm('Êtes-vous sûr de vouloir désactiver la finale ?')) return;

    try {
      await supabase
        .from('game_state')
        .update({
          final_mode: false,
          final_id: null,
        })
        .eq('game_session_id', sessionId);

      await supabase
        .from('finals')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
        })
        .eq('id', final.id);

      toast({
        title: '❌ Mode final désactivé',
        description: 'Retour au mode normal',
      });

      setFinal(null);
      setShowConfig(true);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const manuallyLoseLife = async (teamId: string) => {
    if (!final) return;

    try {
      const result = await supabase.rpc('lose_life', {
        p_final_id: final.id,
        p_team_id: teamId,
      });

      if (result.data?.success) {
        toast({
          title: '❤️ Vie perdue',
          description: `Vies restantes: ${result.data.lives_remaining}`,
        });
        loadFinalLives();
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getModeIcon = (mode: string | undefined) => {
    if (!mode) return Trophy;
    switch (mode) {
      case 'lives':
        return Heart;
      case 'elimination':
        return Skull;
      case 'points_race':
        return Target;
      case 'sudden_death':
        return Zap;
      default:
        return Trophy;
    }
  };

  const ModeIcon = final ? getModeIcon(final.mode) : Trophy;

  // Loading state
  if (loading) {
    return (
      <Card className="p-12 text-center">
        <div className="space-y-4">
          <div className="animate-spin text-6xl">⏳</div>
          <h3 className="text-xl font-bold">Chargement...</h3>
          <p className="text-muted-foreground">Chargement du système de finales</p>
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-12 text-center">
        <div className="space-y-4">
          <div className="text-6xl">❌</div>
          <h3 className="text-xl font-bold text-red-500">Erreur</h3>
          <p className="text-muted-foreground max-w-md mx-auto">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Recharger la page
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <div>
              <h2 className="text-2xl font-bold text-yellow-500">Mode Final Ultra Personnalisable</h2>
              <p className="text-sm text-muted-foreground">
                {final
                  ? `Finale ${final.mode || 'classique'} - ${final.nb_finalists || 8} finalistes`
                  : 'Configurez votre finale sur mesure'}
              </p>
            </div>
          </div>

          {final && (
            <Button
              variant="outline"
              size="sm"
              onClick={deactivateFinal}
              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Désactiver
            </Button>
          )}
        </div>
      </Card>

      {showConfig && !final ? (
        /* Configuration Panel */
        jokerTypes.length > 0 ? (
          <FinalConfigPanel
            jokerTypes={jokerTypes}
            onSave={createFinal}
          />
        ) : (
          <Card className="p-12 text-center">
            <div className="space-y-4">
              <div className="text-6xl">⚠️</div>
              <h3 className="text-xl font-bold">Migration Requise</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Les tables nécessaires pour le système de finales n'existent pas encore.
                <br /><br />
                Va dans Supabase Studio → SQL Editor et exécute la migration :
                <br />
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  supabase/migrations/20251110110000_enhanced_finals_system.sql
                </code>
              </p>
              <Button variant="outline" onClick={loadJokerTypes}>
                Réessayer
              </Button>
            </div>
          </Card>
        )
      ) : final ? (
        /* Finale Active */
        <div className="space-y-6">
          {/* Status Card */}
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <ModeIcon className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="text-xl font-bold">
                    Mode: {final.mode ? final.mode.replace('_', ' ').toUpperCase() : 'CLASSIQUE'}
                  </h3>
                  <Badge className="mt-1">{final.status}</Badge>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-muted-foreground">Finalistes</p>
                <p className="text-3xl font-black text-primary">
                  {final.nb_finalists || 8}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {final.status === 'pending' && (
                <Button
                  onClick={startFinalIntro}
                  size="lg"
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  <Play className="mr-2" />
                  Lancer l'Introduction
                </Button>
              )}

              {final.status === 'intro' && (
                <Button
                  onClick={activateFinal}
                  size="lg"
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  <Play className="mr-2" />
                  Activer la Finale
                </Button>
              )}

              {final.status === 'active' && (
                <div className="flex-1 p-4 bg-green-500/20 rounded-lg border-2 border-green-500 text-center">
                  <p className="text-2xl font-bold text-green-500">🔥 FINALE EN COURS 🔥</p>
                </div>
              )}
            </div>
          </Card>

          {/* Lives Display (si mode Lives ou Sudden Death) */}
          {final.mode && (final.mode === 'lives' || final.mode === 'sudden_death') && finalLives.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                État des Vies
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AnimatePresence>
                  {finalLives.map((fl) => {
                    const team = teams.find((t) => t.id === fl.team_id);
                    if (!team) return null;

                    return (
                      <motion.div
                        key={fl.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`p-4 rounded-lg border-2 ${
                          fl.is_eliminated
                            ? 'bg-red-500/10 border-red-500'
                            : 'bg-card border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: team.color }}
                            />
                            <span className="font-semibold">{team.name}</span>
                          </div>
                          {fl.is_eliminated && (
                            <Badge variant="destructive">ÉLIMINÉ</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {[...Array(final.starting_lives || 3)].map((_, i) => (
                            <Heart
                              key={i}
                              className={`w-6 h-6 ${
                                i < fl.lives_remaining
                                  ? 'text-red-500 fill-red-500'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>

                        {!fl.is_eliminated && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 w-full"
                            onClick={() => manuallyLoseLife(fl.team_id)}
                          >
                            -1 Vie
                          </Button>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </Card>
          )}

          {/* Points Race Progress (si mode Points Race) */}
          {final.mode === 'points_race' && (
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                Course aux Points - Objectif: {final.points_to_win || 100}pts
              </h3>

              <div className="space-y-3">
                {final.finalist_teams.slice(0, final.nb_finalists || 8).map((teamId: string) => {
                  const team = teams.find((t) => t.id === teamId);
                  if (!team) return null;

                  const progress = (team.score / (final.points_to_win || 100)) * 100;

                  return (
                    <div key={team.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: team.color }}
                          />
                          <span className="font-semibold">{team.name}</span>
                        </div>
                        <span className="text-sm font-bold">
                          {team.score} / {final.points_to_win || 100}pts
                        </span>
                      </div>
                      <Progress value={progress} className="h-3" />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
};

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Trophy, Play, Settings, Users, XCircle, Zap, Target, Award, Palette, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FinalStatsPanel } from "./FinalStatsPanel";
import type { FinalConfig } from "@/types/game.types";

interface FinalManagerProps {
  sessionId: string;
  gameState: any;
}

export const FinalManager = ({ sessionId, gameState }: FinalManagerProps) => {
  const { toast } = useToast();
  const [jokerTypes, setJokerTypes] = useState<any[]>([]);
  const [jokerConfig, setJokerConfig] = useState<{ [key: string]: { enabled: boolean; quantity: number } }>({});
  const [final, setFinal] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Configuration de la finale
  const [config, setConfig] = useState<FinalConfig>({
    name: "Finale",
    finalistCount: 8,
    selectionMethod: 'auto',
    selectedTeams: [],
    minScoreThreshold: 0,
    pointMultiplier: 1.0,
    firstCorrectBonus: 0,
    speedBonusEnabled: false,
    introDuration: 10,
    visualTheme: 'gold',
    eliminationMode: false,
    publicVotingEnabled: true,
  });

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
      const { data: gameState } = await supabase
        .from('game_state')
        .select('final_mode, final_id')
        .eq('game_session_id', sessionId)
        .single();

      if (!gameState?.final_mode) {
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
      const jConfig: { [key: string]: { enabled: boolean; quantity: number } } = {};
      data.forEach(jt => jConfig[jt.id] = { enabled: true, quantity: 1 });
      setJokerConfig(jConfig);
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
      .neq('status', 'completed')
      .maybeSingle();

    if (data) setFinal(data);
  };

  const createFinal = async () => {
    // Validation
    const eligibleTeams = teams.filter(t => t.score >= config.minScoreThreshold);

    if (config.selectionMethod === 'auto' && eligibleTeams.length < config.finalistCount) {
      toast({
        title: "❌ Erreur",
        description: `Il faut au moins ${config.finalistCount} équipes avec ${config.minScoreThreshold}+ points`,
        variant: "destructive"
      });
      return;
    }

    if (config.selectionMethod === 'manual' && config.selectedTeams.length !== config.finalistCount) {
      toast({
        title: "❌ Erreur",
        description: `Sélectionnez exactement ${config.finalistCount} équipes`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Nettoyer les anciens jokers
      const { data: allFinalsInSession } = await supabase
        .from('finals')
        .select('id')
        .eq('game_session_id', sessionId);

      if (allFinalsInSession && allFinalsInSession.length > 0) {
        const finalIds = allFinalsInSession.map(f => f.id);
        await supabase.from('final_jokers').delete().in('final_id', finalIds);
        await supabase.from('final_joker_config').delete().in('final_id', finalIds);
      }

      // Sélection des équipes finalistes
      let finalistTeamIds: string[];
      if (config.selectionMethod === 'auto') {
        finalistTeamIds = eligibleTeams.slice(0, config.finalistCount).map(t => t.id);
      } else {
        finalistTeamIds = config.selectedTeams;
      }

      // Vérifier si une finale existe déjà
      const { data: existingFinal } = await supabase
        .from('finals')
        .select('*')
        .eq('game_session_id', sessionId)
        .maybeSingle();

      let finalId: string;

      if (existingFinal) {
        // Réutiliser et mettre à jour
        await supabase
          .from('finals')
          .update({
            status: 'pending',
            finalist_teams: finalistTeamIds,
            started_at: null,
            completed_at: null,
            name: config.name,
            finalist_count: config.finalistCount,
            selection_method: config.selectionMethod,
            min_score_threshold: config.minScoreThreshold,
            point_multiplier: config.pointMultiplier,
            first_correct_bonus: config.firstCorrectBonus,
            speed_bonus_enabled: config.speedBonusEnabled,
            intro_duration: config.introDuration,
            visual_theme: config.visualTheme,
            elimination_mode: config.eliminationMode,
            public_voting_enabled: config.publicVotingEnabled,
          })
          .eq('id', existingFinal.id);

        finalId = existingFinal.id;
      } else {
        // Créer nouvelle finale
        const { data: newFinal, error: finalError } = await supabase
          .from('finals')
          .insert({
            game_session_id: sessionId,
            status: 'pending',
            finalist_teams: finalistTeamIds,
            name: config.name,
            finalist_count: config.finalistCount,
            selection_method: config.selectionMethod,
            min_score_threshold: config.minScoreThreshold,
            point_multiplier: config.pointMultiplier,
            first_correct_bonus: config.firstCorrectBonus,
            speed_bonus_enabled: config.speedBonusEnabled,
            intro_duration: config.introDuration,
            visual_theme: config.visualTheme,
            elimination_mode: config.eliminationMode,
            public_voting_enabled: config.publicVotingEnabled,
          })
          .select()
          .single();

        if (finalError) throw finalError;
        finalId = newFinal.id;
      }

      // Créer les jokers pour chaque équipe finaliste
      const jokersToInsert = [];

      for (const teamId of finalistTeamIds) {
        for (const [jokerTypeId, jConfig] of Object.entries(jokerConfig)) {
          if (jConfig.enabled && jConfig.quantity > 0) {
            jokersToInsert.push({
              final_id: finalId,
              team_id: teamId,
              joker_type_id: jokerTypeId,
              quantity: jConfig.quantity
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
        title: `🏆 ${config.name} créée !`,
        description: `${config.finalistCount} finalistes sélectionnés avec leurs jokers`
      });

      loadFinal();
    } catch (error: any) {
      console.error('Error creating final:', error);
      toast({
        title: "❌ Erreur",
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
      await supabase
        .from('game_state')
        .update({
          final_mode: false,
          final_id: null
        })
        .eq('game_session_id', sessionId);

      await supabase
        .from('finals')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', final.id);

      toast({
        title: "❌ Mode final désactivé",
        description: "Le mode final a été désactivé"
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

  const toggleTeamSelection = (teamId: string) => {
    setConfig(prev => ({
      ...prev,
      selectedTeams: prev.selectedTeams.includes(teamId)
        ? prev.selectedTeams.filter(id => id !== teamId)
        : [...prev.selectedTeams, teamId]
    }));
  };

  const eligibleTeams = teams.filter(t => t.score >= config.minScoreThreshold);
  const displayTeams = config.selectionMethod === 'auto'
    ? eligibleTeams.slice(0, config.finalistCount)
    : teams;

  const themeColors = {
    gold: { bg: 'from-yellow-500/10 to-orange-500/10', border: 'border-yellow-500/30', text: 'text-yellow-500' },
    silver: { bg: 'from-gray-400/10 to-gray-600/10', border: 'border-gray-400/30', text: 'text-gray-400' },
    bronze: { bg: 'from-orange-700/10 to-amber-800/10', border: 'border-orange-700/30', text: 'text-orange-700' },
    purple: { bg: 'from-purple-500/10 to-pink-500/10', border: 'border-purple-500/30', text: 'text-purple-500' },
    blue: { bg: 'from-blue-500/10 to-cyan-500/10', border: 'border-blue-500/30', text: 'text-blue-500' },
    red: { bg: 'from-red-500/10 to-rose-600/10', border: 'border-red-500/30', text: 'text-red-500' },
    rainbow: { bg: 'from-pink-500/10 via-purple-500/10 to-cyan-500/10', border: 'border-pink-500/30', text: 'text-pink-500' },
  };

  const currentTheme = themeColors[config.visualTheme];

  return (
    <Card className={`p-6 bg-gradient-to-br ${currentTheme.bg} border ${currentTheme.border}`}>
      <div className="flex items-center gap-3 mb-6">
        <Trophy className={`h-8 w-8 ${currentTheme.text}`} />
        <div>
          <h2 className={`text-2xl font-bold ${currentTheme.text}`}>Mode Final - Configuration Complète</h2>
          <p className="text-sm text-muted-foreground">Personnalisez tous les aspects de votre finale</p>
        </div>
      </div>

      {!final ? (
        <>
          {/* Configuration générale */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Configuration Générale</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nom de la finale</Label>
                <Input
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  placeholder="Finale, Demi-Finale, etc."
                />
              </div>
              <div>
                <Label>Nombre de finalistes</Label>
                <Select
                  value={config.finalistCount.toString()}
                  onValueChange={(v) => setConfig({ ...config, finalistCount: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[4, 6, 8, 10, 12, 16].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n} équipes</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Méthode de sélection</Label>
                <Select
                  value={config.selectionMethod}
                  onValueChange={(v: 'auto' | 'manual') => setConfig({ ...config, selectionMethod: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automatique (Top N)</SelectItem>
                    <SelectItem value="manual">Manuelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Score minimum requis</Label>
                <Input
                  type="number"
                  value={config.minScoreThreshold}
                  onChange={(e) => setConfig({ ...config, minScoreThreshold: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Règles de scoring */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Règles de Scoring</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Multiplicateur de points</Label>
                <Select
                  value={config.pointMultiplier.toString()}
                  onValueChange={(v) => setConfig({ ...config, pointMultiplier: parseFloat(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.5">×0.5 (Demi)</SelectItem>
                    <SelectItem value="1">×1.0 (Normal)</SelectItem>
                    <SelectItem value="1.5">×1.5</SelectItem>
                    <SelectItem value="2">×2.0 (Double)</SelectItem>
                    <SelectItem value="2.5">×2.5</SelectItem>
                    <SelectItem value="3">×3.0 (Triple)</SelectItem>
                    <SelectItem value="5">×5.0 (Mega)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bonus 1ère bonne réponse</Label>
                <Input
                  type="number"
                  value={config.firstCorrectBonus}
                  onChange={(e) => setConfig({ ...config, firstCorrectBonus: parseInt(e.target.value) || 0 })}
                  placeholder="Points bonus"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="speedBonus"
                  checked={config.speedBonusEnabled}
                  onCheckedChange={(checked) => setConfig({ ...config, speedBonusEnabled: !!checked })}
                />
                <Label htmlFor="speedBonus" className="cursor-pointer">
                  Bonus de vitesse activé
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="eliminationMode"
                  checked={config.eliminationMode}
                  onCheckedChange={(checked) => setConfig({ ...config, eliminationMode: !!checked })}
                />
                <Label htmlFor="eliminationMode" className="cursor-pointer">
                  Mode élimination progressive
                </Label>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Apparence */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Apparence & Affichage</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Thème visuel</Label>
                <Select
                  value={config.visualTheme}
                  onValueChange={(v: any) => setConfig({ ...config, visualTheme: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gold">🥇 Or</SelectItem>
                    <SelectItem value="silver">🥈 Argent</SelectItem>
                    <SelectItem value="bronze">🥉 Bronze</SelectItem>
                    <SelectItem value="purple">💜 Violet</SelectItem>
                    <SelectItem value="blue">💙 Bleu</SelectItem>
                    <SelectItem value="red">❤️ Rouge</SelectItem>
                    <SelectItem value="rainbow">🌈 Arc-en-ciel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Durée de l'intro (secondes)</Label>
                <Input
                  type="number"
                  value={config.introDuration}
                  onChange={(e) => setConfig({ ...config, introDuration: parseInt(e.target.value) || 10 })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="publicVoting"
                  checked={config.publicVotingEnabled}
                  onCheckedChange={(checked) => setConfig({ ...config, publicVotingEnabled: !!checked })}
                />
                <Label htmlFor="publicVoting" className="cursor-pointer">
                  Vote du public activé
                </Label>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Configuration des jokers */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Configuration des Jokers</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jokerTypes.map(jt => (
                <div key={jt.id} className="flex items-center gap-3 p-3 bg-card/50 rounded-lg border border-border">
                  <Checkbox
                    checked={jokerConfig[jt.id]?.enabled ?? true}
                    onCheckedChange={(checked) => setJokerConfig({
                      ...jokerConfig,
                      [jt.id]: { ...jokerConfig[jt.id], enabled: !!checked }
                    })}
                  />
                  <span className="text-2xl">{jt.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{jt.name.replace('_', ' ')}</p>
                    <p className="text-xs text-muted-foreground">{jt.description}</p>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    value={jokerConfig[jt.id]?.quantity || 1}
                    onChange={(e) => setJokerConfig({
                      ...jokerConfig,
                      [jt.id]: { ...jokerConfig[jt.id], quantity: parseInt(e.target.value) || 0 }
                    })}
                    className="w-16 text-center"
                    disabled={!jokerConfig[jt.id]?.enabled}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Sélection des équipes */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5" />
              <h3 className="text-lg font-semibold">
                {config.selectionMethod === 'auto' ? 'Aperçu des finalistes' : 'Sélection manuelle'}
              </h3>
              <Badge variant="outline" className="ml-auto">
                {eligibleTeams.length} équipes éligibles ({config.minScoreThreshold}+ pts)
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {displayTeams.map((team, index) => {
                const isSelected = config.selectionMethod === 'auto'
                  ? index < config.finalistCount
                  : config.selectedTeams.includes(team.id);
                const isAutoQualified = config.selectionMethod === 'auto' && index < config.finalistCount;

                return (
                  <div
                    key={team.id}
                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary/20 border-primary'
                        : 'bg-card/50 border-border hover:bg-card/80'
                    }`}
                    onClick={() => config.selectionMethod === 'manual' && toggleTeamSelection(team.id)}
                  >
                    {config.selectionMethod === 'manual' && (
                      <Checkbox checked={isSelected} />
                    )}
                    {isAutoQualified && (
                      <Badge className="bg-green-500 text-black font-bold text-xs px-1">
                        #{index + 1}
                      </Badge>
                    )}
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="text-sm font-semibold truncate flex-1">{team.name}</span>
                    <span className="text-xs text-muted-foreground">{team.score}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bouton créer finale */}
          <Button
            onClick={createFinal}
            disabled={loading || eligibleTeams.length < config.finalistCount}
            size="lg"
            className={`w-full bg-gradient-to-r ${currentTheme.bg.replace('/10', '')} hover:opacity-80 text-white font-bold text-lg h-14`}
          >
            <Trophy className="mr-2 h-6 w-6" />
            {loading ? "Création..." : `🏆 Créer ${config.name}`}
          </Button>
        </>
      ) : (
        <>
          {/* Finale existante */}
          <div className="space-y-4">
            <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${currentTheme.border} bg-opacity-20`}>
              <div className="flex-1">
                <p className="font-bold text-lg">{final.name || 'Finale'} créée</p>
                <p className="text-sm text-muted-foreground">
                  {final.finalist_count || final.finalist_teams?.length || 8} finalistes - Statut: <Badge>{final.status}</Badge>
                </p>
                {final.point_multiplier && final.point_multiplier !== 1 && (
                  <p className="text-xs text-amber-500 font-semibold mt-1">
                    ⚡ Points ×{final.point_multiplier}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Trophy className={`h-12 w-12 ${currentTheme.text}`} />
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

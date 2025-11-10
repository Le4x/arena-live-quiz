/**
 * FinalConfigPanel - Configuration personnalisable de la finale
 * Modes, nb finalistes, vies, jokers, etc.
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Trophy,
  Zap,
  Heart,
  Target,
  Skull,
  Users,
  Settings,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';

export interface FinalConfig {
  mode: 'elimination' | 'lives' | 'points_race' | 'sudden_death' | 'tournament';
  nbFinalists: number;
  startingLives: number;
  pointsToWin: number;
  allowComebacks: boolean;
  jokerRefillEnabled: boolean;
  jokerConfig: { [key: string]: number };
}

const FINAL_MODES = [
  {
    id: 'elimination',
    name: 'Élimination',
    icon: Skull,
    description: 'Le dernier debout gagne ! Chaque mauvaise réponse élimine',
    color: 'red',
  },
  {
    id: 'lives',
    name: 'Système de Vies',
    icon: Heart,
    description: 'Chaque équipe a X vies. 0 vie = élimination',
    color: 'pink',
  },
  {
    id: 'points_race',
    name: 'Course aux Points',
    icon: Target,
    description: 'Premier à atteindre X points gagne',
    color: 'blue',
  },
  {
    id: 'sudden_death',
    name: 'Mort Subite',
    icon: Zap,
    description: 'Une seule erreur et c\'est terminé !',
    color: 'orange',
  },
  {
    id: 'tournament',
    name: 'Tournoi',
    icon: Trophy,
    description: 'Bracket de 1v1 jusqu\'au champion',
    color: 'yellow',
  },
];

interface FinalConfigPanelProps {
  jokerTypes: any[];
  onSave: (config: FinalConfig) => void;
  initialConfig?: Partial<FinalConfig>;
}

export const FinalConfigPanel = ({
  jokerTypes,
  onSave,
  initialConfig,
}: FinalConfigPanelProps) => {
  const [config, setConfig] = useState<FinalConfig>({
    mode: initialConfig?.mode || 'lives',
    nbFinalists: initialConfig?.nbFinalists || 8,
    startingLives: initialConfig?.startingLives || 3,
    pointsToWin: initialConfig?.pointsToWin || 100,
    allowComebacks: initialConfig?.allowComebacks ?? true,
    jokerRefillEnabled: initialConfig?.jokerRefillEnabled ?? false,
    jokerConfig: initialConfig?.jokerConfig || {},
  });

  // Initialiser jokerConfig avec valeurs par défaut
  if (Object.keys(config.jokerConfig).length === 0 && jokerTypes.length > 0) {
    const defaultJokerConfig: { [key: string]: number } = {};
    jokerTypes.forEach(jt => {
      if (jt.rarity === 'common') defaultJokerConfig[jt.id] = 3;
      else if (jt.rarity === 'rare') defaultJokerConfig[jt.id] = 2;
      else if (jt.rarity === 'epic') defaultJokerConfig[jt.id] = 1;
      else if (jt.rarity === 'legendary') defaultJokerConfig[jt.id] = 1;
      else defaultJokerConfig[jt.id] = 2;
    });
    setConfig({ ...config, jokerConfig: defaultJokerConfig });
  }

  const selectedMode = FINAL_MODES.find(m => m.id === config.mode)!;
  const ModeIcon = selectedMode?.icon || Trophy;

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5" />
          <h3 className="text-lg font-bold">Mode de Finale</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {FINAL_MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = config.mode === mode.id;

            return (
              <motion.button
                key={mode.id}
                onClick={() => setConfig({ ...config, mode: mode.id as any })}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-lg'
                    : 'border-border hover:border-primary/50 hover:bg-accent/50'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSelected && (
                  <motion.div
                    layoutId="selectedMode"
                    className="absolute inset-0 bg-primary/5 rounded-xl"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-6 h-6 text-${mode.color}-500`} />
                    <span className="font-bold">{mode.name}</span>
                    {isSelected && (
                      <Badge className="ml-auto">Sélectionné</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{mode.description}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </Card>

      {/* Configuration Spécifique au Mode */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">
            <ModeIcon className="w-4 h-4 mr-2" />
            Général
          </TabsTrigger>
          <TabsTrigger value="jokers">
            <Sparkles className="w-4 h-4 mr-2" />
            Jokers
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Settings className="w-4 h-4 mr-2" />
            Avancé
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card className="p-6">
            <div className="space-y-6">
              {/* Nombre de finalistes */}
              <div>
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Nombre de Finalistes
                </Label>
                <div className="flex items-center gap-4 mt-2">
                  <Input
                    type="number"
                    min="2"
                    max="16"
                    value={config.nbFinalists}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        nbFinalists: parseInt(e.target.value) || 8,
                      })
                    }
                    className="w-24"
                  />
                  <div className="flex gap-2">
                    {[4, 6, 8, 10, 12].map((n) => (
                      <Button
                        key={n}
                        variant={config.nbFinalists === n ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setConfig({ ...config, nbFinalists: n })}
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Les {config.nbFinalists} meilleures équipes participeront
                </p>
              </div>

              {/* Vies de départ (si mode Lives) */}
              {config.mode === 'lives' && (
                <div>
                  <Label className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    Vies de Départ
                  </Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={config.startingLives}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          startingLives: parseInt(e.target.value) || 3,
                        })
                      }
                      className="w-24"
                    />
                    <div className="flex gap-2">
                      {[1, 3, 5, 7].map((n) => (
                        <Button
                          key={n}
                          variant={config.startingLives === n ? 'default' : 'outline'}
                          size="sm"
                          onClick={() =>
                            setConfig({ ...config, startingLives: n })
                          }
                        >
                          {n}❤️
                        </Button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Chaque mauvaise réponse = -1 vie
                  </p>
                </div>
              )}

              {/* Points pour gagner (si mode Points Race) */}
              {config.mode === 'points_race' && (
                <div>
                  <Label className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-500" />
                    Points pour Gagner
                  </Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Input
                      type="number"
                      min="50"
                      max="500"
                      step="10"
                      value={config.pointsToWin}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          pointsToWin: parseInt(e.target.value) || 100,
                        })
                      }
                      className="w-32"
                    />
                    <div className="flex gap-2">
                      {[50, 100, 150, 200].map((n) => (
                        <Button
                          key={n}
                          variant={config.pointsToWin === n ? 'default' : 'outline'}
                          size="sm"
                          onClick={() =>
                            setConfig({ ...config, pointsToWin: n })
                          }
                        >
                          {n}pts
                        </Button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Premier à atteindre {config.pointsToWin} points gagne
                  </p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="jokers" className="space-y-4">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              Configurez le nombre de jokers que chaque finaliste aura
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jokerTypes
                .sort((a, b) => {
                  const rarityOrder: any = {
                    common: 0,
                    rare: 1,
                    epic: 2,
                    legendary: 3,
                  };
                  return rarityOrder[a.rarity] - rarityOrder[b.rarity];
                })
                .map((jt) => {
                  const rarityColors: any = {
                    common: 'gray',
                    rare: 'blue',
                    epic: 'purple',
                    legendary: 'orange',
                  };
                  const color = rarityColors[jt.rarity] || 'gray';

                  return (
                    <div
                      key={jt.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-all"
                    >
                      <span className="text-3xl">{jt.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm truncate">
                            {jt.name.replace(/_/g, ' ')}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-xs border-${color}-500 text-${color}-600`}
                          >
                            {jt.rarity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {jt.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() =>
                            setConfig({
                              ...config,
                              jokerConfig: {
                                ...config.jokerConfig,
                                [jt.id]: Math.max(
                                  0,
                                  (config.jokerConfig[jt.id] || 0) - 1
                                ),
                              },
                            })
                          }
                        >
                          -
                        </Button>
                        <span className="w-8 text-center font-bold">
                          {config.jokerConfig[jt.id] || 0}
                        </span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() =>
                            setConfig({
                              ...config,
                              jokerConfig: {
                                ...config.jokerConfig,
                                [jt.id]: Math.min(
                                  10,
                                  (config.jokerConfig[jt.id] || 0) + 1
                                ),
                              },
                            })
                          }
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card className="p-6">
            <div className="space-y-6">
              {/* Allow Comebacks */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Autoriser les Retours</Label>
                  <p className="text-sm text-muted-foreground">
                    Les équipes éliminées peuvent revenir avec un joker spécial
                  </p>
                </div>
                <Switch
                  checked={config.allowComebacks}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, allowComebacks: checked })
                  }
                />
              </div>

              {/* Joker Refill */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Recharge de Jokers</Label>
                  <p className="text-sm text-muted-foreground">
                    Les jokers se rechargent toutes les 5 questions
                  </p>
                </div>
                <Switch
                  checked={config.jokerRefillEnabled}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, jokerRefillEnabled: checked })
                  }
                />
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bouton Sauvegarder */}
      <Button
        onClick={() => onSave(config)}
        size="lg"
        className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
      >
        <Trophy className="mr-2 h-5 w-5" />
        Créer la Finale avec cette Configuration
      </Button>

      {/* Résumé de la config */}
      <Card className="p-4 bg-muted/50">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Résumé de la Configuration
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Mode:</span>{' '}
            <span className="font-semibold">{selectedMode.name}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Finalistes:</span>{' '}
            <span className="font-semibold">{config.nbFinalists}</span>
          </div>
          {config.mode === 'lives' && (
            <div>
              <span className="text-muted-foreground">Vies:</span>{' '}
              <span className="font-semibold">{config.startingLives}❤️</span>
            </div>
          )}
          {config.mode === 'points_race' && (
            <div>
              <span className="text-muted-foreground">Points:</span>{' '}
              <span className="font-semibold">{config.pointsToWin}pts</span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Jokers:</span>{' '}
            <span className="font-semibold">
              {Object.values(config.jokerConfig).reduce((a, b) => a + b, 0)} total
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Comebacks:</span>{' '}
            <span className="font-semibold">
              {config.allowComebacks ? '✅' : '❌'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

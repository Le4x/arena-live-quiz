/**
 * JingleManager - Gestion des jingles d'événements
 * Association des jingles aux événements du jeu
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Radio, Play, Pause, Trash2, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MediaAsset {
  id: string;
  name: string;
  category: string;
  event_trigger?: string;
  public_url?: string;
  duration_ms?: number;
}

interface JingleManagerProps {
  assets: MediaAsset[];
  onUpdate: () => void;
}

const EVENT_TRIGGERS = [
  { value: 'round_intro', label: '🎬 Intro de manche', color: 'bg-blue-500' },
  { value: 'correct_answer', label: '✅ Bonne réponse', color: 'bg-green-500' },
  { value: 'incorrect_answer', label: '❌ Mauvaise réponse', color: 'bg-red-500' },
  { value: 'leaderboard', label: '🏆 Classement', color: 'bg-yellow-500' },
  { value: 'final_intro', label: '🎯 Intro finale', color: 'bg-purple-500' },
  { value: 'buzzer', label: '⚡ Buzzer', color: 'bg-orange-500' },
  { value: 'timer_warning', label: '⏰ Alerte temps', color: 'bg-pink-500' },
];

const CATEGORY_LABELS: Record<string, string> = {
  jingle_intro: 'Intro',
  jingle_reveal_correct: 'Bonne réponse',
  jingle_reveal_incorrect: 'Mauvaise réponse',
  jingle_leaderboard: 'Classement',
  jingle_final: 'Finale',
  sound_effect: 'Effet sonore',
};

export const JingleManager = ({ assets, onUpdate }: JingleManagerProps) => {
  const { toast } = useToast();
  const [playing, setPlaying] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Grouper par catégorie
  const assetsByCategory = assets.reduce((acc, asset) => {
    const category = asset.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(asset);
    return acc;
  }, {} as Record<string, MediaAsset[]>);

  // Play jingle
  const playJingle = (asset: MediaAsset) => {
    if (!asset.public_url) return;

    if (playing === asset.id) {
      audioElement?.pause();
      setPlaying(null);
      setAudioElement(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      const audio = new Audio(asset.public_url);
      audio.play();
      audio.onended = () => {
        setPlaying(null);
        setAudioElement(null);
      };
      setAudioElement(audio);
      setPlaying(asset.id);
    }
  };

  // Assigner événement à un jingle
  const assignEvent = async (assetId: string, eventTrigger: string | null) => {
    try {
      const { error } = await supabase
        .from('media_assets')
        .update({ event_trigger: eventTrigger })
        .eq('id', assetId);

      if (error) throw error;

      toast({
        title: 'Événement assigné',
        description: eventTrigger
          ? `Jingle assigné à l'événement`
          : 'Événement retiré',
      });

      onUpdate();
    } catch (error: any) {
      console.error('Erreur assignation:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'assigner l\'événement',
        variant: 'destructive',
      });
    }
  };

  // Format durée
  const formatDuration = (ms?: number) => {
    if (!ms) return '--s';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-4 gap-4">
        {EVENT_TRIGGERS.slice(0, 4).map((trigger) => {
          const count = assets.filter((a) => a.event_trigger === trigger.value).length;
          return (
            <Card key={trigger.value} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-12 rounded-full ${trigger.color}`} />
                <div className="flex-1">
                  <div className="text-2xl font-black">{count}</div>
                  <div className="text-xs text-muted-foreground">{trigger.label}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Liste par catégorie */}
      {Object.entries(assetsByCategory).map(([category, categoryAssets]) => (
        <div key={category} className="space-y-3">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold">
              {CATEGORY_LABELS[category] || category}
            </h3>
            <Badge variant="secondary">{categoryAssets.length}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categoryAssets.map((asset) => {
              const assignedEvent = EVENT_TRIGGERS.find(
                (t) => t.value === asset.event_trigger
              );

              return (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group"
                >
                  <Card className="p-4 hover:shadow-lg transition-all">
                    <div className="flex items-start gap-3">
                      {/* Play button */}
                      <Button
                        variant={playing === asset.id ? 'default' : 'outline'}
                        size="icon"
                        className="flex-shrink-0"
                        onClick={() => playJingle(asset)}
                      >
                        {playing === asset.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate" title={asset.name}>
                          {asset.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(asset.duration_ms)}
                        </p>

                        {/* Event assignment */}
                        <div className="mt-2">
                          <Select
                            value={asset.event_trigger || 'none'}
                            onValueChange={(value) =>
                              assignEvent(asset.id, value === 'none' ? null : value)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Assigner à un événement" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                <span className="text-muted-foreground">
                                  Aucun événement
                                </span>
                              </SelectItem>
                              {EVENT_TRIGGERS.map((trigger) => (
                                <SelectItem key={trigger.value} value={trigger.value}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-2 h-2 rounded-full ${trigger.color}`}
                                    />
                                    {trigger.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Assigned event badge */}
                        {assignedEvent && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="mt-2"
                          >
                            <Badge className="text-xs">
                              <Check className="w-3 h-3 mr-1" />
                              {assignedEvent.label}
                            </Badge>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Playing indicator */}
                    {playing === asset.id && (
                      <motion.div
                        className="mt-3 flex items-center gap-1"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        {[...Array(4)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="w-0.5 bg-primary rounded-full"
                            animate={{
                              height: [6, 12, 6],
                            }}
                            transition={{
                              duration: 0.5,
                              repeat: Infinity,
                              delay: i * 0.15,
                            }}
                          />
                        ))}
                        <span className="text-xs text-primary ml-2">En lecture</span>
                      </motion.div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}

      {assets.length === 0 && (
        <Card className="p-12 text-center">
          <Radio className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Aucun jingle</h3>
          <p className="text-sm text-muted-foreground">
            Uploadez vos premiers jingles pour les événements du jeu !
          </p>
        </Card>
      )}
    </div>
  );
};

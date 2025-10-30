import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Trophy, Shield, Target, Clock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface JokerPanelProps {
  teamId: string;
  finalId: string;
  isActive: boolean; // true = finale active, false = finale pas encore active
}

export const JokerPanel = ({ teamId, finalId, isActive }: JokerPanelProps) => {
  const { toast } = useToast();
  const [jokers, setJokers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadJokers();

    // Écouter les changements de jokers en temps réel
    const channel = supabase
      .channel('client-final-jokers')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'final_jokers',
        filter: `team_id=eq.${teamId}`
      }, () => {
        loadJokers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, finalId]);

  const loadJokers = async () => {
    const { data } = await supabase
      .from('final_jokers')
      .select('*, joker_types(*)')
      .eq('team_id', teamId)
      .eq('final_id', finalId);
    
    if (data) setJokers(data);
  };

  const useJoker = async (jokerId: string, jokerTypeName: string) => {
    if (!isActive) {
      toast({
        title: "⏳ Finale pas encore active",
        description: "Les jokers ne peuvent être utilisés qu'une fois la finale lancée",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Récupérer le joker
      const { data: joker } = await supabase
        .from('final_jokers')
        .select('*')
        .eq('id', jokerId)
        .single();

      if (!joker) throw new Error('Joker non trouvé');

      // Vérifier qu'il reste des utilisations
      if (joker.used_count >= joker.quantity) {
        toast({
          title: "❌ Joker épuisé",
          description: "Vous avez déjà utilisé tous vos jokers de ce type",
          variant: "destructive"
        });
        return;
      }

      // Incrémenter used_count
      const { error: updateError } = await supabase
        .from('final_jokers')
        .update({ used_count: joker.used_count + 1 })
        .eq('id', jokerId);

      if (updateError) throw updateError;

      toast({
        title: "⚡ Joker activé !",
        description: `${jokerTypeName} a été utilisé avec succès`,
      });

      // Forcer le rechargement
      await loadJokers();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getJokerIcon = (name: string) => {
    const icons: { [key: string]: any } = {
      'double_points': Trophy,
      'shield': Shield,
      'eliminate_answer': Target,
      'time_bonus': Clock,
      'public_vote': Users
    };
    return icons[name] || Zap;
  };

  if (jokers.length === 0) return null;

  return (
    <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-yellow-500" />
        <h3 className="font-bold text-lg">Jokers disponibles</h3>
        {!isActive && (
          <Badge variant="outline" className="ml-auto text-xs">
            En attente de la finale
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {jokers.map((joker) => {
          const Icon = getJokerIcon(joker.joker_types.name);
          const remaining = joker.quantity - joker.used_count;
          const isUsedUp = remaining <= 0;

          return (
            <motion.div
              key={joker.id}
              whileHover={{ scale: isUsedUp ? 1 : 1.02 }}
              whileTap={{ scale: isUsedUp ? 1 : 0.98 }}
            >
              <Card className={`p-3 border-2 transition-all ${
                isUsedUp 
                  ? 'opacity-50 border-border' 
                  : 'border-yellow-500/50 hover:border-yellow-500'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{joker.joker_types.icon}</div>
                  <div className="flex-1">
                    <p className="font-bold text-sm capitalize">
                      {joker.joker_types.name.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {joker.joker_types.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge 
                      variant={remaining > 0 ? "default" : "outline"}
                      className={remaining > 0 ? "bg-yellow-500 text-black" : ""}
                    >
                      {remaining}/{joker.quantity}
                    </Badge>
                    <Button
                      size="sm"
                      disabled={isUsedUp || loading || !isActive}
                      onClick={() => useJoker(joker.id, joker.joker_types.name)}
                      className="h-7 text-xs"
                    >
                      {loading ? '...' : 'Activer'}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {!isActive && (
        <p className="text-xs text-muted-foreground text-center mt-4">
          💡 Les jokers seront activables une fois la finale lancée
        </p>
      )}
    </Card>
  );
};

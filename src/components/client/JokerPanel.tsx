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
      // Récupérer le joker actuel
      const { data: joker, error: fetchError } = await supabase
        .from('final_jokers')
        .select('*')
        .eq('id', jokerId)
        .single();

      if (fetchError || !joker) {
        throw new Error('Joker non trouvé');
      }

      // Vérifier qu'il reste des utilisations
      if (joker.used_count >= joker.quantity) {
        toast({
          title: "❌ Joker épuisé",
          description: "Vous avez déjà utilisé tous vos jokers de ce type",
          variant: "destructive"
        });
        return;
      }

      // Incrémenter used_count de manière atomique
      const { error: updateError } = await supabase
        .from('final_jokers')
        .update({ used_count: joker.used_count + 1 })
        .eq('id', jokerId)
        .eq('used_count', joker.used_count); // Condition pour éviter les race conditions

      if (updateError) throw updateError;

      toast({
        title: "⚡ Joker activé !",
        description: `${jokerTypeName.replace('_', ' ')} utilisé avec succès`,
      });

      // Le rechargement sera fait automatiquement par le canal realtime
    } catch (error: any) {
      console.error('Erreur joker:', error);
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
    <Card className="p-3 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-4 w-4 text-yellow-500" />
        <h3 className="font-bold text-sm">Jokers</h3>
        {!isActive && (
          <Badge variant="outline" className="ml-auto text-xs">
            En attente
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {jokers.map((joker) => {
          const remaining = joker.quantity - joker.used_count;
          const isUsedUp = remaining <= 0;

          return (
            <Button
              key={joker.id}
              size="sm"
              disabled={isUsedUp || loading || !isActive}
              onClick={() => useJoker(joker.id, joker.joker_types.name)}
              className={`h-8 px-3 text-xs flex items-center gap-1.5 ${
                isUsedUp 
                  ? 'opacity-50' 
                  : 'bg-yellow-500 hover:bg-yellow-600 text-black'
              }`}
              title={joker.joker_types.description}
            >
              <span className="text-base">{joker.joker_types.icon}</span>
              <span className="font-bold">{remaining}/{joker.quantity}</span>
            </Button>
          );
        })}
      </div>
    </Card>
  );
};

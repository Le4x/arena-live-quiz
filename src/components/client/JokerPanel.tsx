import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Trophy, Shield, Target, Clock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { gameEvents } from "@/lib/runtime/GameEvents";

interface JokerPanelProps {
  teamId: string;
  finalId: string;
  isActive: boolean; // true = finale active, false = finale pas encore active
  currentQuestion?: any; // Question actuelle pour les jokers 50-50
}

export const JokerPanel = ({ teamId, finalId, isActive, currentQuestion }: JokerPanelProps) => {
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

  const useJoker = async (jokerId: string, jokerTypeName: 'fifty_fifty' | 'team_call' | 'public_vote') => {
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
      console.log('🃏 [JokerPanel] Début activation:', { jokerId, jokerTypeName, teamId, finalId });
      
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

      const newCount = joker.used_count + 1;

      // Incrémenter used_count
      const { error: updateError } = await supabase
        .from('final_jokers')
        .update({ used_count: newCount })
        .eq('id', jokerId);

      if (updateError) throw updateError;

      console.log('🃏 [JokerPanel] Émission événement...', { teamId, jokerTypeName, finalId });
      
      // Extraire les options et la bonne réponse pour le 50-50
      let questionOptions, correctAnswer;
      if (jokerTypeName === 'fifty_fifty' && currentQuestion) {
        console.log('🃏 [JokerPanel] currentQuestion complet:', currentQuestion);
        console.log('🃏 [JokerPanel] currentQuestion.options:', currentQuestion.options);
        console.log('🃏 [JokerPanel] Type de currentQuestion.options:', typeof currentQuestion.options);
        
        // Forcer une copie profonde des options
        questionOptions = typeof currentQuestion.options === 'string' 
          ? JSON.parse(currentQuestion.options) 
          : JSON.parse(JSON.stringify(currentQuestion.options));
        correctAnswer = currentQuestion.correct_answer;
        
        console.log('🃏 [JokerPanel] Données question après copie:', { questionOptions, correctAnswer });
      }
      
      // Émettre l'événement pour tous les clients avec les données de la question
      await gameEvents.activateJoker(teamId, jokerTypeName, finalId, questionOptions, correctAnswer);
      
      console.log('🃏 [JokerPanel] Événement émis avec succès');

      toast({
        title: "⚡ Joker activé !",
        description: `${jokerTypeName.replace('_', ' ')} utilisé avec succès`,
      });

      // Forcer le rechargement immédiat
      await loadJokers();
    } catch (error: any) {
      console.error('❌ [JokerPanel] Erreur:', error);
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
      'fifty_fifty': Target,
      'team_call': Users,
      'public_vote': Trophy,
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
              onClick={() => useJoker(joker.id, joker.joker_types.name as 'fifty_fifty' | 'team_call' | 'public_vote')}
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

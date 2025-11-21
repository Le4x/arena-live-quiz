import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Trophy, Shield, Target, Clock, Users, Flame, Timer, Dices } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { gameEvents, type JokerType } from "@/lib/runtime/GameEvents";

interface JokerPanelProps {
  teamId: string;
  finalId: string;
  isActive: boolean; // true = finale active, false = finale pas encore active
  currentQuestion?: any; // Question actuelle pour les jokers 50-50
}

// Configuration des couleurs et styles par type de joker
const JOKER_STYLES: Record<string, {
  bg: string;
  hoverBg: string;
  border: string;
  glow: string;
  icon: any;
}> = {
  'fifty_fifty': {
    bg: 'bg-blue-500',
    hoverBg: 'hover:bg-blue-600',
    border: 'border-blue-400',
    glow: 'shadow-blue-500/50',
    icon: Target
  },
  'team_call': {
    bg: 'bg-green-500',
    hoverBg: 'hover:bg-green-600',
    border: 'border-green-400',
    glow: 'shadow-green-500/50',
    icon: Users
  },
  'public_vote': {
    bg: 'bg-purple-500',
    hoverBg: 'hover:bg-purple-600',
    border: 'border-purple-400',
    glow: 'shadow-purple-500/50',
    icon: Trophy
  },
  'double_points': {
    bg: 'bg-gradient-to-r from-orange-500 to-red-500',
    hoverBg: 'hover:from-orange-600 hover:to-red-600',
    border: 'border-orange-400',
    glow: 'shadow-orange-500/50',
    icon: Flame
  },
  'shield': {
    bg: 'bg-gradient-to-r from-cyan-500 to-blue-500',
    hoverBg: 'hover:from-cyan-600 hover:to-blue-600',
    border: 'border-cyan-400',
    glow: 'shadow-cyan-500/50',
    icon: Shield
  },
  'time_bonus': {
    bg: 'bg-gradient-to-r from-yellow-500 to-amber-500',
    hoverBg: 'hover:from-yellow-600 hover:to-amber-600',
    border: 'border-yellow-400',
    glow: 'shadow-yellow-500/50',
    icon: Timer
  },
  'second_chance': {
    bg: 'bg-gradient-to-r from-pink-500 to-rose-500',
    hoverBg: 'hover:from-pink-600 hover:to-rose-600',
    border: 'border-pink-400',
    glow: 'shadow-pink-500/50',
    icon: Dices
  }
};

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

  const useJoker = async (jokerId: string, jokerTypeName: JokerType) => {
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

  const getJokerStyle = (name: string) => {
    return JOKER_STYLES[name] || {
      bg: 'bg-yellow-500',
      hoverBg: 'hover:bg-yellow-600',
      border: 'border-yellow-400',
      glow: 'shadow-yellow-500/50',
      icon: Zap
    };
  };

  if (jokers.length === 0) return null;

  return (
    <Card className="p-4 bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-2 border-yellow-500/40 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
        >
          <Zap className="h-5 w-5 text-yellow-400" />
        </motion.div>
        <h3 className="font-bold text-base text-yellow-400">🃏 VOS JOKERS</h3>
        {!isActive && (
          <Badge variant="outline" className="ml-auto text-xs border-amber-500 text-amber-500 animate-pulse">
            ⏳ En attente
          </Badge>
        )}
        {isActive && (
          <Badge className="ml-auto text-xs bg-green-500 text-white animate-pulse">
            🔥 ACTIFS
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <AnimatePresence>
          {jokers.map((joker, index) => {
            const remaining = joker.quantity - joker.used_count;
            const isUsedUp = remaining <= 0;
            const style = getJokerStyle(joker.joker_types.name);
            const IconComponent = style.icon;

            return (
              <motion.div
                key={joker.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  size="lg"
                  disabled={isUsedUp || loading || !isActive}
                  onClick={() => useJoker(joker.id, joker.joker_types.name as JokerType)}
                  className={`w-full h-auto py-3 px-3 flex flex-col items-center gap-1 transition-all duration-300 ${
                    isUsedUp
                      ? 'opacity-30 grayscale cursor-not-allowed bg-gray-700'
                      : `${style.bg} ${style.hoverBg} text-white shadow-lg ${style.glow} hover:shadow-xl hover:scale-105 active:scale-95`
                  }`}
                  title={joker.joker_types.description}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{joker.joker_types.icon}</span>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {joker.joker_types.name.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    {[...Array(joker.quantity)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < remaining ? 'bg-white' : 'bg-white/30'
                        }`}
                      />
                    ))}
                  </div>
                  {isUsedUp && (
                    <span className="text-[10px] text-gray-400 uppercase">Épuisé</span>
                  )}
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Indicateur de chargement */}
      {loading && (
        <motion.div
          className="mt-3 text-center text-yellow-400 text-sm"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          ⚡ Activation du joker...
        </motion.div>
      )}
    </Card>
  );
};

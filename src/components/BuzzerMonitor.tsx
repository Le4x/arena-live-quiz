import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Trophy, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { gameEvents } from "@/lib/runtime/GameEvents";

export const BuzzerMonitor = ({ currentQuestionId, gameState }: { currentQuestionId: string | null; gameState: any | null }) => {
  const { toast } = useToast();
  const [buzzers, setBuzzers] = useState<any[]>([]);

  useEffect(() => {
    if (!currentQuestionId) return;
    
    loadBuzzers();

    const channel = supabase
      .channel('buzzer-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buzzer_attempts' }, () => {
        loadBuzzers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentQuestionId]);

  const loadBuzzers = async () => {
    if (!currentQuestionId || !gameState?.game_session_id) return;
    
    const { data } = await supabase
      .from('buzzer_attempts')
      .select('*, teams(*)')
      .eq('question_id', currentQuestionId)
      .eq('game_session_id', gameState.game_session_id)
      .order('buzzed_at', { ascending: true });
    
    if (data) setBuzzers(data);
  };

  const awardPoints = async (teamId: string, points: number, isCorrect: boolean) => {
    const { data: team } = await supabase
      .from('teams')
      .select('score')
      .eq('id', teamId)
      .single();

    if (team) {
      await supabase
        .from('teams')
        .update({ score: team.score + points })
        .eq('id', teamId);
      
      // Envoyer l'événement au client
      await gameEvents.revealAnswer(teamId, isCorrect);
      
      toast({ title: "Points attribués !", description: `${points > 0 ? '+' : ''}${points} points` });
    }
  };

  const clearBuzzers = async () => {
    if (!currentQuestionId || !gameState?.game_session_id) return;
    await supabase
      .from('buzzer_attempts')
      .delete()
      .eq('question_id', currentQuestionId)
      .eq('game_session_id', gameState.game_session_id);
    toast({ title: "Buzzers réinitialisés" });
  };

  if (!currentQuestionId || buzzers.length === 0) return null;

  return (
    <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-primary flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Buzzers ({buzzers.length})
        </h3>
        <Button variant="outline" size="sm" onClick={clearBuzzers}>
          <X className="h-4 w-4 mr-2" />
          Réinitialiser
        </Button>
      </div>
      
      <div className="space-y-3">
        {buzzers.map((buzzer, index) => (
          <div
            key={buzzer.id}
            className="flex items-center gap-4 p-4 rounded-lg border-2 bg-muted/50"
            style={{ borderColor: buzzer.teams?.color }}
          >
            <div className="text-2xl font-bold text-primary w-8">#{index + 1}</div>
            <div className="flex-1">
              <div className="font-bold text-lg">{buzzer.teams?.name}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(buzzer.buzzed_at).toLocaleTimeString('fr-FR')}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => awardPoints(buzzer.team_id, 10, true)}
              >
                <Trophy className="h-4 w-4 mr-1" />
                +10
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => awardPoints(buzzer.team_id, 5, true)}
              >
                +5
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => awardPoints(buzzer.team_id, -5, false)}
              >
                -5
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Trophy, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { gameEvents } from "@/lib/runtime/GameEvents";
import { purgeVolatileForQuestion } from "@/lib/services/reset";

export const BuzzerMonitor = ({ 
  currentQuestionId, 
  gameState, 
  buzzers,
  questionPoints,
  onCorrectAnswer,
  onWrongAnswer,
  blockedTeams = []
}: { 
  currentQuestionId: string | null; 
  gameState: any | null; 
  buzzers: any[];
  questionPoints: number;
  onCorrectAnswer: (teamId: string, points: number) => void;
  onWrongAnswer: (teamId: string) => void;
  blockedTeams?: string[];
}) => {
  const { toast } = useToast();

  const clearBuzzers = async () => {
    if (!currentQuestionId || !gameState?.game_session_id || !gameState?.current_question_instance_id) return;
    
    try {
      // Purge complète via le service reset
      await purgeVolatileForQuestion({
        sessionId: gameState.game_session_id,
        questionInstanceId: gameState.current_question_instance_id,
      });

      // Émettre l'événement BUZZER_RESET
      await gameEvents.resetBuzzer(gameState.current_question_instance_id);

      toast({ title: "🧹 Buzzers et réponses purgés" });
    } catch (error) {
      console.error('Erreur reset:', error);
      toast({ 
        title: "Erreur lors du reset", 
        variant: "destructive" 
      });
    }
  };

  console.log('🎯 BuzzerMonitor: Rendu avec', buzzers.length, 'buzzers, currentQuestionId:', currentQuestionId);
  
  if (!currentQuestionId || buzzers.length === 0) {
    console.log('⚠️ BuzzerMonitor: Pas de question ou pas de buzzers', {
      hasQuestionId: !!currentQuestionId,
      buzzersLength: buzzers.length
    });
    return null;
  }

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
        {buzzers.map((buzzer, index) => {
          const isBlocked = blockedTeams.includes(buzzer.team_id);
          return (
            <div
              key={buzzer.id}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 ${isBlocked ? 'bg-muted/30 opacity-60' : 'bg-muted/50'}`}
              style={{ borderColor: buzzer.teams?.color }}
            >
              <div className="text-2xl font-bold text-primary w-8">#{index + 1}</div>
              <div className="flex-1">
                <div className="font-bold text-lg flex items-center gap-2">
                  {buzzer.teams?.name}
                  {isBlocked && <Badge variant="destructive" className="text-xs">Bloqué</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(buzzer.buzzed_at).toLocaleTimeString('fr-FR')}
                </div>
              </div>
              {!isBlocked && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => onCorrectAnswer(buzzer.team_id, questionPoints)}
                  >
                    ✓ Bonne
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onWrongAnswer(buzzer.team_id)}
                  >
                    ✗ Mauvaise
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

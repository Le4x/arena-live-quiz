import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Trophy, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { gameEvents } from "@/lib/runtime/GameEvents";

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
    if (!currentQuestionId || !gameState?.game_session_id) return;
    await supabase
      .from('buzzer_attempts')
      .delete()
      .eq('question_id', currentQuestionId)
      .eq('game_session_id', gameState.game_session_id);
    toast({ title: "Buzzers réinitialisés" });
  };

  console.log('🎯 BuzzerMonitor: Rendu avec', buzzers.length, 'buzzers');
  
  if (!currentQuestionId || buzzers.length === 0) {
    console.log('⚠️ BuzzerMonitor: Pas de question ou pas de buzzers');
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
        {buzzers.slice(0, 2).map((buzzer, index) => {
          const isBlocked = blockedTeams.includes(buzzer.team_id);
          const isFirst = index === 0;
          const isSecond = index === 1;
          const buzzedTime = new Date(buzzer.buzzed_at);
          const timeDisplay = buzzedTime.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          }) + '.' + String(buzzedTime.getMilliseconds()).padStart(3, '0');
          
          return (
            <div
              key={buzzer.id}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
                isSecond 
                  ? 'bg-muted/20 opacity-75' 
                  : isBlocked 
                  ? 'bg-muted/30 opacity-60' 
                  : 'bg-muted/50'
              }`}
              style={{ borderColor: buzzer.teams?.color }}
            >
              <div className="text-2xl font-bold text-primary w-8">#{index + 1}</div>
              <div className="flex-1">
                <div className="font-bold text-lg flex items-center gap-2">
                  {buzzer.teams?.name}
                  {isFirst && !isBlocked && (
                    <Badge className="bg-green-500 text-white text-xs">
                      ✓ Premier
                    </Badge>
                  )}
                  {isSecond && (
                    <Badge variant="outline" className="text-xs">
                      Info seulement
                    </Badge>
                  )}
                  {isBlocked && <Badge variant="destructive" className="text-xs">Bloqué</Badge>}
                </div>
                <div className="font-mono text-sm text-muted-foreground font-bold">
                  {timeDisplay}
                </div>
              </div>
              {isFirst && !isBlocked && (
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
        {buzzers.length > 2 && (
          <div className="text-center text-sm text-muted-foreground pt-2">
            + {buzzers.length - 2} autre(s) buzzer(s)
          </div>
        )}
      </div>
    </Card>
  );
};

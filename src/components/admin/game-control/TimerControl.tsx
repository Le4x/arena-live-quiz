/**
 * TimerControl - Contrôle du timer
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { useState } from 'react';

interface TimerControlProps {
  sessionId: string;
  gameState: any;
  currentQuestion: any;
  onLoadData: () => void;
}

export const TimerControl = ({
  sessionId,
  gameState,
  currentQuestion,
  onLoadData,
}: TimerControlProps) => {
  const { toast } = useToast();
  const [duration, setDuration] = useState(30);

  const startTimer = async () => {
    try {
      const serverTime = new Date();
      await supabase.from('game_state').update({
        timer_active: true,
        timer_started_at: serverTime.toISOString(),
        timer_duration: duration,
      }).eq('game_session_id', sessionId);

      toast({ title: 'Timer démarré' });
      onLoadData();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const stopTimer = async () => {
    try {
      await supabase.from('game_state').update({
        timer_active: false,
      }).eq('game_session_id', sessionId);

      toast({ title: 'Timer arrêté' });
      onLoadData();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-5 h-5" />
        <h3 className="font-bold text-lg">Contrôle du Timer</h3>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Durée (secondes)</Label>
          <Input
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
            disabled={gameState?.timer_active}
            className="mt-2"
          />
        </div>

        <div className="flex gap-2">
          {!gameState?.timer_active ? (
            <Button onClick={startTimer} disabled={!currentQuestion} className="flex-1">
              <Play className="w-4 h-4 mr-2" />
              Démarrer le timer
            </Button>
          ) : (
            <Button onClick={stopTimer} variant="destructive" className="flex-1">
              <Pause className="w-4 h-4 mr-2" />
              Arrêter le timer
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

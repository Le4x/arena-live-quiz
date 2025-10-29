import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";

interface TimerBarProps {
  timerRemaining: number;
  timerDuration: number;
  timerActive: boolean;
  questionType?: string;
}

export const TimerBar = ({ 
  timerRemaining, 
  timerDuration, 
  timerActive,
  questionType 
}: TimerBarProps) => {
  const [displayTime, setDisplayTime] = useState(timerRemaining);
  const percentage = timerDuration > 0 ? (timerRemaining / timerDuration) * 100 : 0;

  useEffect(() => {
    setDisplayTime(timerRemaining);
  }, [timerRemaining]);

  // Pas de barre si pas de timer actif ou si le timer est à 0 dès le départ
  if (!timerActive && timerRemaining === 0) {
    return null;
  }

  const getColorClass = () => {
    if (percentage > 60) return "bg-green-500";
    if (percentage > 30) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className="p-3 sm:p-4 bg-card/95 backdrop-blur">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
          {questionType === 'blind_test' ? '🎵 Temps restant' : '⏱️ Temps restant'}
        </span>
        <span className="text-base sm:text-lg font-bold tabular-nums">
          {displayTime}s
        </span>
      </div>
      <Progress 
        value={percentage} 
        className="h-2 sm:h-3"
        indicatorClassName={getColorClass()}
      />
      {!timerActive && timerRemaining > 0 && (
        <div className="text-xs text-muted-foreground mt-1 text-center">
          ⏸️ Pause
        </div>
      )}
    </Card>
  );
};

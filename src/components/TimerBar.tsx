import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { playSound } from "@/lib/sounds";

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
  const [hasPlayedWarning, setHasPlayedWarning] = useState(false);
  const percentage = timerDuration > 0 ? (timerRemaining / timerDuration) * 100 : 0;

  // États d'urgence
  const isPanic = timerRemaining <= 5 && timerActive;
  const isWarning = timerRemaining <= 10 && timerRemaining > 5 && timerActive;
  const isUrgent = timerRemaining <= 10 && timerActive;

  useEffect(() => {
    setDisplayTime(timerRemaining);

    // Jouer un son d'avertissement à 10s (une seule fois)
    if (timerRemaining === 10 && timerActive && !hasPlayedWarning) {
      playSound('countdown');
      setHasPlayedWarning(true);
    }

    // Réinitialiser le flag quand le timer redémarre
    if (timerRemaining > 10) {
      setHasPlayedWarning(false);
    }
  }, [timerRemaining, timerActive, hasPlayedWarning]);

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
    <Card
      className={`
        p-3 sm:p-4
        transition-all duration-300
        ${isPanic
          ? 'bg-red-500/20 border-red-500 border-4 animate-pulse shadow-lg shadow-red-500/50'
          : isWarning
          ? 'bg-yellow-500/10 border-yellow-500/50 border-2 shadow-lg shadow-yellow-500/30'
          : 'bg-card/95 backdrop-blur'
        }
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`
          text-xs sm:text-sm font-bold
          ${isUrgent ? 'animate-pulse' : 'text-muted-foreground'}
          ${isPanic ? 'text-red-500' : isWarning ? 'text-yellow-500' : ''}
        `}>
          {isPanic && '⚠️ ATTENTION ! '}
          {questionType === 'blind_test' ? '🎵 Temps restant' : '⏱️ Temps restant'}
        </span>
        <span className={`
          text-base sm:text-lg font-black tabular-nums
          ${isPanic ? 'text-red-500 text-2xl sm:text-3xl animate-bounce' : ''}
          ${isWarning ? 'text-yellow-500 text-xl sm:text-2xl' : ''}
        `}>
          {displayTime}s
        </span>
      </div>
      <Progress
        value={percentage}
        className={`
          transition-all duration-300
          ${isPanic ? 'h-4 sm:h-5' : 'h-2 sm:h-3'}
        `}
        indicatorClassName={getColorClass()}
      />
      {!timerActive && timerRemaining > 0 && (
        <div className="text-xs text-muted-foreground mt-1 text-center">
          ⏸️ Pause
        </div>
      )}
      {isPanic && (
        <div className="text-xs sm:text-sm font-bold text-red-500 mt-1 text-center animate-pulse">
          🚨 Dépêchez-vous ! 🚨
        </div>
      )}
    </Card>
  );
};

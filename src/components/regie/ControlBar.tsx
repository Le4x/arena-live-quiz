/**
 * ControlBar - Bande de contrôle live pour la régie
 * Toujours visible, sans scroll
 */

import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Radio, Music, Timer as TimerIcon } from "lucide-react";

interface ControlBarProps {
  timer: {
    value: number;
    active: boolean;
    onToggle: () => void;
    onReset: () => void;
  };
  audio: {
    onPlayExtrait: () => void;
    onPlaySolution: () => void;
  };
  buzzer: {
    locked: boolean;
    active: boolean;
    onToggle: () => void;
    onWrong: () => void;
    onCorrect: () => void;
    onReset: () => void;
  };
}

export const ControlBar = ({ timer, audio, buzzer }: ControlBarProps) => {
  return (
    <div className="bg-card/95 backdrop-blur border-accent/30 border rounded-lg p-3">
      <div className="grid grid-cols-12 gap-3 items-center">
        {/* Audio */}
        <div className="col-span-3 flex items-center gap-2">
          <Music className="h-4 w-4 text-muted-foreground" />
          <Button size="sm" variant="outline" onClick={audio.onPlayExtrait}>
            Extrait 30s
          </Button>
          <Button size="sm" variant="outline" onClick={audio.onPlaySolution}>
            Solution
          </Button>
        </div>

        {/* Timer */}
        <div className="col-span-3 flex items-center gap-2">
          <TimerIcon className="h-4 w-4 text-muted-foreground" />
          <div className={`text-xl font-mono font-bold min-w-[60px] ${timer.value <= 5 ? 'text-destructive' : ''}`}>
            {timer.value}s
          </div>
          <Button size="sm" onClick={timer.onToggle}>
            {timer.active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={timer.onReset}>
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>

        {/* Buzzers */}
        <div className="col-span-6 flex items-center gap-2">
          <Radio className="h-4 w-4 text-muted-foreground" />
          <Button 
            size="sm" 
            variant={buzzer.active ? "default" : "outline"}
            onClick={buzzer.onToggle}
          >
            {buzzer.active ? '⚡ Actifs' : 'Inactifs'}
          </Button>
          <Button 
            size="sm" 
            onClick={() => {/* Lock buzz */}}
            disabled={buzzer.locked || !buzzer.active}
          >
            {buzzer.locked ? 'BUZZÉ' : 'Lock'}
          </Button>
          <Button size="sm" onClick={buzzer.onWrong} disabled={!buzzer.locked}>
            ❌
          </Button>
          <Button size="sm" onClick={buzzer.onCorrect} disabled={!buzzer.locked}>
            ✅
          </Button>
          <Button size="sm" variant="ghost" onClick={buzzer.onReset}>
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
};
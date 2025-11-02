import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useGameSimulation } from "@/hooks/admin/useGameSimulation";
import { Play, Square, Cpu, Users, Zap, Target } from "lucide-react";
import { useState } from "react";

export const SimulationControlPanel = () => {
  const { 
    isRunning, 
    simulatedTeams, 
    config, 
    startSimulation, 
    stopSimulation,
    updateConfig 
  } = useGameSimulation();

  const [buzzerMin, setBuzzerMin] = useState(config.buzzerResponseTime.min);
  const [buzzerMax, setBuzzerMax] = useState(config.buzzerResponseTime.max);
  const [answerMin, setAnswerMin] = useState(config.answerDelay.min);
  const [answerMax, setAnswerMax] = useState(config.answerDelay.max);
  const [correctProb, setCorrectProb] = useState(config.correctAnswerProbability * 100);

  const handleStart = () => {
    updateConfig({
      buzzerResponseTime: { min: buzzerMin, max: buzzerMax },
      answerDelay: { min: answerMin, max: answerMax },
      correctAnswerProbability: correctProb / 100,
    });
    startSimulation();
  };

  if (simulatedTeams.length === 0) {
    return (
      <Card className="p-6 bg-card/80 backdrop-blur-sm border-muted">
        <div className="text-center py-8">
          <Cpu className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-lg text-muted-foreground mb-2">
            Aucune équipe de simulation
          </p>
          <p className="text-sm text-muted-foreground">
            Créez d'abord des équipes via le bouton "Mode Simulation"
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Cpu className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Contrôle de Simulation</h3>
              <p className="text-sm text-muted-foreground">
                Simuler le comportement des équipes automatiquement
              </p>
            </div>
          </div>
          
          <Badge 
            variant={isRunning ? "default" : "outline"}
            className="text-lg px-4 py-2"
          >
            {isRunning ? "🟢 En cours" : "⚫ Arrêtée"}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Équipes simulées</p>
              <p className="text-2xl font-bold">{simulatedTeams.length}</p>
            </div>
          </div>
        </div>

        {/* Configuration */}
        {!isRunning && (
          <div className="space-y-6 pt-4 border-t">
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4" />
                Temps de réaction au buzzer (ms)
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Min</Label>
                  <Input
                    type="number"
                    value={buzzerMin}
                    onChange={(e) => setBuzzerMin(Number(e.target.value))}
                    min={50}
                    max={5000}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Max</Label>
                  <Input
                    type="number"
                    value={buzzerMax}
                    onChange={(e) => setBuzzerMax(Number(e.target.value))}
                    min={50}
                    max={5000}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Délai entre l'activation du buzzer et la réponse des équipes
              </p>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4" />
                Temps de réponse aux questions (ms)
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Min</Label>
                  <Input
                    type="number"
                    value={answerMin}
                    onChange={(e) => setAnswerMin(Number(e.target.value))}
                    min={500}
                    max={10000}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Max</Label>
                  <Input
                    type="number"
                    value={answerMax}
                    onChange={(e) => setAnswerMax(Number(e.target.value))}
                    min={500}
                    max={10000}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Délai pour soumettre une réponse à une question
              </p>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4" />
                Probabilité de réponse correcte: {correctProb}%
              </Label>
              <Slider
                value={[correctProb]}
                onValueChange={(v) => setCorrectProb(v[0])}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Pourcentage de bonnes réponses données par les équipes simulées
              </p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3 pt-4 border-t">
          {!isRunning ? (
            <Button 
              onClick={handleStart} 
              size="lg" 
              className="flex-1"
              disabled={simulatedTeams.length === 0}
            >
              <Play className="h-5 w-5 mr-2" />
              Démarrer la simulation
            </Button>
          ) : (
            <Button 
              onClick={stopSimulation} 
              size="lg" 
              variant="destructive"
              className="flex-1"
            >
              <Square className="h-5 w-5 mr-2" />
              Arrêter la simulation
            </Button>
          )}
        </div>

        {isRunning && (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-center">
              🤖 Les équipes simulées réagissent automatiquement aux questions et buzzers
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

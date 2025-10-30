/**
 * DemoModePanel - Panneau de contrôle du mode démo
 * Permet au régisseur de s'entraîner avec des équipes fictives
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PlayCircle, Users, Zap, MessageSquare, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  createDemoTeams,
  cleanupDemoTeams,
  simulateBuzzer,
  simulateQCMAnswers,
  simulateTextAnswers,
  activateDemoPresence,
  type DemoTeam,
} from "@/lib/services/demoMode";

interface DemoModePanelProps {
  sessionId: string | null;
  currentQuestionId: string | null;
  currentQuestionInstanceId: string | null;
  currentQuestion: any;
}

export const DemoModePanel = ({
  sessionId,
  currentQuestionId,
  currentQuestionInstanceId,
  currentQuestion,
}: DemoModePanelProps) => {
  const { toast } = useToast();
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [demoTeams, setDemoTeams] = useState<DemoTeam[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Activer/désactiver le mode démo
  const toggleDemoMode = async (active: boolean) => {
    if (active) {
      await startDemoMode();
    } else {
      await stopDemoMode();
    }
  };

  // Démarrer le mode démo
  const startDemoMode = async () => {
    if (!sessionId) {
      toast({ 
        title: "❌ Aucune session active", 
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);
    try {
      const teams = await createDemoTeams(sessionId);
      setDemoTeams(teams);
      setIsDemoActive(true);
      
      // Activer la présence
      await activateDemoPresence(teams);

      toast({
        title: "🎭 Mode démo activé",
        description: `${teams.length} équipes fictives créées`,
      });
    } catch (error) {
      console.error('Erreur activation démo:', error);
      toast({
        title: "❌ Erreur activation démo",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Arrêter le mode démo
  const stopDemoMode = async () => {
    setIsLoading(true);
    try {
      await cleanupDemoTeams();
      setDemoTeams([]);
      setIsDemoActive(false);

      toast({
        title: "🧹 Mode démo désactivé",
        description: "Équipes fictives supprimées",
      });
    } catch (error) {
      console.error('Erreur désactivation démo:', error);
      toast({
        title: "❌ Erreur désactivation démo",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Simuler un buzzer
  const handleSimulateBuzzer = async () => {
    if (!currentQuestionId || !currentQuestionInstanceId || !sessionId) {
      toast({ title: "❌ Aucune question active", variant: "destructive" });
      return;
    }

    try {
      await simulateBuzzer(
        currentQuestionId,
        currentQuestionInstanceId,
        sessionId,
        demoTeams
      );
      toast({ title: "⚡ Buzzer simulé" });
    } catch (error) {
      console.error('Erreur simulation buzzer:', error);
    }
  };

  // Simuler des réponses
  const handleSimulateAnswers = async () => {
    if (!currentQuestionId || !currentQuestionInstanceId || !sessionId || !currentQuestion) {
      toast({ title: "❌ Aucune question active", variant: "destructive" });
      return;
    }

    try {
      if (currentQuestion.question_type === 'qcm' && currentQuestion.options) {
        const options = typeof currentQuestion.options === 'string' 
          ? JSON.parse(currentQuestion.options) 
          : currentQuestion.options;
        
        await simulateQCMAnswers(
          currentQuestionId,
          currentQuestionInstanceId,
          sessionId,
          demoTeams,
          options
        );
      } else {
        await simulateTextAnswers(
          currentQuestionId,
          currentQuestionInstanceId,
          sessionId,
          demoTeams
        );
      }
      
      toast({ title: "📝 Réponses simulées" });
    } catch (error) {
      console.error('Erreur simulation réponses:', error);
    }
  };

  return (
    <Card className="p-4 bg-purple-500/10 border-purple-500/30">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-bold text-purple-400">Mode Démo</h3>
            {isDemoActive && (
              <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/50">
                Actif
              </Badge>
            )}
          </div>
          <Switch
            checked={isDemoActive}
            onCheckedChange={toggleDemoMode}
            disabled={isLoading}
          />
        </div>

        {/* Description */}
        {!isDemoActive && (
          <p className="text-sm text-muted-foreground">
            Activez le mode démo pour créer des équipes fictives et simuler des événements.
            Parfait pour l'entraînement du régisseur !
          </p>
        )}

        {/* Contrôles démo */}
        {isDemoActive && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {demoTeams.length} équipes fictives actives
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSimulateBuzzer}
                disabled={!currentQuestionId}
                className="border-purple-500/30 hover:bg-purple-500/20"
              >
                <Zap className="h-4 w-4 mr-2" />
                Buzzer
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleSimulateAnswers}
                disabled={!currentQuestionId}
                className="border-purple-500/30 hover:bg-purple-500/20"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Réponses
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={stopDemoMode}
              className="w-full border-destructive/30 hover:bg-destructive/20 text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Nettoyer tout
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

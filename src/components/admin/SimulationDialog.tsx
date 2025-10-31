import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SimulationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const SimulationDialog = ({ open, onOpenChange, onSuccess }: SimulationDialogProps) => {
  const { toast } = useToast();
  const [teamCount, setTeamCount] = useState(10);
  const [isCreating, setIsCreating] = useState(false);

  const teamColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DFE6E9', '#74B9FF', '#A29BFE', '#FD79A8', '#FDCB6E',
    '#E17055', '#00B894', '#00CEC9', '#6C5CE7', '#FF7675',
    '#FE9F8E', '#81ECEC', '#FAB1A0', '#FF8787', '#55EFC4'
  ];

  const createSimulationTeams = async () => {
    if (teamCount < 1 || teamCount > 50) {
      toast({
        title: "Nombre invalide",
        description: "Veuillez choisir entre 1 et 50 équipes",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);

    try {
      // Supprimer d'abord toutes les équipes de simulation existantes
      await supabase.from('teams').delete().ilike('name', 'SIM-%');

      // Créer les nouvelles équipes
      const teams = Array.from({ length: teamCount }, (_, i) => ({
        name: `SIM-${String(i + 1).padStart(2, '0')}`,
        color: teamColors[i % teamColors.length],
        score: 0,
        is_active: true,
        yellow_cards: 0,
        is_excluded: false
      }));

      const { error } = await supabase.from('teams').insert(teams);

      if (error) throw error;

      toast({
        title: "✅ Équipes créées",
        description: `${teamCount} équipes de simulation ont été créées`
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur création équipes simulation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer les équipes de simulation",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Mode Simulation
          </DialogTitle>
          <DialogDescription>
            Créez des équipes de test pour simuler une partie
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Les équipes existantes préfixées par "SIM-" seront supprimées
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="teamCount">Nombre d'équipes (1-50)</Label>
            <Input
              id="teamCount"
              type="number"
              min={1}
              max={50}
              value={teamCount}
              onChange={(e) => setTeamCount(parseInt(e.target.value) || 0)}
              placeholder="10"
            />
            <p className="text-sm text-muted-foreground">
              Les équipes seront nommées SIM-01, SIM-02, etc.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isCreating}
            >
              Annuler
            </Button>
            <Button
              onClick={createSimulationTeams}
              className="flex-1"
              disabled={isCreating}
            >
              {isCreating ? "Création..." : `Créer ${teamCount} équipes`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

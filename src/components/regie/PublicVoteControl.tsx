import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getGameEvents } from "@/lib/runtime/GameEvents";

interface PublicVoteControlProps {
  showPublicVotes: boolean;
  finalId: string | null;
  currentQuestionInstanceId: string | null;
}

export const PublicVoteControl = ({ 
  showPublicVotes, 
  finalId,
  currentQuestionInstanceId 
}: PublicVoteControlProps) => {
  const { toast } = useToast();
  const gameEvents = getGameEvents();

  const toggleVotes = () => {
    if (!finalId || !currentQuestionInstanceId) {
      toast({
        title: "Action impossible",
        description: "Aucune finale ou question active",
        variant: "destructive"
      });
      return;
    }

    gameEvents.emit({ 
      type: !showPublicVotes ? 'SHOW_PUBLIC_VOTES' : 'HIDE_PUBLIC_VOTES'
    });
    
    toast({
      title: showPublicVotes ? "Votes masqués" : "Votes affichés",
      description: showPublicVotes 
        ? "Les résultats des votes sont maintenant masqués"
        : "Les résultats des votes sont maintenant affichés à l'écran"
    });
  };

  if (!finalId) return null;

  return (
    <Card className="p-4 bg-purple-500/10 border-purple-500/30">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">Affichage des votes</h3>
          <p className="text-sm text-muted-foreground">
            {currentQuestionInstanceId 
              ? "Afficher les résultats du vote du public"
              : "Aucune question active"}
          </p>
        </div>
        <Button
          onClick={toggleVotes}
          disabled={!currentQuestionInstanceId}
          variant={showPublicVotes ? "default" : "outline"}
          className={showPublicVotes ? "bg-purple-500 hover:bg-purple-600" : ""}
        >
          {showPublicVotes ? (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Visible
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Masqué
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};
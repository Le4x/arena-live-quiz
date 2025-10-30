import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Music, Clock, ListChecks } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RoundCardProps {
  round: any;
  questionsCount: number;
  onEdit: (round: any) => void;
  onDelete: (roundId: string) => void;
}

export const RoundCard = ({ round, questionsCount, onEdit, onDelete }: RoundCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'blind_test':
        return '🎵 Blind Test';
      case 'qcm':
        return '📋 QCM';
      case 'free_text':
        return '✍️ Texte libre';
      default:
        return type;
    }
  };

  return (
    <>
      <Card className="p-4 bg-card/80 backdrop-blur-sm border-secondary/20 hover:border-secondary/40 transition-all animate-fade-in">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">{round.title}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1">
                {getTypeLabel(round.type)}
              </Badge>
              {round.timer_duration && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {round.timer_duration}s
                </Badge>
              )}
              <Badge variant="outline" className="gap-1">
                <ListChecks className="h-3 w-3" />
                {questionsCount} question{questionsCount > 1 ? 's' : ''}
              </Badge>
              {round.jingle_url && (
                <Badge variant="outline" className="gap-1 bg-secondary/10">
                  <Music className="h-3 w-3" />
                  Jingle
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(round)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        {round.created_at && (
          <p className="text-xs text-muted-foreground">
            Créée le {new Date(round.created_at).toLocaleDateString('fr-FR')}
          </p>
        )}
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la manche ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La manche "{round.title}" et toutes ses questions ({questionsCount}) seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(round.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

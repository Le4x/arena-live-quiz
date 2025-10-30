import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, QrCode, Key } from "lucide-react";
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
import { useState } from "react";

interface TeamCardProps {
  team: any;
  onEdit: (team: any) => void;
  onDelete: (teamId: string) => void;
  onShowQR: (team: any) => void;
}

export const TeamCard = ({ team, onEdit, onDelete, onShowQR }: TeamCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);

  return (
    <>
      <div
        className="p-6 rounded-lg border-2 bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-all animate-fade-in"
        style={{ borderColor: team.color }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full border-4 border-background shadow-lg"
              style={{ backgroundColor: team.color }}
            />
            <div>
              <h3 className="text-xl font-bold">{team.name}</h3>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline">{team.score || 0} points</Badge>
                {team.is_connected && (
                  <Badge variant="default" className="bg-green-500">En ligne</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPinDialog(true)}
              className="gap-2"
            >
              <Key className="h-4 w-4" />
              PIN
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowQR(team)}
            >
              <QrCode className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(team)}
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

        <div className="text-sm text-muted-foreground">
          {team.created_at && (
            <p>Créée le {new Date(team.created_at).toLocaleDateString('fr-FR')}</p>
          )}
        </div>
      </div>

      {/* Dialog de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'équipe ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'équipe "{team.name}" sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(team.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog du code PIN */}
      <AlertDialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Code PIN - {team.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ce code permet à l'équipe de se connecter sans QR code
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col items-center gap-4 py-8">
            <div 
              className="text-6xl font-bold tracking-widest p-8 rounded-lg"
              style={{ 
                backgroundColor: team.color + '20',
                color: team.color
              }}
            >
              {team.connection_pin}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Les joueurs peuvent entrer ce code PIN sur la page de connexion
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Fermer</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

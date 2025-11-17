import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, PlayCircle, CheckCircle2, XCircle, Image, Trophy, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

interface SessionCardProps {
  session: any;
  onEdit: (session: any) => void;
  onDelete: (sessionId: string) => void;
  onActivate: (sessionId: string) => void;
  onDuplicate: (session: any) => void;
}

export const SessionCard = ({ session, onEdit, onDelete, onActivate, onDuplicate }: SessionCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const navigate = useNavigate();

  const getStatusBadge = () => {
    switch (session.status) {
      case 'active':
        return <Badge className="bg-green-500 text-white"><CheckCircle2 className="h-3 w-3 mr-1" /> Active</Badge>;
      case 'ended':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" /> Terminée</Badge>;
      default:
        return <Badge variant="outline">Brouillon</Badge>;
    }
  };

  const roundsData = session.selected_rounds ? 
    (typeof session.selected_rounds === 'string' ? JSON.parse(session.selected_rounds) : session.selected_rounds) 
    : [];

  return (
    <>
      <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all animate-fade-in">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {session.logo_url ? (
                <img 
                  src={session.logo_url} 
                  alt="Logo" 
                  className="h-12 w-12 object-contain rounded border border-border"
                />
              ) : (
                <div className="h-12 w-12 rounded bg-muted/50 flex items-center justify-center">
                  <Image className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <h3 className="text-2xl font-bold">{session.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge()}
                  <span className="text-xs text-muted-foreground">
                    {roundsData.length} manche{roundsData.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {session.status !== 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onActivate(session.id)}
                className="gap-2"
              >
                <PlayCircle className="h-4 w-4" />
                Activer
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDuplicate(session)}
              title="Dupliquer cette session"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(session)}
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

        <div className="space-y-2 text-sm text-muted-foreground">
          {session.created_at && (
            <p>Créée le {new Date(session.created_at).toLocaleDateString('fr-FR')}</p>
          )}
          {session.started_at && (
            <p>Démarrée le {new Date(session.started_at).toLocaleDateString('fr-FR')}</p>
          )}
        </div>

        <Button 
          onClick={() => navigate(`/admin/sponsors/${session.id}`)}
          variant="outline" 
          size="sm" 
          className="w-full mt-4 gap-2"
        >
          <Trophy className="h-4 w-4" />
          Gérer les sponsors
        </Button>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la session ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données de la session "{session.name}" seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(session.id)}
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

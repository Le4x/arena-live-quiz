import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientSessions } from '@/hooks/useClientSessions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreateSessionForm } from '@/components/session-manager/CreateSessionForm';
import {
  Plus,
  Calendar,
  MapPin,
  Users,
  Download,
  Play,
  Edit,
  Trash,
  QrCode,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function SessionsManager() {
  const navigate = useNavigate();
  const { sessions, isLoading, deleteSession } = useClientSessions();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      draft: { label: 'Brouillon', variant: 'secondary' },
      active: { label: 'En cours', variant: 'default' },
      paused: { label: 'En pause', variant: 'outline' },
      completed: { label: 'Terminée', variant: 'outline' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getSessionTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      quiz: 'Quiz',
      blindtest: 'Blindtest',
      mixed: 'Quiz + Blindtest',
    };
    return types[type] || type;
  };

  const handleDeleteSession = () => {
    if (sessionToDelete) {
      deleteSession.mutate(sessionToDelete, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setSessionToDelete(null);
        },
      });
    }
  };

  const upcomingSessions = sessions?.filter(
    (s) =>
      s.status === 'draft' ||
      (s.event_date && new Date(s.event_date) >= new Date(new Date().setHours(0, 0, 0, 0)))
  );

  const activeSessions = sessions?.filter((s) => s.status === 'active');
  const completedSessions = sessions?.filter((s) => s.status === 'completed');

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Chargement des sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Sessions Clients</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos événements quiz et blindtest
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle Session
        </Button>
      </div>

      <Separator />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sessions à venir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingSessions?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sessions actives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sessions terminées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedSessions?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions */}
      {activeSessions && activeSessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">En cours maintenant</h2>
          <div className="grid grid-cols-1 gap-4">
            {activeSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onDownloadKit={() => navigate(`/sessions/${session.id}/kit`)}
                onStart={() => navigate(`/regie?session=${session.id}`)}
                onEdit={() => navigate(`/sessions/${session.id}/edit`)}
                onDelete={() => {
                  setSessionToDelete(session.id);
                  setDeleteDialogOpen(true);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Sessions */}
      {upcomingSessions && upcomingSessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">À venir</h2>
          <div className="grid grid-cols-1 gap-4">
            {upcomingSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onDownloadKit={() => navigate(`/sessions/${session.id}/kit`)}
                onStart={() => navigate(`/regie?session=${session.id}`)}
                onEdit={() => navigate(`/sessions/${session.id}/edit`)}
                onDelete={() => {
                  setSessionToDelete(session.id);
                  setDeleteDialogOpen(true);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Sessions */}
      {completedSessions && completedSessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Terminées</h2>
          <div className="grid grid-cols-1 gap-4">
            {completedSessions.slice(0, 5).map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onDownloadKit={() => navigate(`/sessions/${session.id}/kit`)}
                onEdit={() => navigate(`/sessions/${session.id}/edit`)}
                onDelete={() => {
                  setSessionToDelete(session.id);
                  setDeleteDialogOpen(true);
                }}
                hideStartButton
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!sessions || sessions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune session</h3>
            <p className="text-muted-foreground mb-4">Créez votre première session client</p>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Créer une Session
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer une Nouvelle Session</DialogTitle>
            <DialogDescription>
              Configurez tous les détails de votre événement client
            </DialogDescription>
          </DialogHeader>
          <CreateSessionForm
            onSuccess={(sessionId) => {
              setCreateDialogOpen(false);
              navigate(`/sessions/${sessionId}/kit`);
            }}
            onCancel={() => setCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La session et toutes ses données seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSession}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface SessionCardProps {
  session: any;
  onDownloadKit: () => void;
  onStart?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  hideStartButton?: boolean;
}

function SessionCard({
  session,
  onDownloadKit,
  onStart,
  onEdit,
  onDelete,
  hideStartButton,
}: SessionCardProps) {
  const connectedTeams = session.teams?.[0]?.count || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle>{session.name}</CardTitle>
              {getStatusBadge(session.status)}
              <Badge variant="outline">{getSessionTypeLabel(session.session_type)}</Badge>
            </div>
            {session.client_company && (
              <CardDescription className="text-base">
                {session.client_company} {session.client_name && `- ${session.client_name}`}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onDownloadKit} className="gap-2">
              <QrCode className="h-4 w-4" />
              Kit Client
            </Button>
            {!hideStartButton && onStart && (
              <Button size="sm" onClick={onStart} className="gap-2">
                <Play className="h-4 w-4" />
                Démarrer
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {session.event_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(session.event_date), 'PPP', { locale: fr })}</span>
            </div>
          )}
          {session.event_location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{session.event_location}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {connectedTeams}/{session.max_teams} équipes
            </span>
          </div>
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-muted-foreground" />
            <code className="text-xs font-mono">{session.access_code}</code>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit} className="gap-2">
            <Edit className="h-4 w-4" />
            Modifier
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="gap-2 text-destructive">
            <Trash className="h-4 w-4" />
            Supprimer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusBadge(status: string) {
  const statusConfig: Record<
    string,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    draft: { label: 'Brouillon', variant: 'secondary' },
    active: { label: 'En cours', variant: 'default' },
    paused: { label: 'En pause', variant: 'outline' },
    completed: { label: 'Terminée', variant: 'outline' },
  };

  const config = statusConfig[status] || statusConfig.draft;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function getSessionTypeLabel(type: string) {
  const types: Record<string, string> = {
    quiz: 'Quiz',
    blindtest: 'Blindtest',
    mixed: 'Quiz + Blindtest',
  };
  return types[type] || type;
}

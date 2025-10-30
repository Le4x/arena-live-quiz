import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Plus, RotateCcw, ArrowLeft, QrCode, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { TeamCard } from "@/components/admin/TeamCard";
import { TeamDialog } from "@/components/admin/TeamDialog";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const AdminTeams = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeam, setEditingTeam] = useState<any | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedTeamQR, setSelectedTeamQR] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    loadTeams();

    // S'abonner aux changements en temps réel
    const teamsChannel = supabase
      .channel('admin-teams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, loadTeams)
      .subscribe();

    return () => {
      supabase.removeChannel(teamsChannel);
    };
  }, []);

  const loadTeams = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setTeams(data);
    setLoading(false);
  };

  const handleSave = async (teamData: any) => {
    if (teamData.id) {
      // Modifier une équipe existante
      const { error } = await supabase
        .from('teams')
        .update({ name: teamData.name, color: teamData.color })
        .eq('id', teamData.id);

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de modifier l'équipe",
          variant: "destructive"
        });
      } else {
        toast({ title: "✅ Équipe modifiée avec succès" });
        loadTeams();
      }
    } else {
      // Créer une nouvelle équipe
      const { error } = await supabase
        .from('teams')
        .insert([{ name: teamData.name, color: teamData.color, score: 0 }]);

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de créer l'équipe",
          variant: "destructive"
        });
      } else {
        toast({ title: "✅ Équipe créée avec succès" });
        loadTeams();
      }
    }
  };

  const handleDelete = async (teamId: string) => {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'équipe",
        variant: "destructive"
      });
    } else {
      toast({ title: "✅ Équipe supprimée" });
      loadTeams();
    }
  };

  const handleEdit = (team: any) => {
    setEditingTeam(team);
    setShowDialog(true);
  };

  const handleCreate = () => {
    setEditingTeam(null);
    setShowDialog(true);
  };

  const generateQRCode = async (team: any) => {
    const url = `${window.location.origin}/client/${team.id}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: team.color,
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrDataUrl);
      setSelectedTeamQR(team);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le QR code",
        variant: "destructive"
      });
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl || !selectedTeamQR) return;
    
    const link = document.createElement('a');
    link.download = `qr-${selectedTeamQR.name}.png`;
    link.href = qrCodeUrl;
    link.click();
    
    toast({
      title: "QR Code téléchargé",
      description: `QR code de ${selectedTeamQR.name} téléchargé`
    });
  };

  const resetScores = async () => {
    if (!confirm('Réinitialiser tous les scores des équipes ?')) return;

    const { error } = await supabase
      .from('teams')
      .update({ score: 0 })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser les scores",
        variant: "destructive"
      });
    } else {
      toast({ title: "✅ Scores réinitialisés" });
      loadTeams();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-glow p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between py-8">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-5xl font-bold bg-gradient-arena bg-clip-text text-transparent">
              Gestion des Équipes
            </h1>
            <p className="text-muted-foreground text-xl mt-2">
              Créer et gérer les équipes participantes
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={resetScores} variant="outline" size="lg">
              <RotateCcw className="h-5 w-5 mr-2" />
              Réinitialiser les scores
            </Button>
            <Button onClick={handleCreate} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Nouvelle équipe
            </Button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-primary/10">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total d'équipes</p>
                <p className="text-3xl font-bold">{teams.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-card/80 backdrop-blur-sm border-green-500/20">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-green-500/10">
                <Users className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Équipes en ligne</p>
                <p className="text-3xl font-bold">
                  {teams.filter(t => t.is_connected).length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-card/80 backdrop-blur-sm border-accent/20">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-accent/10">
                <Users className="h-8 w-8 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Score total</p>
                <p className="text-3xl font-bold">
                  {teams.reduce((sum, t) => sum + (t.score || 0), 0)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Liste des équipes */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-accent/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-accent flex items-center gap-2">
              <Users className="h-6 w-6" />
              Équipes ({teams.length})
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Chargement...
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-xl text-muted-foreground mb-4">
                Aucune équipe créée
              </p>
              <Button onClick={handleCreate} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Créer la première équipe
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onShowQR={generateQRCode}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Dialog d'édition/création */}
      <TeamDialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) setEditingTeam(null);
        }}
        team={editingTeam}
        onSave={handleSave}
      />

      {/* Dialog QR Code */}
      <Dialog open={!!selectedTeamQR} onOpenChange={() => setSelectedTeamQR(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code - {selectedTeamQR?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center p-4 bg-white rounded-lg">
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code" className="w-full max-w-[300px]" />
              )}
            </div>
            <div className="text-sm text-muted-foreground text-center">
              Scannez ce code pour rejoindre l'équipe<br />
              <span className="font-bold" style={{ color: selectedTeamQR?.color }}>
                {selectedTeamQR?.name}
              </span>
            </div>
            <Button onClick={downloadQRCode} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Télécharger le QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTeams;

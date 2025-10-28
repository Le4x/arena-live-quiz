import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, QrCode, Download, Trash2, Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { NetworkStatus } from "@/components/NetworkStatus";
import {
  connectRealtime,
  onFullState,
  onPartial,
  createTeam,
  updateTeam,
  type GameState
} from "@/lib/realtime";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const AdminLocal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#FFD700");
  const [selectedTeamQR, setSelectedTeamQR] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3001';
    connectRealtime(baseUrl, 'regie');

    onFullState((state: GameState) => {
      console.log('📦 AdminLocal: État complet reçu', state);
      setGameState(state);
    });

    onPartial((partial: Partial<GameState>) => {
      console.log('🔄 AdminLocal: Mise à jour partielle', partial);
      setGameState((prev) => prev ? { ...prev, ...partial } : null);
    });
  }, []);

  const handleCreateTeam = () => {
    if (!newTeamName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nom d'équipe",
        variant: "destructive"
      });
      return;
    }

    const team = {
      id: crypto.randomUUID(),
      name: newTeamName,
      color: newTeamColor,
      score: 0
    };

    createTeam(team);
    setNewTeamName("");
    
    toast({
      title: "Équipe créée !",
      description: `${team.name} a été ajoutée`,
    });
  };

  const handleDeleteTeam = (teamId: string) => {
    if (!gameState) return;
    
    const updatedTeams = gameState.teams.filter((t: any) => t.id !== teamId);
    updateTeam(teamId, { teams: updatedTeams });
    
    toast({
      title: "Équipe supprimée",
    });
  };

  const generateQRCode = async (team: any) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/client/${team.id}`;
    
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

  const colors = [
    '#FFD700', '#3B82F6', '#A855F7', '#EF4444', '#10B981', '#F59E0B', 
    '#EC4899', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EAB308',
    '#14B8A6', '#6366F1', '#F43F5E', '#22D3EE', '#A3E635', '#FB923C',
  ];

  const teams = gameState?.teams || [];

  return (
    <div className="min-h-screen bg-gradient-glow p-6">
      <NetworkStatus />
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between py-8">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-arena bg-clip-text text-transparent">
              Admin Local - Équipes
            </h1>
            <p className="text-muted-foreground text-xl mt-2">
              Gérez les équipes en mode local
            </p>
          </div>
          <Button onClick={() => navigate('/regie/local')} variant="outline" size="lg">
            Retour à la régie
          </Button>
        </header>

        {/* Gestion des équipes */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-accent/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-accent flex items-center gap-2">
              <Users className="h-6 w-6" />
              Équipes connectées ({teams.length})
            </h2>
          </div>

          {/* Créer une équipe */}
          <div className="mb-6 p-4 rounded-lg bg-muted/30 border border-border">
            <h3 className="font-bold mb-3">Créer une nouvelle équipe</h3>
            <div className="flex gap-4">
              <Input
                placeholder="Nom de l'équipe"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="flex-1"
              />
              
              <Dialog open={showColorPicker} onOpenChange={setShowColorPicker}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <div
                      className="w-5 h-5 rounded-full border-2 border-border"
                      style={{ backgroundColor: newTeamColor }}
                    />
                    <Palette className="h-4 w-4" />
                    Couleur
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Choisir une couleur</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-6 gap-3 p-4">
                    {colors.map((color) => (
                      <button
                        key={color}
                        className={`w-12 h-12 rounded-full border-4 transition-all hover:scale-110 ${
                          newTeamColor === color ? 'border-foreground scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          setNewTeamColor(color);
                          setShowColorPicker(false);
                        }}
                      />
                    ))}
                  </div>
                </DialogContent>
              </Dialog>

              <Button onClick={handleCreateTeam}>
                Créer
              </Button>
            </div>
          </div>

          {/* Liste des équipes */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team: any) => (
              <div
                key={team.id}
                className="p-4 rounded-lg border-2 bg-muted/30"
                style={{ borderColor: team.color }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                    <div>
                      <div className="font-bold">{team.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {team.score || 0} points
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateQRCode(team)}
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTeam(team.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {teams.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Aucune équipe créée
              </div>
            )}
          </div>
        </Card>
      </div>

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

export default AdminLocal;

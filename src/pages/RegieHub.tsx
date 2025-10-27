import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, Gamepad2, Settings, Volume2 } from "lucide-react";

const RegieHub = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-glow flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-6">
        {/* Header */}
        <div className="text-center animate-fade-in">
          <h1 className="text-5xl font-bold bg-gradient-arena bg-clip-text text-transparent animate-pulse-glow mb-2">
            ARENA
          </h1>
          <p className="text-muted-foreground text-lg">Choisissez votre régie</p>
        </div>

        {/* Cartes principales */}
        <div className="grid md:grid-cols-2 gap-6 animate-slide-in">
          {/* Régie Vidéo */}
          <Card 
            className="p-8 bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm border-primary shadow-glow-gold cursor-pointer hover:scale-105 transition-transform"
            onClick={() => navigate('/regie/video')}
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center shadow-glow-gold">
                <Gamepad2 className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-primary">Régie Jeu</h2>
              <p className="text-sm text-muted-foreground">
                Gestion des questions, buzzers, timer, scores et équipes
              </p>
              <Button 
                className="w-full bg-gradient-arena hover:opacity-90"
                size="lg"
              >
                Ouvrir
              </Button>
            </div>
          </Card>

          {/* Régie Son */}
          <Card 
            className="p-8 bg-gradient-to-br from-secondary/20 to-accent/20 backdrop-blur-sm border-secondary shadow-glow-blue cursor-pointer hover:scale-105 transition-transform"
            onClick={() => navigate('/regie/sound')}
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-secondary/20 flex items-center justify-center shadow-glow-blue">
                <Volume2 className="h-10 w-10 text-secondary" />
              </div>
              <h2 className="text-2xl font-bold text-secondary">Régie Son</h2>
              <p className="text-sm text-muted-foreground">
                Gestion des musiques et des effets sonores du jeu
              </p>
              <Button 
                className="w-full bg-secondary hover:bg-secondary/90"
                size="lg"
              >
                Ouvrir
              </Button>
            </div>
          </Card>
        </div>

        {/* Boutons secondaires */}
        <div className="flex justify-center gap-3 animate-fade-in">
          <Button 
            onClick={() => navigate('/admin/setup')}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Configuration
          </Button>
          <Button 
            onClick={() => navigate('/admin/sounds')}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <Music className="h-4 w-4" />
            Sons
          </Button>
        </div>

        {/* Info */}
        <div className="text-center text-xs text-muted-foreground animate-fade-in">
          <p>MusicArena #1 - Le plus grand blind test des Hauts de France</p>
        </div>
      </div>
    </div>
  );
};

export default RegieHub;

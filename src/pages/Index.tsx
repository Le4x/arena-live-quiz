import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Settings, PlaySquare, Monitor, Users, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-glow p-6 flex items-center justify-center">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-7xl font-bold bg-gradient-arena bg-clip-text text-transparent mb-4">
            ARENA
          </h1>
          <p className="text-2xl text-muted-foreground">
            Système de jeu interactif pour événements
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card 
            className="p-6 bg-card/80 backdrop-blur-sm border-primary/20 cursor-pointer hover:bg-card/90 transition-all hover:scale-105"
            onClick={() => navigate('/admin')}
          >
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Settings className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Configuration</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Gérer le jeu, les équipes et le contenu
                </p>
              </div>
            </div>
          </Card>

          <Card 
            className="p-6 bg-card/80 backdrop-blur-sm border-secondary/20 cursor-pointer hover:bg-card/90 transition-all hover:scale-105"
            onClick={() => navigate('/regie')}
          >
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                <PlaySquare className="h-8 w-8 text-secondary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Régie</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Piloter le jeu en direct
                </p>
              </div>
            </div>
          </Card>

          <Card 
            className="p-6 bg-card/80 backdrop-blur-sm border-accent/20 cursor-pointer hover:bg-card/90 transition-all hover:scale-105"
            onClick={() => navigate('/screen')}
          >
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                <Monitor className="h-8 w-8 text-accent" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Écran</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Affichage public du jeu
                </p>
              </div>
            </div>
          </Card>

          <Card 
            className="p-6 bg-card/80 backdrop-blur-sm border-green-500/20 cursor-pointer hover:bg-card/90 transition-all hover:scale-105"
            onClick={() => navigate('/client')}
          >
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <Users className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Client</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Interface pour les équipes
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card 
          className="p-6 bg-card/80 backdrop-blur-sm border-blue-500/20 cursor-pointer hover:bg-card/90 transition-all hover:scale-105 max-w-sm mx-auto"
          onClick={() => navigate('/monitoring')}
        >
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Monitoring</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Surveillance système en temps réel
              </p>
            </div>
          </div>
        </Card>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            💡 Commencez par la <span className="text-primary font-semibold">Configuration</span> pour créer vos équipes et questions
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;

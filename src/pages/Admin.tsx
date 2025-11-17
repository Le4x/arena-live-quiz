import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Settings, Music, Users, PlaySquare, GamepadIcon, Image, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

const Admin = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-glow p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between py-8">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-arena bg-clip-text text-transparent">
              Configuration ARENA
            </h1>
            <p className="text-muted-foreground text-xl mt-2">
              Gérez toutes les paramètres du jeu
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle variant="outline" size="lg" />
            <Button onClick={() => navigate('/regie')} variant="outline" size="lg">
              <PlaySquare className="mr-2 h-5 w-5" />
              Aller à la régie
            </Button>
          </div>
        </header>

        {/* Navigation rapide */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card 
            className="p-6 bg-card/80 backdrop-blur-sm border-primary/20 cursor-pointer hover:bg-card/90 transition-all"
            onClick={() => navigate('/admin/sessions')}
          >
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-primary/10">
                <GamepadIcon className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Sessions de jeu</h3>
                <p className="text-sm text-muted-foreground">Créer et gérer vos parties</p>
              </div>
            </div>
          </Card>

          <Card 
            className="p-6 bg-card/80 backdrop-blur-sm border-primary/20 cursor-pointer hover:bg-card/90 transition-all"
            onClick={() => navigate('/admin/setup')}
          >
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-primary/10">
                <Settings className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Manches & Questions</h3>
                <p className="text-sm text-muted-foreground">Créer et gérer le contenu</p>
              </div>
            </div>
          </Card>

          <Card
            className="p-6 bg-card/80 backdrop-blur-sm border-secondary/20 cursor-pointer hover:bg-card/90 transition-all"
            onClick={() => navigate('/admin/sounds')}
          >
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-secondary/10">
                <Music className="h-8 w-8 text-secondary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Banque de musique</h3>
                <p className="text-sm text-muted-foreground">Gérer les fichiers audio</p>
              </div>
            </div>
          </Card>

          <Card
            className="p-6 bg-card/80 backdrop-blur-sm border-purple-500/20 cursor-pointer hover:bg-card/90 transition-all"
            onClick={() => navigate('/admin/media')}
          >
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-purple-500/10">
                <Image className="h-8 w-8 text-purple-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Bibliothèque média</h3>
                <p className="text-sm text-muted-foreground">Images et audio centralisés</p>
              </div>
            </div>
          </Card>

          <Card
            className="p-6 bg-card/80 backdrop-blur-sm border-accent/20 cursor-pointer hover:bg-card/90 transition-all"
            onClick={() => navigate('/admin/teams')}
          >
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-accent/10">
                <Users className="h-8 w-8 text-accent" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Équipes</h3>
                <p className="text-sm text-muted-foreground">Gérer les participants</p>
              </div>
            </div>
          </Card>

          <Card
            className="p-6 bg-card/80 backdrop-blur-sm border-blue-500/20 cursor-pointer hover:bg-card/90 transition-all"
            onClick={() => navigate('/admin/analytics')}
          >
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-blue-500/10">
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Statistiques</h3>
                <p className="text-sm text-muted-foreground">Analytics et export de données</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;

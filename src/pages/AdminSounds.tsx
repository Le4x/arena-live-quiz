import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Play, Pause, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Sound {
  id: string;
  name: string;
  url: string;
}

const AdminSounds = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [newSoundName, setNewSoundName] = useState("");
  const [newSoundUrl, setNewSoundUrl] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    // Load sounds from localStorage for now
    const stored = localStorage.getItem('arena_sounds');
    if (stored) {
      setSounds(JSON.parse(stored));
    }
  }, []);

  const saveSounds = (updatedSounds: Sound[]) => {
    localStorage.setItem('arena_sounds', JSON.stringify(updatedSounds));
    setSounds(updatedSounds);
  };

  const addSound = () => {
    if (!newSoundName.trim() || !newSoundUrl.trim()) {
      toast({ title: "Erreur", description: "Nom et URL requis", variant: "destructive" });
      return;
    }

    const newSound: Sound = {
      id: Date.now().toString(),
      name: newSoundName,
      url: newSoundUrl,
    };

    saveSounds([...sounds, newSound]);
    setNewSoundName("");
    setNewSoundUrl("");
    toast({ title: "Son ajouté", description: newSoundName });
  };

  const deleteSound = (id: string) => {
    saveSounds(sounds.filter(s => s.id !== id));
    toast({ title: "Son supprimé" });
  };

  const playSound = (url: string, id: string) => {
    if (audioRef.current) {
      if (playingId === id) {
        audioRef.current.pause();
        setPlayingId(null);
      } else {
        audioRef.current.src = url;
        audioRef.current.play();
        setPlayingId(id);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-glow p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between py-8">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-arena bg-clip-text text-transparent">
              Gestion des sons
            </h1>
            <p className="text-muted-foreground text-xl mt-2">Bibliothèque audio pour le jeu</p>
          </div>
          <Button onClick={() => navigate('/regie')} variant="outline" size="lg">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Retour à la régie
          </Button>
        </header>

        {/* Ajouter un son */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20">
          <h2 className="text-2xl font-bold text-primary mb-4">Ajouter un son</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              placeholder="Nom du son"
              value={newSoundName}
              onChange={(e) => setNewSoundName(e.target.value)}
            />
            <Input
              placeholder="URL du fichier audio"
              value={newSoundUrl}
              onChange={(e) => setNewSoundUrl(e.target.value)}
            />
          </div>
          <Button onClick={addSound} className="mt-4 w-full bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-5 w-5" />
            Ajouter
          </Button>
        </Card>

        {/* Liste des sons */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-secondary/20">
          <h2 className="text-2xl font-bold text-secondary mb-4">Sons disponibles ({sounds.length})</h2>
          <div className="space-y-3">
            {sounds.map((sound) => (
              <div
                key={sound.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-border bg-muted/50"
              >
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => playSound(sound.url, sound.id)}
                >
                  {playingId === sound.id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <div className="flex-1">
                  <div className="font-bold">{sound.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{sound.url}</div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteSound(sound.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {sounds.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Aucun son enregistré
              </div>
            )}
          </div>
        </Card>

        <audio ref={audioRef} onEnded={() => setPlayingId(null)} />
      </div>
    </div>
  );
};

export default AdminSounds;
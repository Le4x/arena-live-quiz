import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Play, Pause, Plus, Trash2, Music, Upload, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface SoundWithCues {
  id: string;
  name: string;
  url: string;
  cue1_time: number; // CUE#1 : début extrait
  cue2_time: number; // CUE#2 : refrain/solution
  solution_duration: number; // Durée de la solution en secondes
}

const AdminSounds = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [sounds, setSounds] = useState<SoundWithCues[]>([]);
  const [newSoundName, setNewSoundName] = useState("");
  const [newSoundUrl, setNewSoundUrl] = useState("");
  const [newCue1, setNewCue1] = useState(0);
  const [newCue2, setNewCue2] = useState(30);
  const [newSolutionDuration, setNewSolutionDuration] = useState(8);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('arena_sounds');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Migration : ajouter cues si absents
        const migrated = parsed.map((s: any) => ({
          ...s,
          cue1_time: s.cue1_time ?? 0,
          cue2_time: s.cue2_time ?? 30,
          solution_duration: s.solution_duration ?? 8,
        }));
        setSounds(migrated);
      } catch {
        setSounds([]);
      }
    }
  }, []);

  const saveSounds = (updatedSounds: SoundWithCues[]) => {
    localStorage.setItem('arena_sounds', JSON.stringify(updatedSounds));
    setSounds(updatedSounds);
  };

  const addSound = () => {
    if (!newSoundName.trim() || !newSoundUrl.trim()) {
      toast({ title: "Erreur", description: "Nom et URL requis", variant: "destructive" });
      return;
    }

    const newSound: SoundWithCues = {
      id: Date.now().toString(),
      name: newSoundName,
      url: newSoundUrl,
      cue1_time: newCue1,
      cue2_time: newCue2,
      solution_duration: newSolutionDuration,
    };

    saveSounds([...sounds, newSound]);
    setNewSoundName("");
    setNewSoundUrl("");
    setNewCue1(0);
    setNewCue2(30);
    setNewSolutionDuration(8);
    toast({ title: "Son ajouté", description: newSoundName });
  };

  const updateSound = (id: string, updates: Partial<SoundWithCues>) => {
    const updated = sounds.map(s => s.id === id ? { ...s, ...updates } : s);
    saveSounds(updated);
    setEditingId(null);
    toast({ title: "Son mis à jour" });
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

  const seekToCue = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('audio/')) {
          toast({ 
            title: "Erreur", 
            description: `${file.name} n'est pas un fichier audio`,
            variant: "destructive" 
          });
          continue;
        }

        // Upload vers Supabase Storage
        const fileName = `${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
          .from('audio-files')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('Erreur upload:', error);
          toast({ 
            title: "Erreur upload", 
            description: error.message,
            variant: "destructive" 
          });
          continue;
        }

        // Obtenir l'URL publique
        const { data: { publicUrl } } = supabase.storage
          .from('audio-files')
          .getPublicUrl(fileName);

        // Créer l'entrée dans la banque de sons
        const newSound: SoundWithCues = {
          id: Date.now().toString(),
          name: file.name.replace(/\.[^/.]+$/, ""), // Nom sans extension
          url: publicUrl,
          cue1_time: 0,
          cue2_time: 30,
          solution_duration: 8,
        };

        saveSounds([...sounds, newSound]);
        toast({ 
          title: "✅ Fichier uploadé", 
          description: file.name 
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast({ 
        title: "Erreur", 
        description: "Impossible d'uploader les fichiers",
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-glow p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between py-8">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-arena bg-clip-text text-transparent">
              Banque de sons
            </h1>
            <p className="text-muted-foreground text-xl mt-2">Bibliothèque audio avec CUE points</p>
          </div>
          <Button onClick={() => navigate('/admin')} variant="outline" size="lg">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Retour
          </Button>
        </header>

        {/* Upload de fichiers MP3 */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-accent/20">
          <h2 className="text-2xl font-bold text-accent mb-4">📤 Upload MP3 depuis votre ordinateur</h2>
          <p className="text-muted-foreground mb-4">
            Uploadez vos fichiers MP3 directement vers Lovable Cloud Storage. Ils seront automatiquement ajoutés à votre banque de sons.
          </p>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Sélectionner des fichiers MP3</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                className="mt-1"
              />
            </div>
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-accent hover:bg-accent/90"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  Choisir des fichiers
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Ajouter un son manuellement */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20">
          <h2 className="text-2xl font-bold text-primary mb-4">➕ Ou ajouter une URL manuellement</h2>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Nom du son</Label>
                <Input
                  placeholder="Chanson titre - artiste"
                  value={newSoundName}
                  onChange={(e) => setNewSoundName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>URL du fichier audio</Label>
                <Input
                  placeholder="https://example.com/music.mp3"
                  value={newSoundUrl}
                  onChange={(e) => setNewSoundUrl(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>CUE#1 - Début extrait (secondes)</Label>
                <Input
                  type="number"
                  value={newCue1}
                  onChange={(e) => setNewCue1(parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>CUE#2 - Refrain/Solution (secondes)</Label>
                <Input
                  type="number"
                  value={newCue2}
                  onChange={(e) => setNewCue2(parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Durée solution (secondes)</Label>
                <Input
                  type="number"
                  value={newSolutionDuration}
                  onChange={(e) => setNewSolutionDuration(parseInt(e.target.value) || 8)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <Button onClick={addSound} className="mt-4 w-full bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-5 w-5" />
            Ajouter
          </Button>
        </Card>

        {/* Liste des sons */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-secondary/20">
          <h2 className="text-2xl font-bold text-secondary mb-4">Sons disponibles ({sounds.length})</h2>
          <div className="space-y-4">
            {sounds.map((sound) => (
              <div
                key={sound.id}
                className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-muted/50"
              >
                <div className="flex items-center gap-4">
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
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(editingId === sound.id ? null : sound.id)}
                  >
                    <Music className="h-4 w-4 mr-2" />
                    Éditer CUEs
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteSound(sound.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {editingId === sound.id && (
                  <div className="grid md:grid-cols-4 gap-3 pt-3 border-t border-border">
                    <div>
                      <Label className="text-xs">CUE#1 (s)</Label>
                      <Input
                        type="number"
                        defaultValue={sound.cue1_time}
                        onBlur={(e) => updateSound(sound.id, { cue1_time: parseInt(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">CUE#2 (s)</Label>
                      <Input
                        type="number"
                        defaultValue={sound.cue2_time}
                        onBlur={(e) => updateSound(sound.id, { cue2_time: parseInt(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Durée solution (s)</Label>
                      <Input
                        type="number"
                        defaultValue={sound.solution_duration}
                        onBlur={(e) => updateSound(sound.id, { solution_duration: parseInt(e.target.value) || 8 })}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2 items-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => seekToCue(sound.cue1_time)}
                        className="flex-1"
                      >
                        →CUE#1
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => seekToCue(sound.cue2_time)}
                        className="flex-1"
                      >
                        →CUE#2
                      </Button>
                    </div>
                  </div>
                )}
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

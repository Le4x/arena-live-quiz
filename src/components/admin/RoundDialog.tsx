import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, Loader2, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  round: any | null;
  onSave: () => void;
}

export const RoundDialog = ({ open, onOpenChange, round, onSave }: RoundDialogProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("blind_test");
  const [timerDuration, setTimerDuration] = useState(30);
  const [jingleUrl, setJingleUrl] = useState("");
  const [jingleFile, setJingleFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (round) {
      setTitle(round.title || "");
      setType(round.type || "blind_test");
      setTimerDuration(round.timer_duration || 30);
      setJingleUrl(round.jingle_url || "");
    } else {
      setTitle("");
      setType("blind_test");
      setTimerDuration(30);
      setJingleUrl("");
      setJingleFile(null);
    }
  }, [round, open]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type
    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Erreur",
        description: "Seuls les fichiers audio sont acceptés",
        variant: "destructive"
      });
      return;
    }

    // Vérifier la taille (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Erreur",
        description: "Le fichier ne doit pas dépasser 10MB",
        variant: "destructive"
      });
      return;
    }

    setJingleFile(file);
    setJingleUrl(file.name);
  };

  const uploadJingle = async (): Promise<string | null> => {
    if (!jingleFile) return jingleUrl;

    setUploading(true);
    try {
      const fileExt = jingleFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(filePath, jingleFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data } = supabase.storage
        .from('audio-files')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur d'upload",
        description: error.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Erreur",
        description: "Le titre de la manche est requis",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      // Upload du jingle si un nouveau fichier a été sélectionné
      let finalJingleUrl = jingleUrl;
      if (jingleFile) {
        const uploadedUrl = await uploadJingle();
        if (uploadedUrl) {
          finalJingleUrl = uploadedUrl;
        }
      }

      const roundData = {
        title: title.trim(),
        type,
        timer_duration: timerDuration,
        jingle_url: finalJingleUrl || null,
      };

      if (round) {
        // Mise à jour
        const { error } = await supabase
          .from('rounds')
          .update(roundData)
          .eq('id', round.id);

        if (error) throw error;

        toast({
          title: "Manche mise à jour",
          description: `"${title}" a été mise à jour avec succès`
        });
      } else {
        // Création
        const { error } = await supabase
          .from('rounds')
          .insert([roundData]);

        if (error) throw error;

        toast({
          title: "Manche créée",
          description: `"${title}" a été créée avec succès`
        });
      }

      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {round ? "Modifier la manche" : "Nouvelle manche"}
          </DialogTitle>
          <DialogDescription>
            {round 
              ? "Modifiez les informations de la manche"
              : "Créez une nouvelle manche de jeu"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre de la manche *</Label>
            <Input
              id="title"
              placeholder="Ex: Manche 1 - Années 80"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type de manche *</Label>
            <Select value={type} onValueChange={setType} disabled={saving}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blind_test">🎵 Blind Test</SelectItem>
                <SelectItem value="qcm">📋 QCM</SelectItem>
                <SelectItem value="free_text">✍️ Texte libre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timer">Durée du timer (secondes)</Label>
            <Input
              id="timer"
              type="number"
              min="5"
              max="300"
              value={timerDuration}
              onChange={(e) => setTimerDuration(parseInt(e.target.value) || 30)}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              Temps alloué pour répondre aux questions de cette manche
            </p>
          </div>

          <div className="space-y-2">
            <Label>Jingle d'introduction (optionnel)</Label>
            
            <div className="flex items-center gap-3">
              {jingleUrl && !jingleFile && (
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded border border-border bg-muted/30">
                  <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate flex-1">Jingle configuré</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setJingleUrl("")}
                    disabled={saving}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {jingleFile && (
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded border border-border bg-muted/30">
                  <Music className="h-4 w-4 text-secondary flex-shrink-0" />
                  <span className="text-sm truncate flex-1">{jingleFile.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setJingleFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    disabled={saving}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {!jingleUrl && !jingleFile && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploading || saving}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || saving}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Upload...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Choisir un jingle
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              MP3, WAV • Max 10MB
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || uploading}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              round ? "Mettre à jour" : "Créer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

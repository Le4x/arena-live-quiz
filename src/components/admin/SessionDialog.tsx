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
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: any | null;
  onSave: () => void;
}

export const SessionDialog = ({ open, onOpenChange, session, onSave }: SessionDialogProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [hasFinal, setHasFinal] = useState(false);
  const [finalTeamCount, setFinalTeamCount] = useState(8);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session) {
      setName(session.name || "");
      setLogoUrl(session.logo_url || "");
      setHasFinal(session.has_final || false);
    } else {
      setName("");
      setLogoUrl("");
      setLogoFile(null);
      setHasFinal(false);
      setFinalTeamCount(8);
    }
  }, [session, open]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erreur",
        description: "Seules les images sont acceptées",
        variant: "destructive"
      });
      return;
    }

    // Vérifier la taille (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erreur",
        description: "L'image ne doit pas dépasser 5MB",
        variant: "destructive"
      });
      return;
    }

    setLogoFile(file);
    // Créer une preview locale
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return logoUrl;

    setUploading(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('session-logos')
        .upload(filePath, logoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data } = supabase.storage
        .from('session-logos')
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
    if (!name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de la session est requis",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      // Upload du logo si un nouveau fichier a été sélectionné
      let finalLogoUrl = logoUrl;
      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          finalLogoUrl = uploadedUrl;
        }
      }

      const sessionData = {
        name: name.trim(),
        logo_url: finalLogoUrl || null,
        has_final: hasFinal,
      };

      if (session) {
        // Mise à jour
        const { error } = await supabase
          .from('game_sessions')
          .update(sessionData)
          .eq('id', session.id);

        if (error) throw error;

        toast({
          title: "Session mise à jour",
          description: `"${name}" a été mise à jour avec succès`
        });
      } else {
        // Création
        const { error } = await supabase
          .from('game_sessions')
          .insert([{
            ...sessionData,
            status: 'draft',
            selected_rounds: []
          }]);

        if (error) throw error;

        toast({
          title: "Session créée",
          description: `"${name}" a été créée avec succès`
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
            {session ? "Modifier la session" : "Nouvelle session"}
          </DialogTitle>
          <DialogDescription>
            {session 
              ? "Modifiez les informations de la session"
              : "Créez une nouvelle session de jeu"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la session *</Label>
            <Input
              id="name"
              placeholder="Ex: Soirée Quiz Musicale"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label>Mode Final</Label>
            <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
              <input
                type="checkbox"
                id="hasFinal"
                checked={hasFinal}
                onChange={(e) => setHasFinal(e.target.checked)}
                className="h-4 w-4"
                disabled={saving}
              />
              <div className="flex-1">
                <label htmlFor="hasFinal" className="font-medium cursor-pointer">
                  Activer le mode final
                </label>
                <p className="text-xs text-muted-foreground">
                  Une finale sera proposée avec les {finalTeamCount} meilleures équipes
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Logo de la session</Label>
            
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div className="flex-shrink-0">
                {logoUrl ? (
                  <div className="relative group">
                    <img 
                      src={logoUrl} 
                      alt="Logo preview" 
                      className="h-24 w-24 object-contain rounded border border-border bg-muted/30"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setLogoUrl("");
                        setLogoFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="h-24 w-24 rounded border-2 border-dashed border-border bg-muted/30 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Upload button */}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading || saving}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || saving}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Upload en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {logoUrl ? "Changer le logo" : "Choisir un logo"}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  PNG, JPG, SVG • Max 5MB
                </p>
              </div>
            </div>
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
              session ? "Mettre à jour" : "Créer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

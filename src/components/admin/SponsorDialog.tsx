import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

interface SponsorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sponsor?: any;
  sessionId: string;
  onSuccess: () => void;
}

export const SponsorDialog = ({ open, onOpenChange, sponsor, sessionId, onSuccess }: SponsorDialogProps) => {
  const { toast } = useToast();
  const [name, setName] = useState(sponsor?.name || "");
  const [logoUrl, setLogoUrl] = useState(sponsor?.logo_url || "");
  const [tier, setTier] = useState(sponsor?.tier || "medium");
  const [displayOrder, setDisplayOrder] = useState(sponsor?.display_order || 0);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${sessionId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('session-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('session-logos')
        .getPublicUrl(filePath);

      setLogoUrl(data.publicUrl);
      toast({ title: "✅ Logo uploadé" });
    } catch (error: any) {
      toast({ 
        title: "❌ Erreur upload", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name || !logoUrl) {
      toast({ 
        title: "❌ Champs requis", 
        description: "Nom et logo sont obligatoires",
        variant: "destructive" 
      });
      return;
    }

    try {
      if (sponsor) {
        await supabase
          .from('sponsors')
          .update({ name, logo_url: logoUrl, tier, display_order: displayOrder })
          .eq('id', sponsor.id);
      } else {
        await supabase
          .from('sponsors')
          .insert({ name, logo_url: logoUrl, tier, display_order: displayOrder, game_session_id: sessionId });
      }

      toast({ title: sponsor ? "✅ Sponsor modifié" : "✅ Sponsor ajouté" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ 
        title: "❌ Erreur", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{sponsor ? "Modifier" : "Ajouter"} un sponsor</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nom du sponsor</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom de l'entreprise"
            />
          </div>

          <div>
            <Label>Niveau</Label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="major">🏆 Majeur</SelectItem>
                <SelectItem value="medium">⭐ Moyen</SelectItem>
                <SelectItem value="minor">📌 Mineur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Ordre d'affichage</Label>
            <Input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
          </div>

          <div>
            <Label>Logo</Label>
            <div className="flex gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="flex-1"
              />
              <Button disabled={uploading} variant="outline">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            {logoUrl && (
              <img src={logoUrl} alt="Logo preview" className="mt-2 h-20 object-contain" />
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} className="flex-1">
              {sponsor ? "Modifier" : "Ajouter"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

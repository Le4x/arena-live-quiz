import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Smile } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: any | null;
  onSave: (teamData: any) => Promise<void>;
}

const TEAM_COLORS = [
  '#FFD700', '#3B82F6', '#A855F7', '#EF4444', '#10B981', '#F59E0B', 
  '#EC4899', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EAB308',
  '#14B8A6', '#6366F1', '#F43F5E', '#22D3EE', '#A3E635', '#FB923C',
  '#FBBF24', '#2DD4BF', '#818CF8', '#FB7185', '#67E8F9', '#BEF264',
  '#FCD34D', '#5EEAD4', '#A78BFA', '#FDA4AF', '#BAE6FD', '#D9F99D'
];

const TEAM_ICONS = [
  '🎸', '🎤', '🎹', '🥁', '🎺', '🎷', '🎻', '🎼', '🎵', '🎶',
  '🌟', '⭐', '✨', '💫', '🔥', '⚡', '💎', '👑', '🏆', '🎯',
  '🦁', '🐯', '🐻', '🐺', '🦅', '🦊', '🐉', '🦄', '🐼', '🦉',
  '🚀', '⚓', '🎪', '🎭', '🎨', '🎬', '📡', '🎲', '🎰', '🎮',
  '🍕', '🍔', '🍟', '🌮', '🍩', '🍪', '🧁', '🍿', '🍎', '🍌',
  '💚', '💙', '💜', '🧡', '❤️', '💛', '🤍', '🖤', '💖', '💗'
];

export const TeamDialog = ({ open, onOpenChange, team, onSave }: TeamDialogProps) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState(TEAM_COLORS[0]);
  const [icon, setIcon] = useState(TEAM_ICONS[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (team) {
      setName(team.name || "");
      setColor(team.color || TEAM_COLORS[0]);
      setIcon(team.avatar || TEAM_ICONS[0]);
    } else {
      setName("");
      setColor(TEAM_COLORS[0]);
      setIcon(TEAM_ICONS[0]);
    }
  }, [team, open]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onSave({ 
        name: name.trim(), 
        color,
        avatar: icon,
        ...(team && { id: team.id })
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {team ? "Modifier l'équipe" : "Nouvelle équipe"}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6 py-4 pr-4">
            {/* Prévisualisation */}
            <div className="flex items-center justify-center gap-4 p-6 border-2 rounded-lg bg-muted/30" style={{ borderColor: color }}>
              <div className="relative w-20 h-20 rounded-full border-4 border-background shadow-lg flex items-center justify-center text-4xl" style={{ backgroundColor: color }}>
                {icon}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Aperçu</p>
                <p className="text-2xl font-bold">{name || "Nom de l'équipe"}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-name">Nom de l'équipe</Label>
              <Input
                id="team-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Entrez le nom de l'équipe"
                maxLength={50}
              />
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Smile className="h-4 w-4" />
                Icône de l'équipe
              </Label>
              <div className="grid grid-cols-10 gap-2 p-4 border rounded-lg bg-muted/30 max-h-[200px] overflow-y-auto">
                {TEAM_ICONS.map((ic) => (
                  <button
                    key={ic}
                    className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 flex items-center justify-center text-2xl ${
                      icon === ic ? 'border-foreground scale-110 bg-accent' : 'border-transparent hover:bg-accent/50'
                    }`}
                    onClick={() => setIcon(ic)}
                    type="button"
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Couleur de l'équipe
              </Label>
              <div className="grid grid-cols-10 gap-2 p-4 border rounded-lg bg-muted/30">
                {TEAM_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-10 h-10 rounded-full border-4 transition-all hover:scale-110 ${
                      color === c ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                    type="button"
                  />
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !name.trim()}
          >
            {loading ? "Enregistrement..." : (team ? "Modifier" : "Créer")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

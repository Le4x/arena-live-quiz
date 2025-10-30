import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

interface SponsorCardProps {
  sponsor: any;
  onEdit: () => void;
  onDelete: () => void;
}

export const SponsorCard = ({ sponsor, onEdit, onDelete }: SponsorCardProps) => {
  const tierLabels = {
    major: "🏆 Majeur",
    medium: "⭐ Moyen",
    minor: "📌 Mineur"
  };

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-4">
        <img 
          src={sponsor.logo_url} 
          alt={sponsor.name} 
          className="h-16 w-16 object-contain rounded"
        />
        <div className="flex-1">
          <h3 className="font-bold text-lg">{sponsor.name}</h3>
          <p className="text-sm text-muted-foreground">
            {tierLabels[sponsor.tier as keyof typeof tierLabels]} • Ordre: {sponsor.display_order}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

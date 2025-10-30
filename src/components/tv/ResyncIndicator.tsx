/**
 * ResyncIndicator - Indicateur de re-synchronisation
 * Affiché pendant le chargement de l'état
 */

import { Loader2 } from "lucide-react";

export const ResyncIndicator = () => {
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <div className="text-2xl font-bold text-primary">
          Synchronisation en cours...
        </div>
        <div className="text-muted-foreground">
          Récupération de l'état du jeu
        </div>
      </div>
    </div>
  );
};

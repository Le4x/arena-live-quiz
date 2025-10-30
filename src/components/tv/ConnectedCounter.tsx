/**
 * ConnectedCounter - Compteur d'équipes connectées en temps réel
 * Affiché sur l'écran TV
 */

import { Users } from "lucide-react";
import { motion } from "framer-motion";

interface ConnectedCounterProps {
  count: number;
  total: number;
}

export const ConnectedCounter = ({ count, total }: ConnectedCounterProps) => {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-6 right-6 z-40"
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card/90 backdrop-blur-sm border border-primary/20 shadow-lg">
        <Users className="h-5 w-5 text-primary" />
        <div className="flex flex-col">
          <div className="text-sm font-bold text-foreground">
            {count} / {total} équipes
          </div>
          <div className="text-xs text-muted-foreground">
            {percentage}% connectées
          </div>
        </div>
        {/* Indicateur visuel */}
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      </div>
    </motion.div>
  );
};

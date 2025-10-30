/**
 * FirstBuzzHighlight - Animation overlay pour le premier buzz
 * Affiche le nom de l'équipe qui a buzzé en premier pendant 1-1.5s
 */

import { motion } from "framer-motion";

interface FirstBuzzHighlightProps {
  teamName?: string;
  teamColor?: string;
}

export const FirstBuzzHighlight = ({ teamName, teamColor }: FirstBuzzHighlightProps) => {
  if (!teamName) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-0 bg-black/80 grid place-items-center z-50"
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="px-12 py-8 rounded-3xl bg-white shadow-2xl"
        style={{ borderLeft: `8px solid ${teamColor || '#000'}` }}
      >
        <div className="text-6xl font-black text-center">
          ⚡ Premier buzz !
        </div>
        <div 
          className="text-5xl font-bold text-center mt-4"
          style={{ color: teamColor || '#000' }}
        >
          {teamName}
        </div>
      </motion.div>
    </motion.div>
  );
};

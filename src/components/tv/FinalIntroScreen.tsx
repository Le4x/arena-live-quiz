import { motion } from "framer-motion";
import { Trophy, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Final } from "@/types/game.types";

interface FinalIntroScreenProps {
  final: Final;
}

const themeConfig = {
  gold: {
    gradient: 'from-yellow-900/40 via-orange-900/40 to-red-900/40',
    particleColor: 'bg-yellow-400',
    titleGradient: 'from-yellow-200 via-yellow-400 to-orange-500',
    textColor: 'text-yellow-100',
    textSecondary: 'text-yellow-200/80',
    iconColor: 'text-yellow-400',
    shadowColor: 'rgba(250, 204, 21, 0.8)',
  },
  silver: {
    gradient: 'from-gray-800/40 via-gray-700/40 to-gray-900/40',
    particleColor: 'bg-gray-300',
    titleGradient: 'from-gray-200 via-gray-300 to-gray-400',
    textColor: 'text-gray-100',
    textSecondary: 'text-gray-300/80',
    iconColor: 'text-gray-300',
    shadowColor: 'rgba(209, 213, 219, 0.8)',
  },
  bronze: {
    gradient: 'from-orange-900/40 via-amber-900/40 to-orange-800/40',
    particleColor: 'bg-orange-600',
    titleGradient: 'from-orange-300 via-amber-400 to-orange-500',
    textColor: 'text-orange-100',
    textSecondary: 'text-orange-200/80',
    iconColor: 'text-orange-400',
    shadowColor: 'rgba(234, 88, 12, 0.8)',
  },
  purple: {
    gradient: 'from-purple-900/40 via-pink-900/40 to-purple-800/40',
    particleColor: 'bg-purple-400',
    titleGradient: 'from-purple-200 via-pink-300 to-purple-400',
    textColor: 'text-purple-100',
    textSecondary: 'text-purple-200/80',
    iconColor: 'text-purple-400',
    shadowColor: 'rgba(168, 85, 247, 0.8)',
  },
  blue: {
    gradient: 'from-blue-900/40 via-cyan-900/40 to-blue-800/40',
    particleColor: 'bg-blue-400',
    titleGradient: 'from-blue-200 via-cyan-300 to-blue-400',
    textColor: 'text-blue-100',
    textSecondary: 'text-blue-200/80',
    iconColor: 'text-blue-400',
    shadowColor: 'rgba(59, 130, 246, 0.8)',
  },
  red: {
    gradient: 'from-red-900/40 via-rose-900/40 to-red-800/40',
    particleColor: 'bg-red-400',
    titleGradient: 'from-red-200 via-rose-300 to-red-400',
    textColor: 'text-red-100',
    textSecondary: 'text-red-200/80',
    iconColor: 'text-red-400',
    shadowColor: 'rgba(239, 68, 68, 0.8)',
  },
  rainbow: {
    gradient: 'from-pink-900/40 via-purple-900/40 to-cyan-900/40',
    particleColor: 'bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400',
    titleGradient: 'from-pink-300 via-purple-300 to-cyan-300',
    textColor: 'text-pink-100',
    textSecondary: 'text-purple-200/80',
    iconColor: 'text-pink-400',
    shadowColor: 'rgba(236, 72, 153, 0.8)',
  },
};

export const FinalIntroScreen = ({ final }: FinalIntroScreenProps) => {
  const [teams, setTeams] = useState<any[]>([]);

  const theme = themeConfig[final.visual_theme || 'gold'];
  const finalistCount = final.finalist_count || final.finalist_teams?.length || 8;
  const finalName = final.name || 'LA FINALE';

  // Calculer le nombre de colonnes basé sur le nombre de finalistes
  const gridCols = finalistCount <= 4 ? 2 : finalistCount <= 8 ? 4 : finalistCount <= 12 ? 4 : 6;

  useEffect(() => {
    loadFinalists();
  }, [final]);

  const loadFinalists = async () => {
    if (!final?.finalist_teams || final.finalist_teams.length === 0) return;

    const { data } = await supabase
      .from('teams')
      .select('*, final_jokers!inner(quantity, joker_types(icon))')
      .in('id', final.finalist_teams)
      .eq('final_jokers.final_id', final.id)
      .order('score', { ascending: false });

    if (data) setTeams(data);
  };

  // Calculer le nombre total de jokers par équipe
  const getTotalJokers = (team: any) => {
    if (!team.final_jokers || team.final_jokers.length === 0) return 0;
    return team.final_jokers.reduce((sum: number, fj: any) => sum + (fj.quantity || 0), 0);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.gradient} relative overflow-hidden flex items-center justify-center p-8`}>
      {/* Particules animées */}
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute w-2 h-2 ${theme.particleColor} rounded-full`}
          initial={{
            x: Math.random() * window.innerWidth,
            y: window.innerHeight + 50,
            opacity: 0
          }}
          animate={{
            y: -50,
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      {/* Contenu principal */}
      <div className="relative z-10 max-w-7xl w-full">
        {/* Titre animé */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1, type: "spring" }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block mb-6"
          >
            <Trophy className={`w-32 h-32 ${theme.iconColor} drop-shadow-[0_0_30px_${theme.shadowColor}]`} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={`text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r ${theme.titleGradient} mb-4`}
            style={{
              textShadow: `0 0 60px ${theme.shadowColor}`,
            }}
          >
            {finalName.toUpperCase()}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className={`text-3xl ${theme.textColor} font-bold mb-2`}
          >
            🔥 LES {finalistCount} MEILLEURS S'AFFRONTENT 🔥
          </motion.p>

          {final.point_multiplier && final.point_multiplier !== 1 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
              className="text-2xl text-amber-400 font-bold mb-2"
            >
              ⚡ Points ×{final.point_multiplier} ⚡
            </motion.p>
          )}

          {final.first_correct_bonus && final.first_correct_bonus > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-xl text-green-400 font-semibold mb-2"
            >
              🎯 +{final.first_correct_bonus} pts bonus pour la 1ère bonne réponse
            </motion.p>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.7 }}
            className={`text-xl ${theme.textSecondary}`}
          >
            Que le meilleur gagne !
          </motion.p>
        </motion.div>

        {/* Liste des finalistes - Grille dynamique */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
          className={`grid gap-4`}
          style={{
            gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`
          }}
        >
          {teams.map((team, index) => {
            const totalJokers = getTotalJokers(team);

            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2 + index * 0.1 }}
                className="relative"
              >
                <div
                  className="bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-xl rounded-2xl p-4 border-2 transition-all hover:scale-105"
                  style={{
                    borderColor: team.color,
                    boxShadow: `0 0 20px ${team.color}40`,
                  }}
                >
                  {/* Rang */}
                  <div
                    className="absolute -top-3 -left-3 w-10 h-10 rounded-full flex items-center justify-center font-black text-lg border-2 border-white"
                    style={{ backgroundColor: team.color }}
                  >
                    #{index + 1}
                  </div>

                  {/* Nom de l'équipe */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0 ring-2 ring-white"
                      style={{ backgroundColor: team.color }}
                    />
                    <h3 className="font-bold text-lg text-white truncate flex-1">
                      {team.name}
                    </h3>
                  </div>

                  {/* Score */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Score</span>
                    <span className="text-2xl font-black text-white">
                      {team.score}
                    </span>
                  </div>

                  {/* Jokers */}
                  {totalJokers > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Jokers
                      </span>
                      <div className="flex gap-1">
                        {[...Array(Math.min(totalJokers, 10))].map((_, i) => (
                          <Zap key={i} className={`w-3 h-3 ${theme.iconColor}`} />
                        ))}
                        {totalJokers > 10 && (
                          <span className="text-xs text-muted-foreground ml-1">+{totalJokers - 10}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

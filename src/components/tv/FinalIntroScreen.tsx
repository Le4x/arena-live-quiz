import { motion } from "framer-motion";
import { Trophy, Zap, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FinalIntroScreenProps {
  final: any;
}

export const FinalIntroScreen = ({ final }: FinalIntroScreenProps) => {
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    loadFinalists();
  }, [final]);

  const loadFinalists = async () => {
    if (!final?.finalist_teams || final.finalist_teams.length === 0) return;

    const { data } = await supabase
      .from('teams')
      .select('*')
      .in('id', final.finalist_teams)
      .order('score', { ascending: false });

    if (data) setTeams(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-900/40 via-orange-900/40 to-red-900/40 relative overflow-hidden flex items-center justify-center p-8">
      {/* Particules d'or animées */}
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-yellow-400 rounded-full"
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
      <div className="relative z-10 max-w-6xl w-full">
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
            <Trophy className="w-32 h-32 text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-orange-500 mb-4"
            style={{
              textShadow: '0 0 60px rgba(250, 204, 21, 0.5)',
            }}
          >
            LA FINALE
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-3xl text-yellow-100 font-bold mb-2"
          >
            🔥 LES 8 MEILLEURS S'AFFRONTENT 🔥
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-xl text-yellow-200/80"
          >
            Que le meilleur gagne !
          </motion.p>
        </motion.div>

        {/* Liste des finalistes */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
          className="grid grid-cols-4 gap-4"
        >
          {teams.map((team, index) => (
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
                  boxShadow: `0 0 20px ${team.color}60`,
                }}
              >
                {/* Badge position */}
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-black font-black text-lg border-2 border-yellow-200">
                  {index === 0 ? <Crown className="w-5 h-5" /> : index + 1}
                </div>

                {/* Avatar coloré */}
                <div className="flex flex-col items-center gap-3">
                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.1 }}
                    className="w-16 h-16 rounded-full"
                    style={{
                      backgroundColor: team.color,
                      boxShadow: `0 0 30px ${team.color}80`,
                    }}
                  />

                  <div className="text-center">
                    <p className="font-black text-lg text-primary truncate max-w-[150px]">
                      {team.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {team.score} points
                    </p>
                  </div>

                  {/* Indicateur jokers */}
                  <div className="flex gap-1 mt-2">
                    {[...Array(4)].map((_, i) => (
                      <Zap key={i} className="w-3 h-3 text-yellow-500" />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Message final */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
          className="text-center mt-12"
        >
          <p className="text-2xl text-yellow-200 font-bold animate-pulse">
            ⚡ Les jokers sont activés ⚡
          </p>
        </motion.div>
      </div>
    </div>
  );
};

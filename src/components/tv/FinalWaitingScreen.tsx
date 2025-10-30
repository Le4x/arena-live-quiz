import { motion } from "framer-motion";
import { Trophy, Clock } from "lucide-react";

export const FinalWaitingScreen = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/40 via-pink-900/40 to-red-900/40 relative overflow-hidden flex items-center justify-center">
      {/* Cercles animés en arrière-plan */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2 border-yellow-400/20"
          style={{
            width: `${(i + 1) * 150}px`,
            height: `${(i + 1) * 150}px`,
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{
            duration: 3 + i,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Contenu */}
      <div className="relative z-10 text-center px-8">
        <motion.div
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
          className="mb-8 inline-block"
        >
          <Trophy className="w-40 h-40 text-yellow-400" 
                  style={{
                    filter: 'drop-shadow(0 0 40px rgba(250, 204, 21, 0.8))',
                  }} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-orange-500 mb-6"
          style={{
            textShadow: '0 0 60px rgba(250, 204, 21, 0.5)',
          }}
        >
          PRÉPARATION
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl text-yellow-100 font-bold mb-8"
        >
          🏆 DE LA FINALE 🏆
        </motion.p>

        <motion.div
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
          className="flex items-center justify-center gap-4 text-2xl text-yellow-200"
        >
          <Clock className="w-8 h-8" />
          <span className="font-semibold">
            La finale démarrera bientôt...
          </span>
          <Clock className="w-8 h-8" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
          className="mt-12 text-xl text-yellow-300/80"
        >
          Les 8 meilleures équipes sont en train d'être sélectionnées
        </motion.div>
      </div>
    </div>
  );
};

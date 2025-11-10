import { motion } from "framer-motion";
import { Clock, Sparkles } from "lucide-react";

export const WaitingNextQuestion = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/5 overflow-hidden">
      {/* Particules flottantes d'arrière-plan */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-primary/20"
            style={{
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, -200],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      {/* Cercles concentriques pulsants */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`circle-${i}`}
          className="absolute rounded-full border-4 border-primary/30"
          initial={{ width: 0, height: 0, opacity: 0 }}
          animate={{
            width: [0, 400, 800],
            height: [0, 400, 800],
            opacity: [0.5, 0.3, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 1,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Contenu principal */}
      <div className="relative z-10 text-center px-8">
        {/* Icône horloge animée */}
        <motion.div
          animate={{
            rotate: [0, 360],
            scale: [1, 1.2, 1],
          }}
          transition={{
            rotate: { duration: 3, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
          }}
          className="inline-block mb-8"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <Clock className="w-32 h-32 text-primary relative" strokeWidth={1.5} />
          </div>
        </motion.div>

        {/* Titre principal avec effet de brillance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <h1 className="text-7xl font-black mb-4 relative inline-block">
            <span
              className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent"
              style={{
                textShadow: '0 0 40px hsl(var(--primary) / 0.5)',
              }}
            >
              Prochaine Question
            </span>

            {/* Effet de brillance qui traverse le texte */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1,
              }}
            />
          </h1>
        </motion.div>

        {/* Sous-titre animé */}
        <motion.p
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="text-3xl text-muted-foreground font-semibold flex items-center justify-center gap-3"
        >
          <Sparkles className="w-8 h-8 text-accent" />
          Préparez-vous...
          <Sparkles className="w-8 h-8 text-accent" />
        </motion.p>

        {/* Points de chargement animés */}
        <div className="flex justify-center gap-3 mt-12">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-4 h-4 rounded-full bg-primary"
              animate={{
                y: [0, -20, 0],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>

        {/* Barre de progression subtile */}
        <div className="mt-16 w-96 mx-auto">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary via-secondary to-accent"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
        </div>
      </div>

      {/* Rayons de lumière depuis le centre */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`ray-${i}`}
          className="absolute top-1/2 left-1/2 w-1 origin-left"
          style={{
            height: '200vh',
            background: `linear-gradient(to bottom, transparent, hsl(var(--primary) / 0.1), transparent)`,
            transform: `rotate(${i * 45}deg)`,
          }}
          animate={{
            opacity: [0, 0.5, 0],
            scaleY: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

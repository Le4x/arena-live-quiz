import { motion, AnimatePresence } from "framer-motion";
import { Users, Wifi } from "lucide-react";

interface Team {
  id: string;
  name: string;
  color: string;
}

interface TeamConnectionScreenProps {
  connectedTeams: Team[];
}

export const TeamConnectionScreen = ({ connectedTeams }: TeamConnectionScreenProps) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-background via-background/95 to-primary/20">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Pulsing circles */}
        <motion.div 
          className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[80px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-1/3 right-1/3 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[80px]"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />

        {/* Floating particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/40 rounded-full"
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: window.innerHeight + 50
            }}
            animate={{
              y: -50,
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* Logo animé en haut */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 pt-6 pb-4 flex justify-center"
      >
        <motion.div
          animate={{ 
            y: [0, -8, 0],
            rotate: [0, 1, 0, -1, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <img 
            src="/music-arena-logo.png" 
            alt="Music Arena" 
            className="h-20 md:h-24 w-auto drop-shadow-[0_0_30px_rgba(255,107,0,0.4)]"
          />
        </motion.div>
      </motion.div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 flex-1 flex flex-col overflow-hidden space-y-6">
        {/* Title section - plus compact */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-4"
        >
          <motion.h1 
            className="text-4xl md:text-6xl font-bold bg-gradient-arena bg-clip-text text-transparent drop-shadow-glow"
            animate={{ 
              scale: [1, 1.02, 1]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            Préparez-vous au jeu
          </motion.h1>
          
          <motion.div
            className="flex items-center justify-center gap-3 text-xl md:text-2xl text-primary font-bold"
            animate={{
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Wifi className="w-6 h-6" />
            <span>Connexion en cours...</span>
          </motion.div>
        </motion.div>

        {/* Teams counter - plus compact */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex justify-center"
        >
          <div className="inline-flex items-center gap-3 bg-card/90 backdrop-blur-xl border-2 border-primary/50 rounded-2xl px-8 py-4 shadow-glow-gold">
            <Users className="w-8 h-8 text-primary" />
            <div className="text-left">
              <div className="text-3xl font-bold bg-gradient-arena bg-clip-text text-transparent">
                {connectedTeams.length}
              </div>
              <div className="text-sm text-muted-foreground">
                {connectedTeams.length === 0 ? "équipe" : connectedTeams.length === 1 ? "équipe connectée" : "équipes connectées"}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Teams list - optimisé pour 30+ équipes */}
        {connectedTeams.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex-1 bg-card/80 backdrop-blur-xl border-2 border-primary/30 rounded-2xl p-4 md:p-6 shadow-elegant overflow-hidden flex flex-col"
          >
            <h2 className="text-xl md:text-2xl font-bold text-center mb-4 text-primary flex-shrink-0">
              Équipes prêtes
            </h2>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                <AnimatePresence mode="popLayout">
                  {connectedTeams.map((team, index) => (
                    <motion.div
                      key={team.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ 
                        duration: 0.3,
                        delay: index * 0.03
                      }}
                      className="relative group"
                    >
                      <motion.div
                        className="absolute inset-0 rounded-xl blur-lg opacity-40"
                        style={{ backgroundColor: team.color }}
                        animate={{
                          opacity: [0.2, 0.4, 0.2]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: index * 0.1
                        }}
                      />
                      <div 
                        className="relative flex items-center gap-2 p-3 rounded-xl border backdrop-blur-sm transition-all duration-300 group-hover:scale-105"
                        style={{ 
                          borderColor: team.color,
                          backgroundColor: `${team.color}10`
                        }}
                      >
                        <motion.div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: team.color }}
                          animate={{
                            scale: [1, 1.3, 1],
                            boxShadow: [
                              `0 0 0px ${team.color}`,
                              `0 0 15px ${team.color}`,
                              `0 0 0px ${team.color}`
                            ]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: index * 0.08
                          }}
                        />
                        <span className="text-sm font-bold text-foreground truncate">
                          {team.name}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {/* No teams message */}
        {connectedTeams.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="flex-1 flex items-center justify-center"
          >
            <motion.p 
              className="text-xl md:text-2xl text-muted-foreground"
              animate={{
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              En attente des équipes...
            </motion.p>
          </motion.div>
        )}
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 107, 0, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 107, 0, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 107, 0, 0.7);
        }
      `}</style>
    </div>
  );
};

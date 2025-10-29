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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-primary/20">
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

      {/* Main content */}
      <div className="relative z-10 w-full max-w-5xl px-8 space-y-12">
        {/* Title section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-6"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 2, 0, -2, 0]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <h1 className="text-6xl md:text-8xl font-bold bg-gradient-arena bg-clip-text text-transparent drop-shadow-glow">
              Préparez-vous au jeu
            </h1>
          </motion.div>
          
          <motion.div
            className="flex items-center justify-center gap-4 text-3xl md:text-4xl text-primary font-bold"
            animate={{
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Wifi className="w-10 h-10" />
            <span>Connexion en cours...</span>
          </motion.div>
        </motion.div>

        {/* Teams counter */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-4 bg-card/90 backdrop-blur-xl border-2 border-primary/50 rounded-3xl px-12 py-6 shadow-glow-gold">
            <Users className="w-12 h-12 text-primary" />
            <div className="text-left">
              <div className="text-5xl font-bold bg-gradient-arena bg-clip-text text-transparent">
                {connectedTeams.length}
              </div>
              <div className="text-xl text-muted-foreground">
                {connectedTeams.length === 0 ? "équipe" : connectedTeams.length === 1 ? "équipe connectée" : "équipes connectées"}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Teams list */}
        {connectedTeams.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="bg-card/80 backdrop-blur-xl border-2 border-primary/30 rounded-3xl p-8 shadow-elegant"
          >
            <h2 className="text-3xl font-bold text-center mb-6 text-primary">
              Équipes prêtes
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {connectedTeams.map((team, index) => (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    transition={{ 
                      duration: 0.4,
                      delay: index * 0.05
                    }}
                    className="relative group"
                  >
                    <motion.div
                      className="absolute inset-0 rounded-2xl blur-xl opacity-50"
                      style={{ backgroundColor: team.color }}
                      animate={{
                        opacity: [0.3, 0.6, 0.3]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: index * 0.2
                      }}
                    />
                    <div 
                      className="relative flex items-center gap-3 p-4 rounded-2xl border-2 backdrop-blur-sm transition-all duration-300 group-hover:scale-105"
                      style={{ 
                        borderColor: team.color,
                        backgroundColor: `${team.color}15`
                      }}
                    >
                      <motion.div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: team.color }}
                        animate={{
                          scale: [1, 1.2, 1],
                          boxShadow: [
                            `0 0 0px ${team.color}`,
                            `0 0 20px ${team.color}`,
                            `0 0 0px ${team.color}`
                          ]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: index * 0.1
                        }}
                      />
                      <span className="text-lg font-bold text-foreground truncate">
                        {team.name}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* No teams message */}
        {connectedTeams.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="text-center"
          >
            <motion.p 
              className="text-2xl text-muted-foreground"
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
    </div>
  );
};

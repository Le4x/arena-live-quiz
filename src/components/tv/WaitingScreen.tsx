/**
 * WaitingScreen - Écran d'attente premium avec animations avancées
 */

import { motion } from 'framer-motion';
import { Users, Wifi, Sparkles, Zap } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  color: string;
}

interface WaitingScreenProps {
  sessionName?: string;
  connectedTeams: Team[];
}

export const WaitingScreen = ({ sessionName, connectedTeams }: WaitingScreenProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
         style={{
           background: 'radial-gradient(ellipse at center, hsl(var(--background)) 0%, hsl(var(--primary) / 0.05) 50%, hsl(var(--background)) 100%)'
         }}>
      
      {/* Animated gradient waves */}
      <motion.div 
        className="absolute inset-0"
        animate={{
          background: [
            'radial-gradient(circle at 30% 40%, hsl(var(--primary) / 0.15) 0%, transparent 50%)',
            'radial-gradient(circle at 70% 60%, hsl(var(--secondary) / 0.15) 0%, transparent 50%)',
            'radial-gradient(circle at 40% 70%, hsl(var(--accent) / 0.15) 0%, transparent 50%)',
            'radial-gradient(circle at 30% 40%, hsl(var(--primary) / 0.15) 0%, transparent 50%)',
          ]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Premium light rays */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`ray-${i}`}
          className="absolute top-1/2 left-1/2 w-1 origin-left opacity-20"
          style={{
            height: '200vh',
            background: `linear-gradient(to bottom, transparent, hsl(var(--primary) / 0.1), transparent)`,
            transform: `rotate(${i * 30}deg)`,
          }}
          animate={{ 
            opacity: [0.1, 0.3, 0.1],
            scaleY: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Enhanced animated particles with depth */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(60)].map((_, i) => {
          const size = Math.random() * 6 + 2;
          const duration = Math.random() * 8 + 8;
          const delay = Math.random() * 5;
          
          return (
            <motion.div
              key={`particle-${i}`}
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                background: i % 3 === 0 
                  ? 'hsl(var(--primary) / 0.4)' 
                  : i % 3 === 1 
                  ? 'hsl(var(--secondary) / 0.4)'
                  : 'hsl(var(--accent) / 0.4)',
                boxShadow: `0 0 ${size * 4}px currentColor`,
                left: `${Math.random() * 100}%`,
              }}
              initial={{ 
                y: -20,
                opacity: 0,
                scale: 0,
              }}
              animate={{
                y: window.innerHeight + 50,
                opacity: [0, 1, 1, 0],
                scale: [0, 1, 1, 0],
                x: [0, Math.sin(i) * 100, 0],
              }}
              transition={{
                duration: duration,
                repeat: Infinity,
                ease: "linear",
                delay: delay,
              }}
            />
          );
        })}
      </div>

      {/* Floating orbs */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full blur-3xl"
          style={{
            width: 200 + Math.random() * 200,
            height: 200 + Math.random() * 200,
            background: i % 2 === 0 
              ? 'hsl(var(--primary) / 0.1)'
              : 'hsl(var(--secondary) / 0.1)',
            left: `${20 + i * 15}%`,
            top: `${30 + i * 10}%`,
          }}
          animate={{
            y: [0, -50, 0],
            x: [0, 30, 0],
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 8 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        />
      ))}

      {/* Main content */}
      <div className="relative z-10 text-center space-y-12 px-8 w-full max-w-7xl">
        {/* Premium logo with 3D effects */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotateY: -45 }}
          animate={{ 
            scale: 1, 
            opacity: 1,
            rotateY: 0,
          }}
          transition={{ 
            duration: 1.2,
            type: "spring",
            stiffness: 100,
          }}
          style={{ perspective: 1000 }}
          className="relative"
        >
          {/* Glow background */}
          <motion.div 
            className="absolute inset-0 blur-3xl opacity-50"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{
              background: 'radial-gradient(ellipse, hsl(var(--primary) / 0.5), transparent)',
            }}
          />
          
          <motion.h1 
            className="relative text-9xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--accent)))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 30px hsl(var(--primary) / 0.5))',
            }}
            animate={{
              filter: [
                'drop-shadow(0 0 30px hsl(var(--primary) / 0.5))',
                'drop-shadow(0 0 50px hsl(var(--primary) / 0.7))',
                'drop-shadow(0 0 30px hsl(var(--primary) / 0.5))',
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {sessionName || 'ARENA'}
          </motion.h1>

          {/* Decorative sparkles */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              className="absolute"
              style={{
                left: `${10 + i * 12}%`,
                top: i % 2 === 0 ? '-20px' : '100%',
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            >
              <Sparkles className="w-6 h-6 text-primary" />
            </motion.div>
          ))}
        </motion.div>

        {/* Subtitle with animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="relative"
        >
          <motion.p 
            className="text-4xl font-bold text-foreground/80"
            animate={{
              opacity: [0.7, 1, 0.7],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            En attente du début de la partie...
          </motion.p>
          
          {/* Animated underline */}
          <motion.div
            className="mx-auto mt-4 h-1 rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)',
              width: '300px',
            }}
            animate={{
              opacity: [0.3, 0.8, 0.3],
              scaleX: [0.8, 1, 0.8],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>

        {/* Connected teams section */}
        {connectedTeams.length > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="space-y-8"
          >
            {/* Header with pulsing icon */}
            <div className="flex items-center justify-center gap-4">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Wifi className="w-10 h-10 text-primary" />
              </motion.div>
              <h2 className="text-4xl font-black bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                {connectedTeams.length} équipe{connectedTeams.length > 1 ? 's' : ''} connectée{connectedTeams.length > 1 ? 's' : ''}
              </h2>
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, -5, 5, 0],
                }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              >
                <Zap className="w-10 h-10 text-accent" />
              </motion.div>
            </div>

            {/* Teams grid with staggered animation */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-h-[450px] overflow-y-auto px-4 py-4">
              {connectedTeams.map((team, index) => (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, scale: 0.5, rotateY: -90 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  transition={{ 
                    delay: 1 + index * 0.1, 
                    duration: 0.5,
                    type: "spring",
                    stiffness: 200,
                  }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="relative bg-card/80 backdrop-blur-xl rounded-2xl p-6 border-2 shadow-lg"
                  style={{ 
                    borderColor: team.color,
                    boxShadow: `0 0 20px ${team.color}40`,
                  }}
                >
                  {/* Shine effect */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl opacity-0"
                    style={{
                      background: `linear-gradient(135deg, transparent, ${team.color}20, transparent)`,
                    }}
                    animate={{
                      opacity: [0, 0.5, 0],
                      x: ['-100%', '100%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: index * 0.2,
                    }}
                  />

                  <div className="relative flex flex-col items-center gap-3">
                    <motion.div 
                      className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black"
                      style={{ backgroundColor: team.color }}
                      animate={{
                        scale: [1, 1.1, 1],
                        boxShadow: [
                          `0 0 0px ${team.color}`,
                          `0 0 20px ${team.color}`,
                          `0 0 0px ${team.color}`,
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {team.name.charAt(0).toUpperCase()}
                    </motion.div>
                    
                    <div className="text-center">
                      <p className="font-bold text-xl truncate max-w-[150px]" title={team.name}>
                        {team.name}
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <motion.div 
                          className="w-2 h-2 bg-green-500 rounded-full"
                          animate={{
                            opacity: [1, 0.3, 1],
                            scale: [1, 1.5, 1],
                          }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <span className="text-sm text-green-500 font-semibold">
                          Connecté
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Message if no teams */}
        {connectedTeams.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="relative"
          >
            <motion.div
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-3xl text-muted-foreground font-light"
            >
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              Aucune équipe connectée pour le moment
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Bottom ambient glow */}
      <div className="absolute bottom-0 left-0 right-0 h-96 pointer-events-none"
           style={{
             background: 'linear-gradient(to top, hsl(var(--primary) / 0.15), transparent)',
           }} />
    </div>
  );
};
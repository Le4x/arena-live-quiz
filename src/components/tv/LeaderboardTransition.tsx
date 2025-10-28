/**
 * LeaderboardTransition - Transition animée vers le classement
 * Style émission TV avec slide-in élégant
 */

import { motion } from 'framer-motion';
import { Trophy, Medal, Award } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  score: number;
  color: string;
}

interface LeaderboardTransitionProps {
  teams: Team[];
  topCount?: number;
}

export const LeaderboardTransition = ({ teams, topCount = 10 }: LeaderboardTransitionProps) => {
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score).slice(0, topCount);

  const getPodiumIcon = (position: number) => {
    switch (position) {
      case 0:
        return <Trophy className="w-12 h-12 text-yellow-400" />;
      case 1:
        return <Medal className="w-10 h-10 text-gray-300" />;
      case 2:
        return <Award className="w-10 h-10 text-orange-400" />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-gradient-to-br from-background via-background/95 to-primary/10 overflow-hidden"
    >
      {/* Background animated gradient */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20"
          animate={{
            background: [
              'linear-gradient(45deg, var(--primary) 0%, var(--secondary) 50%, var(--accent) 100%)',
              'linear-gradient(90deg, var(--secondary) 0%, var(--accent) 50%, var(--primary) 100%)',
              'linear-gradient(135deg, var(--accent) 0%, var(--primary) 50%, var(--secondary) 100%)',
            ],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ opacity: 0.1 }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-8 py-16 h-full flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="text-center mb-16"
        >
          <Trophy className="w-32 h-32 mx-auto text-primary animate-pulse-glow mb-8" />
          <h1 className="text-8xl font-black bg-gradient-arena bg-clip-text text-transparent">
            CLASSEMENT
          </h1>
        </motion.div>

        {/* Leaderboard */}
        <div className="flex-1 max-w-5xl mx-auto w-full space-y-4">
          {sortedTeams.map((team, index) => (
            <motion.div
              key={team.id}
              initial={{ x: -1000, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 80,
                damping: 15,
                delay: index * 0.1,
              }}
              className={`relative flex items-center gap-6 p-6 rounded-2xl backdrop-blur-sm ${
                index < 3 
                  ? 'bg-gradient-to-r from-primary/20 to-secondary/20 border-2 border-primary/50' 
                  : 'bg-card/60 border border-border'
              }`}
            >
              {/* Rank */}
              <div className="flex items-center justify-center w-20 h-20">
                {index < 3 ? (
                  getPodiumIcon(index)
                ) : (
                  <span className="text-5xl font-black text-muted-foreground">
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Team color */}
              <div 
                className="w-8 h-20 rounded-lg"
                style={{ backgroundColor: team.color }}
              />

              {/* Team name */}
              <div className="flex-1">
                <h3 className={`text-4xl font-bold ${
                  index < 3 ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {team.name}
                </h3>
              </div>

              {/* Score */}
              <motion.div 
                className="text-right"
                animate={{ 
                  scale: index < 3 ? [1, 1.1, 1] : 1 
                }}
                transition={{ 
                  duration: 1,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
              >
                <div className={`text-6xl font-black ${
                  index === 0 ? 'text-primary' :
                  index === 1 ? 'text-secondary' :
                  index === 2 ? 'text-accent' :
                  'text-muted-foreground'
                }`}>
                  {team.score}
                </div>
                <div className="text-2xl text-muted-foreground">points</div>
              </motion.div>

              {/* Shine effect for podium */}
              {index < 3 && (
                <motion.div
                  className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatDelay: 2,
                    ease: "easeInOut",
                  }}
                />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

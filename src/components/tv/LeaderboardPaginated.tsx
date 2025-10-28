/**
 * LeaderboardPaginated - Classement paginé pour 30+ équipes
 * Auto-rotation avec animations fluides
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Award } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  score: number;
  color: string;
}

interface LeaderboardPaginatedProps {
  teams: Team[];
  itemsPerPage?: number;
  rotationInterval?: number;
}

export const LeaderboardPaginated = ({ 
  teams, 
  itemsPerPage = 15, 
  rotationInterval = 6000 
}: LeaderboardPaginatedProps) => {
  const [currentPage, setCurrentPage] = useState(0);
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const totalPages = Math.ceil(sortedTeams.length / itemsPerPage);

  useEffect(() => {
    if (totalPages <= 1) return;

    const interval = setInterval(() => {
      setCurrentPage(prev => (prev + 1) % totalPages);
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [totalPages, rotationInterval]);

  const startIdx = currentPage * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const currentTeams = sortedTeams.slice(startIdx, endIdx);

  const getPodiumIcon = (index: number) => {
    const globalIndex = startIdx + index;
    if (globalIndex === 0) return <Trophy className="w-8 h-8 text-yellow-400" />;
    if (globalIndex === 1) return <Medal className="w-7 h-7 text-gray-400" />;
    if (globalIndex === 2) return <Award className="w-7 h-7 text-amber-600" />;
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-8">
      <div className="w-full max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-4 mb-4">
            <Trophy className="w-16 h-16 text-primary" />
            <h1 className="text-6xl font-black bg-gradient-arena bg-clip-text text-transparent">
              CLASSEMENT
            </h1>
            <Trophy className="w-16 h-16 text-primary" />
          </div>
          {totalPages > 1 && (
            <p className="text-2xl text-muted-foreground">
              Page {currentPage + 1} / {totalPages}
            </p>
          )}
        </motion.div>

        {/* Teams grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-3 gap-4"
          >
            {currentTeams.map((team, index) => {
              const globalRank = startIdx + index + 1;
              const isTopThree = globalRank <= 3;

              return (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                    relative bg-card/90 backdrop-blur-xl rounded-2xl p-6 border-2
                    ${isTopThree ? 'border-primary shadow-glow-gold' : 'border-muted'}
                  `}
                >
                  {/* Rank */}
                  <div className="absolute -top-3 -left-3 w-12 h-12 rounded-full bg-primary flex items-center justify-center font-black text-xl text-primary-foreground">
                    {globalRank}
                  </div>

                  {/* Content */}
                  <div className="flex items-center gap-4">
                    {/* Podium icon */}
                    {getPodiumIcon(index) && (
                      <div className="flex-shrink-0">
                        {getPodiumIcon(index)}
                      </div>
                    )}

                    {/* Team color */}
                    <div
                      className="w-10 h-10 rounded-full flex-shrink-0"
                      style={{ backgroundColor: team.color }}
                    />

                    {/* Team info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate" title={team.name}>
                        {team.name}
                      </h3>
                      <p className={`text-3xl font-black ${isTopThree ? 'text-primary' : 'text-foreground'}`}>
                        {team.score} pts
                      </p>
                    </div>
                  </div>

                  {/* Shine effect for top 3 */}
                  {isTopThree && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      animate={{
                        x: ['-100%', '100%'],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 1,
                      }}
                    />
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Pagination dots */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {[...Array(totalPages)].map((_, i) => (
              <motion.div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i === currentPage ? 'bg-primary' : 'bg-muted'
                }`}
                animate={{
                  scale: i === currentPage ? 1.2 : 1,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
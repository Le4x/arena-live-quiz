import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Zap, Crown, Star, Flame } from "lucide-react";
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
  const [introPhase, setIntroPhase] = useState<'title' | 'countdown' | 'reveal' | 'all'>('title');
  const [currentRevealIndex, setCurrentRevealIndex] = useState(-1);
  const [showSpotlight, setShowSpotlight] = useState(false);

  const theme = themeConfig[final.visual_theme || 'gold'];
  const finalistCount = final.finalist_count || final.finalist_teams?.length || 8;
  const finalName = final.name || 'LA FINALE';

  // Calculer le nombre de colonnes basé sur le nombre de finalistes
  const gridCols = finalistCount <= 2 ? 2 : finalistCount <= 4 ? 2 : finalistCount <= 8 ? 4 : finalistCount <= 12 ? 4 : 6;

  useEffect(() => {
    loadFinalists();
  }, [final]);

  // Animation séquentielle spectaculaire
  useEffect(() => {
    if (teams.length === 0) return;

    const introDuration = final.intro_duration || 10;
    const revealDelay = Math.max(800, (introDuration * 1000 - 4000) / teams.length);

    // Phase 1: Titre (2s)
    const timer1 = setTimeout(() => setIntroPhase('countdown'), 2000);

    // Phase 2: Countdown (1s)
    const timer2 = setTimeout(() => {
      setIntroPhase('reveal');
      setShowSpotlight(true);
    }, 3000);

    // Phase 3: Révélation séquentielle des équipes
    const revealTimers: NodeJS.Timeout[] = [];
    teams.forEach((_, index) => {
      const timer = setTimeout(() => {
        setCurrentRevealIndex(index);
      }, 3500 + index * revealDelay);
      revealTimers.push(timer);
    });

    // Phase 4: Afficher tout
    const timer3 = setTimeout(() => {
      setIntroPhase('all');
      setShowSpotlight(false);
    }, 3500 + teams.length * revealDelay + 1000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      revealTimers.forEach(t => clearTimeout(t));
    };
  }, [teams, final.intro_duration]);

  const loadFinalists = async () => {
    if (!final?.finalist_teams || final.finalist_teams.length === 0) return;

    // Charger les équipes
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .in('id', final.finalist_teams)
      .order('score', { ascending: false });

    if (!teamsData) return;

    // Charger les jokers séparément
    const { data: jokersData } = await supabase
      .from('final_jokers')
      .select('team_id, quantity, joker_type_id')
      .eq('final_id', final.id);

    // Combiner les données
    const teamsWithJokers = teamsData.map(team => ({
      ...team,
      total_jokers: jokersData
        ? jokersData
            .filter(j => j.team_id === team.id)
            .reduce((sum, j) => sum + (j.quantity || 0), 0)
        : 0
    }));

    setTeams(teamsWithJokers);
  };

  // Calculer le nombre total de jokers par équipe
  const getTotalJokers = (team: any) => {
    return team.total_jokers || 0;
  };

  // Rendu pour le mode duel (2 équipes)
  const renderDuelMode = () => {
    if (teams.length !== 2) return null;

    return (
      <div className="flex items-center justify-center gap-8 w-full max-w-6xl">
        {teams.map((team, index) => (
          <motion.div
            key={team.id}
            className="flex-1 max-w-lg"
            initial={{ x: index === 0 ? -200 : 200, opacity: 0 }}
            animate={{
              x: 0,
              opacity: currentRevealIndex >= index || introPhase === 'all' ? 1 : 0.2
            }}
            transition={{ delay: 0.5, type: "spring", damping: 20 }}
          >
            <motion.div
              className={`relative p-8 rounded-3xl border-4 ${
                currentRevealIndex === index && showSpotlight
                  ? 'scale-110 z-10'
                  : ''
              }`}
              style={{
                borderColor: team.color,
                backgroundColor: `${team.color}20`,
                boxShadow: currentRevealIndex === index && showSpotlight
                  ? `0 0 60px ${team.color}, 0 0 120px ${team.color}50`
                  : `0 0 30px ${team.color}40`
              }}
              animate={currentRevealIndex === index && showSpotlight ? {
                scale: [1, 1.05, 1],
              } : {}}
              transition={{ duration: 0.5, repeat: currentRevealIndex === index ? Infinity : 0 }}
            >
              {/* Couronne pour le 1er */}
              {index === 0 && (
                <motion.div
                  className="absolute -top-8 left-1/2 -translate-x-1/2"
                  animate={{ y: [0, -5, 0], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Crown className="w-16 h-16 text-yellow-400" />
                </motion.div>
              )}

              {/* VS au milieu */}
              {index === 0 && (
                <motion.div
                  className="absolute -right-16 top-1/2 -translate-y-1/2 z-20"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1, type: "spring" }}
                >
                  <div className="bg-red-600 rounded-full w-20 h-20 flex items-center justify-center">
                    <span className="text-3xl font-black text-white">VS</span>
                  </div>
                </motion.div>
              )}

              <div className="text-center">
                <div
                  className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white"
                  style={{ backgroundColor: team.color }}
                />
                <h2 className="text-4xl font-black text-white mb-2">{team.name}</h2>
                <div className="text-6xl font-black" style={{ color: team.color }}>
                  {team.score}
                </div>
                <div className="text-gray-400 text-lg">points</div>

                {getTotalJokers(team) > 0 && (
                  <div className="mt-4 flex justify-center gap-2">
                    {[...Array(Math.min(getTotalJokers(team), 5))].map((_, i) => (
                      <Zap key={i} className="w-6 h-6 text-yellow-400" />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.gradient} relative overflow-hidden flex items-center justify-center p-8`}>
      {/* Particules animées */}
      {[...Array(50)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute w-2 h-2 ${theme.particleColor} rounded-full`}
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
            y: (typeof window !== 'undefined' ? window.innerHeight : 1080) + 50,
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

      {/* Spotlight effect pendant la révélation */}
      {showSpotlight && currentRevealIndex >= 0 && currentRevealIndex < teams.length && (
        <motion.div
          className="absolute inset-0 z-0"
          style={{
            background: `radial-gradient(circle at 50% 60%, ${teams[currentRevealIndex]?.color}40 0%, transparent 50%)`
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}

      {/* Contenu principal */}
      <div className="relative z-10 max-w-7xl w-full">

        {/* Phase 1: Titre */}
        <AnimatePresence>
          {(introPhase === 'title' || introPhase === 'countdown') && (
            <motion.div
              className="text-center"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -100 }}
              transition={{ duration: 0.5, type: "spring" }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{ duration: 1, repeat: Infinity }}
                className="inline-block mb-6"
              >
                <Trophy className={`w-40 h-40 ${theme.iconColor}`} style={{ filter: `drop-shadow(0 0 40px ${theme.shadowColor})` }} />
              </motion.div>

              <motion.h1
                className={`text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r ${theme.titleGradient} mb-4`}
                style={{ textShadow: `0 0 80px ${theme.shadowColor}` }}
              >
                {finalName.toUpperCase()}
              </motion.h1>

              {introPhase === 'countdown' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.5 }}
                  className={`text-8xl font-black ${theme.textColor}`}
                >
                  🔥 C'EST PARTI ! 🔥
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 2-3: Révélation des équipes */}
        {(introPhase === 'reveal' || introPhase === 'all') && (
          <>
            {/* Titre compact */}
            <motion.div
              className="text-center mb-8"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-center gap-4 mb-2">
                <Flame className={`w-10 h-10 ${theme.iconColor}`} />
                <h1 className={`text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r ${theme.titleGradient}`}>
                  {finalName.toUpperCase()}
                </h1>
                <Flame className={`w-10 h-10 ${theme.iconColor}`} />
              </div>
              <p className={`text-2xl ${theme.textColor} font-bold`}>
                {finalistCount === 2 ? '⚔️ DUEL FINAL ⚔️' : `🏆 LES ${finalistCount} FINALISTES 🏆`}
              </p>
              {final.point_multiplier && final.point_multiplier !== 1 && (
                <p className="text-xl text-amber-400 font-bold mt-2">⚡ Points ×{final.point_multiplier}</p>
              )}
            </motion.div>

            {/* Mode duel spécial pour 2 équipes */}
            {finalistCount === 2 ? renderDuelMode() : (
              /* Grille standard pour plus de 2 équipes */
              <motion.div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
              >
                {teams.map((team, index) => {
                  const totalJokers = getTotalJokers(team);
                  const isRevealed = currentRevealIndex >= index || introPhase === 'all';
                  const isCurrentSpotlight = currentRevealIndex === index && showSpotlight;

                  return (
                    <motion.div
                      key={team.id}
                      initial={{ opacity: 0, scale: 0, rotateY: 180 }}
                      animate={{
                        opacity: isRevealed ? 1 : 0.1,
                        scale: isCurrentSpotlight ? 1.1 : (isRevealed ? 1 : 0.8),
                        rotateY: isRevealed ? 0 : 180
                      }}
                      transition={{
                        duration: 0.5,
                        type: "spring",
                        damping: 15
                      }}
                      className={`relative ${isCurrentSpotlight ? 'z-10' : ''}`}
                    >
                      <div
                        className="bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-xl rounded-2xl p-4 border-2 transition-all"
                        style={{
                          borderColor: team.color,
                          boxShadow: isCurrentSpotlight
                            ? `0 0 40px ${team.color}, 0 0 80px ${team.color}50`
                            : `0 0 20px ${team.color}40`,
                        }}
                      >
                        {/* Badge rang animé */}
                        <motion.div
                          className="absolute -top-3 -left-3 w-12 h-12 rounded-full flex items-center justify-center font-black text-xl border-2 border-white"
                          style={{ backgroundColor: team.color }}
                          animate={isCurrentSpotlight ? {
                            scale: [1, 1.2, 1],
                            rotate: [0, 10, -10, 0]
                          } : {}}
                          transition={{ duration: 0.5, repeat: isCurrentSpotlight ? Infinity : 0 }}
                        >
                          {index === 0 ? <Crown className="w-6 h-6" /> : `#${index + 1}`}
                        </motion.div>

                        {/* Étoiles pour le spotlight */}
                        {isCurrentSpotlight && (
                          <>
                            <motion.div
                              className="absolute -top-2 -right-2"
                              animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                            </motion.div>
                            <motion.div
                              className="absolute -bottom-2 -right-2"
                              animate={{ rotate: -360, scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                            >
                              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                            </motion.div>
                          </>
                        )}

                        {/* Nom de l'équipe */}
                        <div className="flex items-center gap-3 mb-3 mt-2">
                          <div
                            className="w-8 h-8 rounded-full flex-shrink-0 ring-2 ring-white"
                            style={{ backgroundColor: team.color }}
                          />
                          <h3 className="font-bold text-xl text-white truncate flex-1">
                            {team.name}
                          </h3>
                        </div>

                        {/* Score avec animation */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Score</span>
                          <motion.span
                            className="text-3xl font-black text-white"
                            animate={isCurrentSpotlight ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ duration: 0.5, repeat: isCurrentSpotlight ? Infinity : 0 }}
                          >
                            {team.score}
                          </motion.span>
                        </div>

                        {/* Jokers */}
                        {totalJokers > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Zap className="w-3 h-3" /> Jokers
                            </span>
                            <div className="flex gap-1">
                              {[...Array(Math.min(totalJokers, 10))].map((_, i) => (
                                <motion.div
                                  key={i}
                                  animate={isCurrentSpotlight ? { y: [0, -3, 0] } : {}}
                                  transition={{ duration: 0.3, delay: i * 0.1, repeat: isCurrentSpotlight ? Infinity : 0 }}
                                >
                                  <Zap className={`w-4 h-4 ${theme.iconColor}`} />
                                </motion.div>
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
            )}

            {/* Message final */}
            {introPhase === 'all' && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className={`text-center text-3xl ${theme.textColor} font-bold mt-8`}
              >
                🎯 Que le meilleur gagne ! 🎯
              </motion.p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

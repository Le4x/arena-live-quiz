import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles } from "lucide-react";

interface ThanksScreenProps {
  sessionId: string;
}

export const ThanksScreen = ({ sessionId }: ThanksScreenProps) => {
  const [teams, setTeams] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showType, setShowType] = useState<'team' | 'sponsor'>('team');

  useEffect(() => {
    loadData();
  }, [sessionId]);

  useEffect(() => {
    const allItems = [...teams.map(t => ({ ...t, type: 'team' })), ...sponsors.map(s => ({ ...s, type: 'sponsor' }))];
    
    if (allItems.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % allItems.length;
        setShowType(allItems[next].type as 'team' | 'sponsor');
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [teams, sponsors]);

  const loadData = async () => {
    const [teamsData, sponsorsData] = await Promise.all([
      supabase.from('teams').select('*').order('score', { ascending: false }),
      supabase.from('sponsors').select('*').eq('game_session_id', sessionId).order('tier').order('display_order')
    ]);

    if (teamsData.data) setTeams(teamsData.data);
    if (sponsorsData.data) setSponsors(sponsorsData.data);
  };

  const allItems = [...teams.map(t => ({ ...t, type: 'team' })), ...sponsors.map(s => ({ ...s, type: 'sponsor' }))];
  const currentItem = allItems[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 flex flex-col items-center justify-center p-12 relative overflow-hidden">
      {/* Confettis animés */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ y: -20, x: Math.random() * window.innerWidth, opacity: 0 }}
            animate={{ 
              y: window.innerHeight + 20, 
              opacity: [0, 1, 1, 0],
              rotate: 360 
            }}
            transition={{ 
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.2 
            }}
          >
            <Sparkles className="h-6 w-6 text-primary" />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-center mb-16 z-10"
      >
        <h1 className="text-8xl font-black bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-4">
          MERCI À TOUS !
        </h1>
        <p className="text-3xl text-muted-foreground">Un grand merci à nos participants et partenaires</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {currentItem && (
          <motion.div
            key={currentIndex}
            initial={{ scale: 0, rotate: -10, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, rotate: 10, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10"
          >
            {showType === 'team' ? (
              <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-16 shadow-2xl border-4 border-primary/50 min-w-[500px] text-center">
                <Trophy className="h-24 w-24 mx-auto mb-6 text-primary animate-bounce" />
                <div 
                  className="w-32 h-32 rounded-full mx-auto mb-6 shadow-elegant"
                  style={{ backgroundColor: currentItem.color }}
                />
                <h2 className="text-5xl font-black mb-3">{currentItem.name}</h2>
                <p className="text-4xl font-bold text-primary">{currentItem.score} points</p>
              </div>
            ) : (
              <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-16 shadow-2xl border-4 border-secondary/50 min-w-[500px] text-center">
                <Sparkles className="h-20 w-20 mx-auto mb-8 text-secondary" />
                <img 
                  src={currentItem.logo_url} 
                  alt={currentItem.name}
                  className="h-40 w-auto mx-auto mb-6 object-contain drop-shadow-2xl"
                />
                <h2 className="text-4xl font-black">{currentItem.name}</h2>
                <p className="text-2xl text-muted-foreground mt-2">Merci pour votre soutien !</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

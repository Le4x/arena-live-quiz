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
  const [popupItems, setPopupItems] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [sessionId]);

  useEffect(() => {
    const allItems = [
      ...teams.map(t => ({ ...t, type: 'team' })), 
      ...sponsors.map(s => ({ ...s, type: 'sponsor' }))
    ];
    
    if (allItems.length === 0) return;

    // Créer des pop-ups aléatoires
    const generatePopups = () => {
      const newPopups = Array.from({ length: 8 }, (_, i) => {
        const item = allItems[Math.floor(Math.random() * allItems.length)];
        return {
          ...item,
          id: `${item.id}-${i}-${Date.now()}`,
          x: Math.random() * 80 + 10, // 10-90%
          y: Math.random() * 80 + 10, // 10-90%
          delay: Math.random() * 2
        };
      });
      setPopupItems(newPopups);
    };

    generatePopups();
    const interval = setInterval(generatePopups, 4000);

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

      {/* Pop-ups d'équipes et sponsors */}
      <AnimatePresence>
        {popupItems.map((item) => (
          <motion.div
            key={item.id}
            className="absolute pointer-events-none z-20"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
            }}
            initial={{ scale: 0, opacity: 0, rotate: -10 }}
            animate={{ 
              scale: [0, 1.2, 1],
              opacity: [0, 1, 1, 0],
              rotate: [0, 5, -5, 0],
              y: [0, -20, 0]
            }}
            transition={{ 
              duration: 3,
              delay: item.delay,
              times: [0, 0.2, 0.8, 1]
            }}
          >
            {item.type === 'team' ? (
              <div className="bg-card/95 backdrop-blur-xl rounded-2xl p-4 shadow-xl border-2 border-primary/30 flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
                  style={{ backgroundColor: item.color }}
                >
                  {item.name.charAt(0)}
                </div>
                <span className="font-bold text-lg">{item.name}</span>
              </div>
            ) : (
              <div className="bg-card/95 backdrop-blur-xl rounded-2xl p-4 shadow-xl border-2 border-secondary/30">
                <img 
                  src={item.logo_url} 
                  alt={item.name}
                  className="h-16 w-auto object-contain"
                />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-center z-10"
      >
        <h1 className="text-8xl font-black bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-4">
          MERCI À TOUS !
        </h1>
        <p className="text-3xl text-muted-foreground">Un grand merci à nos participants et partenaires</p>
      </motion.div>
    </div>
  );
};

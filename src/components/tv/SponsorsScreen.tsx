import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface SponsorsScreenProps {
  sessionId: string;
}

export const SponsorsScreen = ({ sessionId }: SponsorsScreenProps) => {
  const [sponsors, setSponsors] = useState<any[]>([]);

  useEffect(() => {
    loadSponsors();

    const channel = supabase
      .channel('sponsors-screen')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'sponsors',
        filter: `game_session_id=eq.${sessionId}`
      }, () => {
        loadSponsors();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const loadSponsors = async () => {
    const { data } = await supabase
      .from('sponsors')
      .select('*')
      .eq('game_session_id', sessionId)
      .order('tier', { ascending: true })
      .order('display_order', { ascending: true });
    
    if (data) setSponsors(data);
  };

  const majorSponsors = sponsors.filter(s => s.tier === 'major');
  const mediumSponsors = sponsors.filter(s => s.tier === 'medium');
  const minorSponsors = sponsors.filter(s => s.tier === 'minor');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Particules d'arrière-plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 blur-xl"
            style={{
              width: 100 + Math.random() * 200,
              height: 100 + Math.random() * 200,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -50, 0],
              x: [0, 30, 0],
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <motion.div className="relative z-10">
        <motion.h1
          className="text-7xl font-black text-center mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            textShadow: '0 0 40px rgba(255,107,0,0.3)',
          }}
        >
          Nos Partenaires
        </motion.h1>
        <motion.div
          className="h-1 w-64 mx-auto mb-16 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
        />
      </motion.div>

      {/* Sponsors Majeurs */}
      {majorSponsors.length > 0 && (
        <motion.div
          className="mb-16 w-full max-w-6xl relative z-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="flex flex-wrap justify-center gap-12">
            {majorSponsors.map((sponsor, index) => (
              <motion.div
                key={sponsor.id}
                className="flex flex-col items-center gap-4 relative group"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.2 }}
                whileHover={{ scale: 1.05 }}
              >
                {/* Bordure animée glow */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent rounded-3xl blur-2xl opacity-0 group-hover:opacity-50"
                  animate={{
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                />

                {/* Conteneur logo avec background */}
                <div className="relative p-8 bg-card/50 backdrop-blur-xl rounded-3xl border-2 border-primary/20 group-hover:border-primary/50 transition-all">
                  <img
                    src={sponsor.logo_url}
                    alt={sponsor.name}
                    className="h-48 w-auto object-contain drop-shadow-2xl"
                  />
                </div>

                <p className="text-2xl font-bold text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {sponsor.name}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Sponsors Moyens */}
      {mediumSponsors.length > 0 && (
        <motion.div
          className="mb-12 w-full max-w-5xl relative z-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <div className="flex flex-wrap justify-center gap-8">
            {mediumSponsors.map((sponsor, index) => (
              <motion.div
                key={sponsor.id}
                className="flex flex-col items-center gap-3 group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.15 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="p-6 bg-card/40 backdrop-blur-lg rounded-2xl border border-secondary/20 group-hover:border-secondary/40 transition-all">
                  <img
                    src={sponsor.logo_url}
                    alt={sponsor.name}
                    className="h-32 w-auto object-contain drop-shadow-xl"
                  />
                </div>
                <p className="text-lg font-semibold text-center">{sponsor.name}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Sponsors Mineurs */}
      {minorSponsors.length > 0 && (
        <motion.div
          className="w-full max-w-4xl relative z-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          <div className="flex flex-wrap justify-center gap-6">
            {minorSponsors.map((sponsor, index) => (
              <motion.div
                key={sponsor.id}
                className="flex flex-col items-center gap-2 group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 + index * 0.1 }}
                whileHover={{ scale: 1.1 }}
              >
                <div className="p-4 bg-card/30 backdrop-blur-md rounded-xl border border-accent/10 group-hover:border-accent/30 transition-all">
                  <img
                    src={sponsor.logo_url}
                    alt={sponsor.name}
                    className="h-20 w-auto object-contain drop-shadow-lg"
                  />
                </div>
                <p className="text-sm font-medium text-center text-muted-foreground">{sponsor.name}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

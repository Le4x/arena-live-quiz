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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex flex-col items-center justify-center p-8">
      <motion.h1 
        className="text-6xl font-black text-center mb-12 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        Nos Partenaires
      </motion.h1>

      {/* Sponsors Majeurs */}
      {majorSponsors.length > 0 && (
        <motion.div 
          className="mb-16 w-full max-w-6xl"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="flex flex-wrap justify-center gap-12">
            {majorSponsors.map((sponsor, index) => (
              <motion.div
                key={sponsor.id}
                className="flex flex-col items-center gap-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.2 }}
              >
                <img 
                  src={sponsor.logo_url} 
                  alt={sponsor.name}
                  className="h-48 w-auto object-contain drop-shadow-2xl"
                />
                <p className="text-2xl font-bold text-center">{sponsor.name}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Sponsors Moyens */}
      {mediumSponsors.length > 0 && (
        <motion.div 
          className="mb-12 w-full max-w-5xl"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <div className="flex flex-wrap justify-center gap-8">
            {mediumSponsors.map((sponsor, index) => (
              <motion.div
                key={sponsor.id}
                className="flex flex-col items-center gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.15 }}
              >
                <img 
                  src={sponsor.logo_url} 
                  alt={sponsor.name}
                  className="h-32 w-auto object-contain drop-shadow-xl"
                />
                <p className="text-lg font-semibold text-center">{sponsor.name}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Sponsors Mineurs */}
      {minorSponsors.length > 0 && (
        <motion.div 
          className="w-full max-w-4xl"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          <div className="flex flex-wrap justify-center gap-6">
            {minorSponsors.map((sponsor, index) => (
              <motion.div
                key={sponsor.id}
                className="flex flex-col items-center gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 + index * 0.1 }}
              >
                <img 
                  src={sponsor.logo_url} 
                  alt={sponsor.name}
                  className="h-20 w-auto object-contain drop-shadow-lg"
                />
                <p className="text-sm font-medium text-center text-muted-foreground">{sponsor.name}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

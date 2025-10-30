import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface PublicVoteResultsProps {
  finalId: string;
  currentQuestionInstanceId: string;
  currentQuestion: any;
}

export const PublicVoteResults = ({ 
  finalId, 
  currentQuestionInstanceId,
  currentQuestion 
}: PublicVoteResultsProps) => {
  const [voteResults, setVoteResults] = useState<any[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
    if (currentQuestionInstanceId && finalId) {
      loadVotes();

      // Écouter les changements en temps réel
      const channel = supabase
        .channel('public-votes-results')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'public_votes',
          filter: `question_instance_id=eq.${currentQuestionInstanceId}`
        }, () => {
          loadVotes();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentQuestionInstanceId, finalId]);

  const loadVotes = async () => {
    const { data } = await supabase
      .from('public_votes')
      .select('voted_answer')
      .eq('final_id', finalId)
      .eq('question_instance_id', currentQuestionInstanceId);

    if (data) {
      // Compter les votes par réponse
      const voteCounts: { [key: string]: number } = {};
      data.forEach((vote) => {
        voteCounts[vote.voted_answer] = (voteCounts[vote.voted_answer] || 0) + 1;
      });

      const total = data.length;
      const results = Object.entries(voteCounts)
        .map(([answer, count]) => ({
          answer,
          count: count as number,
          percentage: total > 0 ? Math.round((count as number / total) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count);

      setVoteResults(results);
      setTotalVotes(total);
    }
  };

  if (voteResults.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-purple-900/95 via-purple-800/95 to-pink-900/95 flex items-center justify-center p-8">
      <Card className="w-full max-w-4xl bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-purple-500/50 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Users className="h-12 w-12 text-purple-400" />
            <h2 className="text-5xl font-bold text-white">Vote du Public</h2>
          </div>
          <p className="text-2xl text-purple-300">
            {totalVotes} {totalVotes > 1 ? 'votes enregistrés' : 'vote enregistré'}
          </p>
        </div>

        {/* Résultats */}
        <div className="space-y-6">
          {voteResults.map((result, index) => (
            <motion.div
              key={result.answer}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.2 }}
              className="relative"
            >
              {/* Label et pourcentage */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {currentQuestion?.question_type === 'qcm' ? (
                    <div className="w-12 h-12 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-2xl">
                      {result.answer}
                    </div>
                  ) : (
                    <TrendingUp className="h-8 w-8 text-purple-400" />
                  )}
                  <span className="text-2xl font-semibold text-white truncate max-w-2xl">
                    {result.answer}
                  </span>
                </div>
                <div className="text-3xl font-bold text-white">
                  {result.percentage}%
                </div>
              </div>

              {/* Barre de progression */}
              <div className="h-16 bg-purple-950/50 rounded-full overflow-hidden border-2 border-purple-500/30">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.percentage}%` }}
                  transition={{ duration: 1, delay: index * 0.2 + 0.3 }}
                  className="h-full bg-gradient-to-r from-purple-500 via-purple-400 to-pink-400 flex items-center justify-end pr-6"
                >
                  {result.percentage > 15 && (
                    <span className="text-2xl font-bold text-white">
                      {result.count} {result.count > 1 ? 'votes' : 'vote'}
                    </span>
                  )}
                </motion.div>
              </div>

              {/* Compteur sous la barre si pourcentage faible */}
              {result.percentage <= 15 && (
                <div className="text-right mt-1">
                  <span className="text-lg font-semibold text-purple-300">
                    {result.count} {result.count > 1 ? 'votes' : 'vote'}
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
};
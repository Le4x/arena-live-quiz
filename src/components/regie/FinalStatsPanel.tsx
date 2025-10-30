import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Users, TrendingUp } from "lucide-react";

interface FinalStatsPanelProps {
  finalId: string;
  currentQuestionInstanceId: string | null;
}

export const FinalStatsPanel = ({ finalId, currentQuestionInstanceId }: FinalStatsPanelProps) => {
  const [jokerUsage, setJokerUsage] = useState<any[]>([]);
  const [publicVotes, setPublicVotes] = useState<any[]>([]);
  const [finalists, setFinalists] = useState<any[]>([]);

  useEffect(() => {
    if (finalId) {
      loadFinalists();
      loadJokerUsage();
    }
  }, [finalId]);

  useEffect(() => {
    if (currentQuestionInstanceId) {
      loadPublicVotes();
    }
  }, [currentQuestionInstanceId]);

  const loadFinalists = async () => {
    const { data: final } = await supabase
      .from('finals')
      .select('*')
      .eq('id', finalId)
      .single();

    if (final?.finalist_teams) {
      const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .in('id', final.finalist_teams as string[]);
      
      if (teams) setFinalists(teams);
    }
  };

  const loadJokerUsage = async () => {
    const { data } = await supabase
      .from('final_jokers')
      .select('*, teams(name, color), joker_types(name, icon)')
      .eq('final_id', finalId)
      .gt('used_count', 0)
      .order('used_count', { ascending: false });

    if (data) setJokerUsage(data);
  };

  const loadPublicVotes = async () => {
    if (!currentQuestionInstanceId) return;

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

      const sorted = Object.entries(voteCounts)
        .map(([answer, count]) => ({ answer, count }))
        .sort((a, b) => b.count - a.count);

      setPublicVotes(sorted);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Utilisation des Jokers */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-yellow-500" />
          <h3 className="font-bold">Jokers Utilisés</h3>
          <Badge variant="outline" className="ml-auto">
            {jokerUsage.reduce((sum, j) => sum + j.used_count, 0)} total
          </Badge>
        </div>

        {jokerUsage.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun joker utilisé pour le moment
          </p>
        ) : (
          <div className="space-y-2">
            {jokerUsage.map((joker) => (
              <div
                key={joker.id}
                className="flex items-center gap-3 p-2 bg-card/50 rounded border border-border"
              >
                <span className="text-2xl">{joker.joker_types.icon}</span>
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: joker.teams.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{joker.teams.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {joker.joker_types.name.replace('_', ' ')}
                  </p>
                </div>
                <Badge className="bg-yellow-500 text-black font-bold">
                  {joker.used_count}x
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Votes du Public */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-purple-500" />
          <h3 className="font-bold">Votes du Public</h3>
          <Badge variant="outline" className="ml-auto">
            {publicVotes.reduce((sum, v) => sum + v.count, 0)} votes
          </Badge>
        </div>

        {!currentQuestionInstanceId ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune question active
          </p>
        ) : publicVotes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun vote pour cette question
          </p>
        ) : (
          <div className="space-y-2">
            {publicVotes.map((vote, index) => {
              const total = publicVotes.reduce((sum, v) => sum + v.count, 0);
              const percentage = Math.round((vote.count / total) * 100);

              return (
                <div
                  key={index}
                  className="p-3 bg-card/50 rounded border border-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold truncate flex-1">
                      {vote.answer}
                    </p>
                    <Badge className="bg-purple-500 text-white ml-2">
                      {vote.count} ({percentage}%)
                    </Badge>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
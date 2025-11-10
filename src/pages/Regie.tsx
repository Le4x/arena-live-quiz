/**
 * Régie - Interface de contrôle professionnelle (v2.0)
 * Architecture modulaire avec navigation par sections
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { DashboardPanel } from '@/components/admin/dashboard/DashboardPanel';
import { GameControlPanel } from '@/components/admin/game-control/GameControlPanel';
import { MediaManager } from '@/components/admin/media/MediaManager';
import { Card } from '@/components/ui/card';
import { Users, Monitor, Loader2 } from 'lucide-react';
import { useRealtimeReconnect } from '@/hooks/useRealtimeReconnect';

const Regie = () => {
  const { toast } = useToast();

  // Section active
  const [currentSection, setCurrentSection] = useState('dashboard');

  // Data states
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [currentRound, setCurrentRound] = useState<any>(null);
  const [buzzers, setBuzzers] = useState<any[]>([]);

  // Hook de reconnexion automatique
  useRealtimeReconnect({
    onReconnect: () => {
      console.log('🔄 Regie: Reconnexion - rechargement des données');
      loadAllData();
    },
  });

  // Charger toutes les données
  const loadAllData = async () => {
    await Promise.all([
      loadActiveSession(),
      loadGameState(),
      loadTeams(),
      loadRounds(),
    ]);
    setLoading(false);
  };

  // Charger la session active
  const loadActiveSession = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) {
        console.log('Aucune session active');
        return;
      }

      setCurrentSession(data);
      setSessionId(data.id);
    } catch (error) {
      console.error('Erreur chargement session:', error);
    }
  };

  // Charger le game state
  const loadGameState = async () => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase
        .from('game_state')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error) throw error;
      setGameState(data);

      // Charger la question actuelle
      if (data.current_question_id) {
        const { data: questionData } = await supabase
          .from('questions')
          .select('*')
          .eq('id', data.current_question_id)
          .single();
        setCurrentQuestion(questionData);
      }
    } catch (error) {
      console.error('Erreur chargement game state:', error);
    }
  };

  // Charger les équipes
  const loadTeams = async () => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('session_id', sessionId)
        .order('name');

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Erreur chargement équipes:', error);
    }
  };

  // Charger les rounds
  const loadRounds = async () => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .eq('session_id', sessionId)
        .order('order_index');

      if (error) throw error;
      setRounds(data || []);

      // Charger les questions du round actuel
      if (currentSession?.current_round_id) {
        loadQuestions(currentSession.current_round_id);

        const currentRoundData = data?.find(r => r.id === currentSession.current_round_id);
        setCurrentRound(currentRoundData);
      }
    } catch (error) {
      console.error('Erreur chargement rounds:', error);
    }
  };

  // Charger les questions
  const loadQuestions = async (roundId: string) => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('round_id', roundId)
        .order('order_index');

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Erreur chargement questions:', error);
    }
  };

  // Charger les buzzers
  const loadBuzzers = async () => {
    if (!currentQuestion) return;

    try {
      const { data, error } = await supabase
        .from('buzzers')
        .select('*')
        .eq('question_id', currentQuestion.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setBuzzers(data || []);
    } catch (error) {
      console.error('Erreur chargement buzzers:', error);
    }
  };

  // Initial load
  useEffect(() => {
    loadAllData();
  }, []);

  // Load data when session changes
  useEffect(() => {
    if (sessionId) {
      loadGameState();
      loadTeams();
      loadRounds();
    }
  }, [sessionId]);

  // Load questions when round changes
  useEffect(() => {
    if (currentSession?.current_round_id) {
      loadQuestions(currentSession.current_round_id);
    }
  }, [currentSession?.current_round_id]);

  // Load buzzers when question changes
  useEffect(() => {
    if (currentQuestion) {
      loadBuzzers();
    }
  }, [currentQuestion?.id]);

  // Subscriptions real-time
  useEffect(() => {
    if (!sessionId) return;

    console.log('🔔 Regie: Configuration des subscriptions real-time');

    // Subscribe to game_state changes
    const gameStateChannel = supabase
      .channel('regie-game-state')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_state', filter: `session_id=eq.${sessionId}` },
        () => {
          console.log('🔄 Game state updated');
          loadGameState();
        }
      )
      .subscribe();

    // Subscribe to teams changes
    const teamsChannel = supabase
      .channel('regie-teams')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `session_id=eq.${sessionId}` },
        () => {
          console.log('🔄 Teams updated');
          loadTeams();
        }
      )
      .subscribe();

    // Subscribe to buzzers
    const buzzersChannel = supabase
      .channel('regie-buzzers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'buzzers' },
        () => {
          console.log('🔄 Buzzers updated');
          if (currentQuestion) {
            loadBuzzers();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameStateChannel);
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(buzzersChannel);
    };
  }, [sessionId, currentQuestion?.id]);

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-semibold">Chargement de la régie...</p>
        </div>
      </div>
    );
  }

  // Render no session state
  if (!currentSession) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card className="p-12 text-center max-w-md">
          <Monitor className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Aucune session active</h2>
          <p className="text-muted-foreground">
            Créez ou activez une session depuis l'admin pour commencer
          </p>
        </Card>
      </div>
    );
  }

  const connectedTeamsCount = teams.filter(t => t.is_active).length;

  return (
    <>
      <AdminLayout
        currentSection={currentSection}
        onSectionChange={setCurrentSection}
        sessionName={currentSession.name}
        connectedTeamsCount={connectedTeamsCount}
      >
        {/* Dashboard */}
        {currentSection === 'dashboard' && (
          <DashboardPanel
            teams={teams}
            currentQuestion={currentQuestion}
            gameState={gameState}
            buzzers={buzzers}
            sessionId={sessionId!}
          />
        )}

        {/* Game Control */}
        {currentSection === 'game-control' && (
          <GameControlPanel
            sessionId={sessionId!}
            currentSession={currentSession}
            gameState={gameState}
            rounds={rounds}
            questions={questions}
            teams={teams}
            currentQuestion={currentQuestion}
            currentRound={currentRound}
            onLoadData={loadAllData}
          />
        )}

        {/* Media Manager */}
        {currentSection === 'media' && <MediaManager />}

        {/* Teams */}
        {currentSection === 'teams' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight bg-gradient-arena bg-clip-text text-transparent">
                Gestion des Équipes
              </h2>
              <p className="text-muted-foreground mt-1">
                {connectedTeamsCount} équipe{connectedTeamsCount > 1 ? 's' : ''} connectée{connectedTeamsCount > 1 ? 's' : ''}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <Card key={team.id} className="p-6">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{team.name}</h3>
                      <p className="text-2xl font-black text-primary">{team.score} pts</p>
                      <p className="text-sm text-muted-foreground">
                        {team.is_active ? '🟢 Connectée' : '⚫ Déconnectée'}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Screens */}
        {currentSection === 'screens' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight bg-gradient-arena bg-clip-text text-transparent">
                Gestion des Écrans
              </h2>
              <p className="text-muted-foreground mt-1">
                Contrôle des écrans TV et affichages
              </p>
            </div>

            <Card className="p-12 text-center">
              <Monitor className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-semibold mb-2">Gestion d'écrans avancée</p>
              <p className="text-sm text-muted-foreground">
                Cette section sera développée dans une prochaine version
              </p>
            </Card>
          </div>
        )}
      </AdminLayout>

      <Toaster />
    </>
  );
};

export default Regie;

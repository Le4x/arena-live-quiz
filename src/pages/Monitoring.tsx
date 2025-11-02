/**
 * Page de monitoring système
 * Surveille la stabilité de l'application en temps réel
 */

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Wifi, Database, Zap, AlertCircle, CheckCircle2, Clock, Users, PlayCircle, Target, Home } from 'lucide-react';
import { getRealtimeManager } from '@/lib/realtime/RealtimeManager';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/utils/logger';
import { useNavigate } from 'react-router-dom';
import { MetricCard as MetricCardComponent } from '@/components/monitoring/MetricCard';
import { ConsoleMonitor } from '@/components/monitoring/ConsoleMonitor';
import { useRealtimeReconnect } from '@/hooks/useRealtimeReconnect';

interface MetricCard {
  title: string;
  value: string | number;
  status: 'ok' | 'warning' | 'error';
  icon: React.ReactNode;
  description?: string;
}

export const Monitoring = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [gameMetrics, setGameMetrics] = useState<{
    teams: number;
    simulationTeams: number;
    activeSession: string | null;
    currentQuestion: string | null;
    buzzersCount: number;
    answersCount: number;
  }>({
    teams: 0,
    simulationTeams: 0,
    activeSession: null,
    currentQuestion: null,
    buzzersCount: 0,
    answersCount: 0
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const updateMetrics = async () => {
      const realtimeManager = getRealtimeManager();
      const stats = realtimeManager.getStats();
      
      // Test connexion DB
      const dbStart = Date.now();
      const { error: dbError } = await supabase.from('game_sessions').select('id').limit(1);
      const dbLatency = Date.now() - dbStart;
      
      // Test connexion realtime
      const channels = supabase.getChannels();
      const activeChannels = channels.filter(c => c.state === 'joined');
      const totalChannels = channels.length;
      
      logger.info(`📊 Monitoring update - Channels: ${activeChannels.length}/${totalChannels}`);
      
      // Game metrics
      const { data: teams } = await supabase.from('teams').select('*');
      const { data: activeSession } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('status', 'active')
        .maybeSingle();
      
      const { data: gameState } = await supabase
        .from('game_state')
        .select('*')
        .eq('game_session_id', activeSession?.id)
        .maybeSingle();
      
      const { data: buzzers } = await supabase
        .from('buzzer_attempts')
        .select('*')
        .eq('question_instance_id', gameState?.current_question_instance_id || '');
      
      const { data: answers } = await supabase
        .from('team_answers')
        .select('*')
        .eq('question_instance_id', gameState?.current_question_instance_id || '');
      
      const simulationTeams = teams?.filter(t => t.name?.startsWith('SIM-')) || [];
      
      setGameMetrics({
        teams: teams?.length || 0,
        simulationTeams: simulationTeams.length,
        activeSession: activeSession?.name || null,
        currentQuestion: gameState?.current_question_id || null,
        buzzersCount: buzzers?.length || 0,
        answersCount: answers?.length || 0
      });
      
      const newMetrics: MetricCard[] = [
        {
          title: 'Base de données',
          value: dbError ? 'Erreur' : `${dbLatency}ms`,
          status: dbError ? 'error' : dbLatency > 500 ? 'warning' : 'ok',
          icon: <Database className="w-5 h-5" />,
          description: dbError ? dbError.message : 'Connexion stable'
        },
        {
          title: 'Channels Realtime',
          value: `${activeChannels.length}/${totalChannels}`,
          status: activeChannels.length === totalChannels && activeChannels.length > 0 ? 'ok' : 'warning',
          icon: <Wifi className="w-5 h-5" />,
          description: activeChannels.length > 0 
            ? `${activeChannels.length} channels connectés` 
            : '⚠️ Aucun channel actif'
        },
        {
          title: 'Reconnexions',
          value: stats.reconnectAttempts,
          status: stats.reconnectAttempts > 5 ? 'warning' : 'ok',
          icon: <Zap className="w-5 h-5" />,
          description: stats.isReconnecting ? 'Reconnexion en cours...' : 'Stable'
        },
        {
          title: 'Performance',
          value: `${Math.round((performance as any).memory?.usedJSHeapSize / 1024 / 1024) || 'N/A'}MB`,
          status: 'ok',
          icon: <Activity className="w-5 h-5" />,
          description: 'Mémoire JavaScript utilisée'
        }
      ];

      setMetrics(newMetrics);
      setLastUpdate(new Date());
      
      // Log
      const logEntry = `[${new Date().toISOString()}] DB: ${dbLatency}ms | Channels: ${activeChannels.length}/${channels.length} | Reconnects: ${stats.reconnectAttempts}`;
      setLogs(prev => [logEntry, ...prev.slice(0, 49)]);
      
      logger.info('Monitoring update', { metrics: newMetrics, stats, gameMetrics });
    };

    // Mise à jour immédiate
    updateMetrics();
    
    // Mise à jour toutes les 5 secondes
    const interval = setInterval(updateMetrics, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
    }
  };

  const getStatusIcon = (status: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok': return <CheckCircle2 className="w-4 h-4" />;
      case 'warning': return <AlertCircle className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
    }
  };

  const overallStatus = metrics.some(m => m.status === 'error') ? 'error' 
    : metrics.some(m => m.status === 'warning') ? 'warning' 
    : 'ok';

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')}
              className="mb-2"
            >
              <Home className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-3xl font-bold">Monitoring Système</h1>
            <p className="text-muted-foreground mt-1">
              Surveillance en temps réel de l'application
            </p>
          </div>
          <Badge 
            variant={overallStatus === 'ok' ? 'default' : 'destructive'}
            className="text-lg px-4 py-2"
          >
            {overallStatus === 'ok' ? '✓ Opérationnel' : '⚠ Attention'}
          </Badge>
        </div>

        {/* Infrastructure Metrics */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Infrastructure</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric, idx) => (
              <MetricCardComponent key={idx} {...metric} />
            ))}
          </div>
        </div>

        {/* Game State Metrics */}
        <div>
          <h2 className="text-xl font-semibold mb-4">État du Jeu</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCardComponent
              title="Équipes"
              value={gameMetrics.teams}
              status="ok"
              icon={<Users className="w-5 h-5" />}
              description={gameMetrics.simulationTeams > 0 
                ? `${gameMetrics.simulationTeams} équipes de simulation` 
                : 'Aucune équipe de simulation'}
            />
            <MetricCardComponent
              title="Session active"
              value={gameMetrics.activeSession || 'Aucune'}
              status={gameMetrics.activeSession ? 'ok' : 'warning'}
              icon={<PlayCircle className="w-5 h-5" />}
              description={gameMetrics.activeSession ? 'Partie en cours' : 'Aucune session active'}
            />
            <MetricCardComponent
              title="Question en cours"
              value={gameMetrics.currentQuestion ? 'Oui' : 'Non'}
              status={gameMetrics.currentQuestion ? 'ok' : 'warning'}
              icon={<Target className="w-5 h-5" />}
              description={`Buzzers: ${gameMetrics.buzzersCount} | Réponses: ${gameMetrics.answersCount}`}
            />
          </div>
        </div>

        {/* Warning if no simulation activity */}
        {gameMetrics.simulationTeams > 0 && gameMetrics.currentQuestion && (
          gameMetrics.buzzersCount === 0 && gameMetrics.answersCount === 0 ? (
            <Card className="p-6 border-yellow-500/50 bg-yellow-500/10">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-500">Simulation inactive</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {gameMetrics.simulationTeams} équipes de simulation détectées mais aucune activité (buzzers/réponses).
                    <br />
                    <strong>Raison probable :</strong> Le panneau de contrôle de simulation n'a pas été démarré dans Admin → Équipes.
                  </p>
                </div>
              </div>
            </Card>
          ) : null
        )}

        {/* Realtime Channels Details */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wifi className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Canaux Realtime</h2>
          </div>
          <div className="space-y-2">
            {supabase.getChannels().map((channel, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-mono text-sm">{channel.topic}</span>
                <Badge variant={channel.state === 'joined' ? 'default' : 'secondary'}>
                  {channel.state}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Logs */}
        <ConsoleMonitor />
      </div>
    </div>
  );
};

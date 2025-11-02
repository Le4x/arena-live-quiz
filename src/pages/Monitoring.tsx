/**
 * Page de monitoring système
 * Surveille la stabilité de l'application en temps réel
 */

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Wifi, Database, Zap, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { getRealtimeManager } from '@/lib/realtime/RealtimeManager';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/utils/logger';

interface MetricCard {
  title: string;
  value: string | number;
  status: 'ok' | 'warning' | 'error';
  icon: React.ReactNode;
  description?: string;
}

export const Monitoring = () => {
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
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
      const activeChannels = channels.filter(c => c.state === 'joined' || c.state === 'joining');
      
      const newMetrics: MetricCard[] = [
        {
          title: 'Base de données',
          value: dbError ? 'Erreur' : `${dbLatency}ms`,
          status: dbError ? 'error' : dbLatency > 1000 ? 'warning' : 'ok',
          icon: <Database className="w-5 h-5" />,
          description: dbError ? dbError.message : 'Connexion stable'
        },
        {
          title: 'Channels Realtime',
          value: `${activeChannels.length}/${channels.length}`,
          status: activeChannels.length === channels.length ? 'ok' : 'warning',
          icon: <Wifi className="w-5 h-5" />,
          description: `${stats.channelCount} channels gérés par RealtimeManager`
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
          value: `${Math.round((performance as any).memory?.usedJSHeapSize / 1024 / 1024) || 'N/A'}`,
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
      
      logger.info('Monitoring update', { metrics: newMetrics, stats });
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

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, idx) => (
            <Card key={idx} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={getStatusColor(metric.status)}>
                  {metric.icon}
                </div>
                {getStatusIcon(metric.status)}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{metric.title}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
                {metric.description && (
                  <p className="text-xs text-muted-foreground">{metric.description}</p>
                )}
              </div>
            </Card>
          ))}
        </div>

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
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Logs Système</h2>
            <Badge variant="outline" className="ml-auto">
              Dernière mise à jour: {lastUpdate.toLocaleTimeString()}
            </Badge>
          </div>
          <div className="bg-black rounded-lg p-4 font-mono text-xs text-green-400 h-96 overflow-y-auto">
            {logs.map((log, idx) => (
              <div key={idx} className="mb-1">{log}</div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

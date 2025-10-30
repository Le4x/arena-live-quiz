/**
 * SideLog - Journal des événements régie
 * Affiche chronologiquement toutes les actions importantes
 */

import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  icon?: string;
}

interface SideLogProps {
  logs: LogEntry[];
}

export const SideLog = ({ logs }: SideLogProps) => {
  const getTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'error': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Card className="h-full bg-card/50 backdrop-blur-sm border-primary/20 flex flex-col">
      <div className="p-4 border-b border-primary/20">
        <h3 className="text-lg font-bold text-primary">📋 Journal</h3>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Aucune action enregistrée
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`p-3 rounded-lg border ${getTypeColor(log.type)}`}
              >
                <div className="flex items-start gap-2">
                  {log.icon && <span className="text-lg">{log.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium break-words">
                      {log.message}
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      {formatTime(log.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};

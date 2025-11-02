import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Terminal, Trash2, Copy, Filter } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface ConsoleLog {
  id: string;
  timestamp: Date;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  args: any[];
}

export const ConsoleMonitor = () => {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'log' | 'info' | 'warn' | 'error'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Intercepter les logs console
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };

    const addLog = (level: ConsoleLog['level'], args: any[]) => {
      const log: ConsoleLog = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        level,
        message: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '),
        args
      };

      setLogs(prev => [...prev.slice(-999), log]); // Garder max 1000 logs
    };

    console.log = (...args) => {
      originalConsole.log(...args);
      addLog('log', args);
    };

    console.info = (...args) => {
      originalConsole.info(...args);
      addLog('info', args);
    };

    console.warn = (...args) => {
      originalConsole.warn(...args);
      addLog('warn', args);
    };

    console.error = (...args) => {
      originalConsole.error(...args);
      addLog('error', args);
    };

    console.debug = (...args) => {
      originalConsole.debug(...args);
      addLog('debug', args);
    };

    return () => {
      console.log = originalConsole.log;
      console.info = originalConsole.info;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.debug = originalConsole.debug;
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);

  const clearLogs = () => {
    setLogs([]);
    toast.success('Console effacée');
  };

  const copyLogs = () => {
    const text = filteredLogs.map(log => 
      `[${log.timestamp.toLocaleTimeString()}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    navigator.clipboard.writeText(text);
    toast.success('Logs copiés dans le presse-papier');
  };

  const getLevelColor = (level: ConsoleLog['level']) => {
    switch (level) {
      case 'error': return 'text-red-500';
      case 'warn': return 'text-yellow-500';
      case 'info': return 'text-blue-500';
      case 'debug': return 'text-purple-500';
      default: return 'text-muted-foreground';
    }
  };

  const getLevelBadge = (level: ConsoleLog['level']) => {
    switch (level) {
      case 'error': return 'destructive';
      case 'warn': return 'outline';
      case 'info': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Card className="p-6 bg-card/80 backdrop-blur-sm border-accent/20">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="h-5 w-5 text-accent" />
            <h3 className="text-xl font-bold">Console en temps réel</h3>
            <Badge variant="outline">{filteredLogs.length} logs</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Filters */}
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={filter === 'all' ? 'default' : 'ghost'}
                onClick={() => setFilter('all')}
              >
                Tout
              </Button>
              <Button
                size="sm"
                variant={filter === 'error' ? 'destructive' : 'ghost'}
                onClick={() => setFilter('error')}
              >
                Erreurs
              </Button>
              <Button
                size="sm"
                variant={filter === 'warn' ? 'default' : 'ghost'}
                onClick={() => setFilter('warn')}
              >
                Warn
              </Button>
              <Button
                size="sm"
                variant={filter === 'info' ? 'default' : 'ghost'}
                onClick={() => setFilter('info')}
              >
                Info
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setAutoScroll(!autoScroll)}
            >
              {autoScroll ? '📌 Auto' : '📌 Manuel'}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={copyLogs}
            >
              <Copy className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={clearLogs}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Console output */}
        <ScrollArea 
          className="h-[500px] rounded-lg border bg-black/90 p-4"
          ref={scrollRef}
        >
          <div className="font-mono text-sm space-y-1">
            {filteredLogs.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">
                Aucun log pour le moment...
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div 
                  key={log.id}
                  className={`${getLevelColor(log.level)} hover:bg-white/5 px-2 py-1 rounded`}
                >
                  <span className="text-muted-foreground mr-2">
                    [{log.timestamp.toLocaleTimeString()}]
                  </span>
                  <Badge 
                    variant={getLevelBadge(log.level) as any}
                    className="mr-2 text-xs"
                  >
                    {log.level.toUpperCase()}
                  </Badge>
                  <span className="whitespace-pre-wrap break-all">
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Stats */}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Total: {logs.length}</span>
          <span className="text-red-500">
            Erreurs: {logs.filter(l => l.level === 'error').length}
          </span>
          <span className="text-yellow-500">
            Warnings: {logs.filter(l => l.level === 'warn').length}
          </span>
          <span className="text-blue-500">
            Info: {logs.filter(l => l.level === 'info').length}
          </span>
        </div>
      </div>
    </Card>
  );
};

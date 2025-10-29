import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpCircle, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HelpRequest {
  id: string;
  team_id: string;
  game_session_id: string;
  message: string;
  status: string;
  created_at: string;
  teams?: {
    name: string;
    color: string;
  };
}

interface HelpRequestMonitorProps {
  sessionId: string | null;
}

export const HelpRequestMonitor = ({ sessionId }: HelpRequestMonitorProps) => {
  const { toast } = useToast();
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);

  useEffect(() => {
    if (!sessionId) return;
    
    loadHelpRequests();
    
    // S'abonner aux nouvelles demandes d'aide
    const channel = supabase
      .channel('help-requests')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'help_requests',
        filter: `game_session_id=eq.${sessionId}`
      }, (payload) => {
        console.log('🆘 Nouvelle demande d\'aide:', payload);
        loadHelpRequests();
        toast({
          title: '🆘 Demande d\'aide !',
          description: 'Une équipe a besoin d\'assistance',
          duration: 10000
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const loadHelpRequests = async () => {
    if (!sessionId) return;
    
    const { data } = await supabase
      .from('help_requests')
      .select('*, teams(*)')
      .eq('game_session_id', sessionId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (data) setHelpRequests(data);
  };

  const resolveRequest = async (requestId: string) => {
    await supabase
      .from('help_requests')
      .update({ 
        status: 'resolved',
        resolved_at: new Date().toISOString()
      })
      .eq('id', requestId);
    
    loadHelpRequests();
    toast({ title: '✅ Demande résolue' });
  };

  const dismissRequest = async (requestId: string) => {
    await supabase
      .from('help_requests')
      .update({ 
        status: 'dismissed',
        resolved_at: new Date().toISOString()
      })
      .eq('id', requestId);
    
    loadHelpRequests();
    toast({ title: '🚫 Demande ignorée' });
  };

  if (helpRequests.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-md space-y-2 z-50">
      {helpRequests.map((request) => (
        <Card 
          key={request.id}
          className="p-4 bg-gradient-to-br from-red-500/90 to-orange-500/90 backdrop-blur-xl border-2 border-red-400 shadow-2xl animate-bounce-in"
        >
          <div className="flex items-start gap-3">
            <HelpCircle className="h-6 w-6 text-white mt-1 animate-pulse" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge 
                  className="font-bold text-white"
                  style={{ backgroundColor: request.teams?.color }}
                >
                  {request.teams?.name}
                </Badge>
                <span className="text-xs text-white/80">
                  {new Date(request.created_at).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-white font-medium">
                Demande d'aide
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => resolveRequest(request.id)}
                className="h-8 w-8 p-0 hover:bg-white/20 text-white"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => dismissRequest(request.id)}
                className="h-8 w-8 p-0 hover:bg-white/20 text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
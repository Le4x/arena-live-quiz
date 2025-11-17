/**
 * Admin Sessions Dashboard - Multi-session management overview
 * Shows all sessions with real-time stats and controls
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Play,
  Pause,
  Square,
  MoreVertical,
  Plus,
  Search,
  Users,
  Trophy,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Copy,
  ExternalLink
} from "lucide-react";
import { motion } from "framer-motion";

interface SessionWithStats {
  id: string;
  name: string;
  access_code: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  session_type: 'quiz' | 'blindtest' | 'mixed';
  event_date: string | null;
  client_name: string | null;
  client_company: string | null;
  max_teams: number;
  created_at: string;
  active_teams_count: number;
  total_teams_count: number;
  current_question_id: string | null;
}

const AdminSessionsDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SessionWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadSessions();

    // Subscribe to session changes
    const channel = supabase
      .channel('admin-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions'
        },
        () => {
          loadSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('active_sessions_with_state')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les sessions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async () => {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .insert([
          {
            name: `Session ${new Date().toLocaleDateString('fr-FR')}`,
            status: 'draft',
            session_type: 'quiz',
            max_teams: 20
          }
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "✅ Session créée",
        description: `Code d'accès: ${data.access_code}`
      });

      navigate(`/admin/sessions/${data.id}/edit`);
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la session",
        variant: "destructive"
      });
    }
  };

  const updateSessionStatus = async (sessionId: string, newStatus: 'active' | 'paused' | 'completed') => {
    try {
      const { error } = await supabase
        .from('game_sessions')
        .update({ status: newStatus })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "✅ Statut mis à jour",
        description: `Session maintenant: ${newStatus}`
      });

      loadSessions();
    } catch (error) {
      console.error('Error updating session status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive"
      });
    }
  };

  const deleteSession = async (sessionId: string, sessionName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${sessionName}" ? Cette action est irréversible.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('game_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "✅ Session supprimée",
        description: `"${sessionName}" a été supprimée`
      });

      loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la session",
        variant: "destructive"
      });
    }
  };

  const copyAccessCode = (accessCode: string) => {
    navigator.clipboard.writeText(accessCode);
    toast({
      title: "✅ Copié",
      description: `Code d'accès ${accessCode} copié`
    });
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: { color: 'bg-green-500', label: 'Actif' },
      paused: { color: 'bg-yellow-500', label: 'Pause' },
      draft: { color: 'bg-gray-500', label: 'Brouillon' },
      completed: { color: 'bg-blue-500', label: 'Terminé' }
    };
    const { color, label } = config[status as keyof typeof config] || config.draft;
    return <Badge className={`${color} text-white`}>{label}</Badge>;
  };

  const filteredSessions = sessions.filter(session =>
    session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.access_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.client_company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-black text-white mb-2">
            Gestion Multi-Sessions
          </h1>
          <p className="text-lg text-white/70">
            Vue d'ensemble et contrôle de toutes les sessions
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/10 border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/70">Total Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{sessions.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/70">Sessions Actives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">
                {sessions.filter(s => s.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/70">Équipes Connectées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">
                {sessions.reduce((sum, s) => sum + (s.active_teams_count || 0), 0)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/70">Équipes Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">
                {sessions.reduce((sum, s) => sum + (s.total_teams_count || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
            <Input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
          </div>
          <Button
            onClick={createNewSession}
            size="lg"
            className="bg-gradient-to-r from-purple-500 to-pink-500"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouvelle Session
          </Button>
        </div>

        {/* Sessions Table */}
        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center text-white/60 py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                Chargement...
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center text-white/60 py-12">
                <p className="mb-4">Aucune session trouvée</p>
                <Button onClick={createNewSession} variant="outline">
                  <Plus className="w-5 h-5 mr-2" />
                  Créer une session
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/5">
                    <TableHead className="text-white/70">Session</TableHead>
                    <TableHead className="text-white/70">Code</TableHead>
                    <TableHead className="text-white/70">Statut</TableHead>
                    <TableHead className="text-white/70">Type</TableHead>
                    <TableHead className="text-white/70">Équipes</TableHead>
                    <TableHead className="text-white/70">Client</TableHead>
                    <TableHead className="text-white/70">Date</TableHead>
                    <TableHead className="text-white/70 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => (
                    <TableRow key={session.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">
                        {session.name}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyAccessCode(session.access_code)}
                          className="text-white/70 hover:text-white font-mono"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          {session.access_code}
                        </Button>
                      </TableCell>
                      <TableCell>{getStatusBadge(session.status)}</TableCell>
                      <TableCell className="text-white/70 capitalize">{session.session_type}</TableCell>
                      <TableCell className="text-white/70">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {session.active_teams_count} / {session.max_teams}
                        </div>
                      </TableCell>
                      <TableCell className="text-white/70 text-sm">
                        {session.client_company || session.client_name || '-'}
                      </TableCell>
                      <TableCell className="text-white/70 text-sm">
                        {session.event_date
                          ? new Date(session.event_date).toLocaleDateString('fr-FR')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-white/70">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-800 border-white/20">
                            <DropdownMenuLabel className="text-white">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              onClick={() => navigate(`/regie?session=${session.id}`)}
                              className="text-white hover:bg-white/10"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Ouvrir Régie
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/screen?session=${session.id}`)}
                              className="text-white hover:bg-white/10"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Ouvrir Écran
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            {session.status !== 'active' && (
                              <DropdownMenuItem
                                onClick={() => updateSessionStatus(session.id, 'active')}
                                className="text-green-400 hover:bg-white/10"
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Activer
                              </DropdownMenuItem>
                            )}
                            {session.status === 'active' && (
                              <DropdownMenuItem
                                onClick={() => updateSessionStatus(session.id, 'paused')}
                                className="text-yellow-400 hover:bg-white/10"
                              >
                                <Pause className="w-4 h-4 mr-2" />
                                Mettre en pause
                              </DropdownMenuItem>
                            )}
                            {session.status !== 'completed' && (
                              <DropdownMenuItem
                                onClick={() => updateSessionStatus(session.id, 'completed')}
                                className="text-blue-400 hover:bg-white/10"
                              >
                                <Square className="w-4 h-4 mr-2" />
                                Terminer
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              onClick={() => deleteSession(session.id, session.name)}
                              className="text-red-400 hover:bg-white/10"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSessionsDashboard;

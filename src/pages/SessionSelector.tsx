import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Play,
  Pause,
  Users,
  Calendar,
  MapPin,
  Plus,
  Search,
  Trophy,
  Music,
  Zap,
  CheckCircle2,
  Clock,
  Building2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GameSession {
  id: string;
  name: string;
  access_code: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  event_date: string | null;
  event_location: string | null;
  client_name: string | null;
  client_company: string | null;
  session_type: 'quiz' | 'blindtest' | 'mixed';
  max_teams: number;
  branding_primary_color: string;
  branding_secondary_color: string;
  created_at: string;
  connected_teams?: number;
}

const SessionSelector = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState<'active' | 'upcoming' | 'all'>('active');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('active_client_sessions')
        .select('*')
        .order('event_date', { ascending: true, nullsFirst: false });

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
            name: `Nouvelle session ${new Date().toLocaleDateString('fr-FR')}`,
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

      // Navigate to session setup/config page
      navigate(`/admin/sessions/${data.id}/setup`);
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la session",
        variant: "destructive"
      });
    }
  };

  const selectSession = (sessionId: string) => {
    // Store selected session in localStorage for Regie to use
    localStorage.setItem('selected_session_id', sessionId);
    navigate(`/regie?session=${sessionId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'draft': return 'bg-gray-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'draft': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      default: return null;
    }
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'quiz': return <Trophy className="w-5 h-5" />;
      case 'blindtest': return <Music className="w-5 h-5" />;
      case 'mixed': return <Zap className="w-5 h-5" />;
      default: return <Trophy className="w-5 h-5" />;
    }
  };

  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case 'quiz': return 'Quiz';
      case 'blindtest': return 'Blind Test';
      case 'mixed': return 'Mixte';
      default: return type;
    }
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch =
      session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.access_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.client_company?.toLowerCase().includes(searchTerm.toLowerCase());

    if (selectedTab === 'active') {
      return matchesSearch && (session.status === 'active' || session.status === 'paused');
    } else if (selectedTab === 'upcoming') {
      return matchesSearch && session.event_date && new Date(session.event_date) > new Date();
    }
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-black text-white mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            ARENA Live Quiz
          </h1>
          <p className="text-xl text-white/70">Sélectionnez ou créez une session</p>
        </motion.div>

        {/* Actions Bar */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
            <Input
              type="text"
              placeholder="Rechercher par nom, code, client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
          </div>
          <Button
            onClick={createNewSession}
            size="lg"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouvelle Session
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)} className="mb-6">
          <TabsList className="bg-white/10">
            <TabsTrigger value="active">En cours</TabsTrigger>
            <TabsTrigger value="upcoming">À venir</TabsTrigger>
            <TabsTrigger value="all">Toutes</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Sessions Grid */}
        {loading ? (
          <div className="text-center text-white/60 py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            Chargement des sessions...
          </div>
        ) : filteredSessions.length === 0 ? (
          <Card className="bg-white/10 border-white/20">
            <CardContent className="py-12 text-center">
              <p className="text-white/60 text-lg mb-4">Aucune session trouvée</p>
              <Button onClick={createNewSession} variant="outline">
                <Plus className="w-5 h-5 mr-2" />
                Créer votre première session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredSessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="bg-white/10 border-white/20 hover:bg-white/15 transition-all cursor-pointer group"
                    onClick={() => selectSession(session.id)}
                    style={{
                      borderColor: session.branding_primary_color + '40'
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: session.branding_primary_color + '20' }}
                          >
                            {getSessionTypeIcon(session.session_type)}
                          </div>
                          <div>
                            <Badge className={`${getStatusColor(session.status)} text-white mb-1`}>
                              {getStatusIcon(session.status)}
                              <span className="ml-1 capitalize">{session.status}</span>
                            </Badge>
                            <div className="text-xs text-white/60 font-mono">
                              {session.access_code}
                            </div>
                          </div>
                        </div>
                      </div>
                      <CardTitle className="text-white group-hover:text-purple-300 transition-colors">
                        {session.name}
                      </CardTitle>
                      <CardDescription className="text-white/60">
                        {getSessionTypeLabel(session.session_type)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {session.client_company && (
                          <div className="flex items-center gap-2 text-white/70">
                            <Building2 className="w-4 h-4" />
                            <span>{session.client_company}</span>
                          </div>
                        )}
                        {session.event_date && (
                          <div className="flex items-center gap-2 text-white/70">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(session.event_date).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                        )}
                        {session.event_location && (
                          <div className="flex items-center gap-2 text-white/70">
                            <MapPin className="w-4 h-4" />
                            <span>{session.event_location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-white/70 pt-2 border-t border-white/10">
                          <Users className="w-4 h-4" />
                          <span>{session.connected_teams || 0} / {session.max_teams} équipes</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionSelector;

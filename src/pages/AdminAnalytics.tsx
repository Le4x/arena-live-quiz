import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, BarChart3, PieChart, TrendingUp, Users, Target, Clock, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface SessionStats {
  session_id: string;
  session_name: string;
  total_teams: number;
  total_questions: number;
  total_answers: number;
  total_buzzers: number;
  avg_response_time: number;
}

interface QuestionStats {
  question_id: string;
  question_text: string;
  question_type: string;
  total_attempts: number;
  correct_answers: number;
  incorrect_answers: number;
  accuracy_rate: number;
  avg_response_time: number;
}

interface TeamPerformance {
  team_id: string;
  team_name: string;
  score: number;
  total_answers: number;
  correct_answers: number;
  buzzers_count: number;
}

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      loadAnalytics(selectedSessionId);
    }
  }, [selectedSessionId]);

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('id, name, status')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);

      // Auto-select first session
      if (data && data.length > 0) {
        setSelectedSessionId(data[0].id);
      }
    } catch (error: any) {
      console.error('Error loading sessions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les sessions",
        variant: "destructive"
      });
    }
  };

  const loadAnalytics = async (sessionId: string) => {
    setLoading(true);
    try {
      // Load session overview stats
      const { data: session } = await supabase
        .from('game_sessions')
        .select('name')
        .eq('id', sessionId)
        .single();

      const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .eq('game_session_id', sessionId);

      const { data: answers } = await supabase
        .from('team_answers')
        .select('*, question_instances!inner(question_id)')
        .eq('game_session_id', sessionId);

      const { data: buzzers } = await supabase
        .from('buzzer_attempts')
        .select('*')
        .eq('game_session_id', sessionId);

      // Calculate average response time (for answers)
      const responseTimes = answers?.map(a => {
        if (a.answered_at && a.created_at) {
          const diff = new Date(a.answered_at).getTime() - new Date(a.created_at).getTime();
          return diff / 1000; // Convert to seconds
        }
        return 0;
      }).filter(t => t > 0) || [];
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

      setSessionStats({
        session_id: sessionId,
        session_name: session?.name || '',
        total_teams: teams?.length || 0,
        total_questions: 0, // Will be calculated from questions
        total_answers: answers?.length || 0,
        total_buzzers: buzzers?.length || 0,
        avg_response_time: avgResponseTime
      });

      // Load per-question stats
      const { data: questions } = await supabase
        .from('questions')
        .select(`
          id,
          question_text,
          question_type,
          team_answers(
            is_correct,
            answered_at,
            created_at
          )
        `);

      const questionStatsData: QuestionStats[] = questions?.map(q => {
        const questionAnswers = answers?.filter(a =>
          a.question_instances?.question_id === q.id
        ) || [];

        const correct = questionAnswers.filter(a => a.is_correct === true).length;
        const incorrect = questionAnswers.filter(a => a.is_correct === false).length;
        const total = correct + incorrect;

        const times = questionAnswers.map(a => {
          if (a.answered_at && a.created_at) {
            const diff = new Date(a.answered_at).getTime() - new Date(a.created_at).getTime();
            return diff / 1000;
          }
          return 0;
        }).filter(t => t > 0);

        const avgTime = times.length > 0
          ? times.reduce((a, b) => a + b, 0) / times.length
          : 0;

        return {
          question_id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          total_attempts: total,
          correct_answers: correct,
          incorrect_answers: incorrect,
          accuracy_rate: total > 0 ? (correct / total) * 100 : 0,
          avg_response_time: avgTime
        };
      }).filter(q => q.total_attempts > 0) || [];

      setQuestionStats(questionStatsData);

      // Load team performance
      const teamPerf: TeamPerformance[] = teams?.map(team => {
        const teamAnswers = answers?.filter(a => a.team_id === team.id) || [];
        const correctAnswers = teamAnswers.filter(a => a.is_correct === true).length;
        const teamBuzzers = buzzers?.filter(b => b.team_id === team.id).length || 0;

        return {
          team_id: team.id,
          team_name: team.name,
          score: team.score || 0,
          total_answers: teamAnswers.length,
          correct_answers: correctAnswers,
          buzzers_count: teamBuzzers
        };
      }) || [];

      setTeamPerformance(teamPerf.sort((a, b) => b.score - a.score));

    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!sessionStats) return;

    // Export question stats
    const csvLines = [
      ['Question', 'Type', 'Total tentatives', 'Bonnes réponses', 'Mauvaises réponses', 'Taux de réussite (%)', 'Temps moyen (s)'].join(','),
      ...questionStats.map(q => [
        `"${q.question_text.replace(/"/g, '""')}"`,
        q.question_type,
        q.total_attempts,
        q.correct_answers,
        q.incorrect_answers,
        q.accuracy_rate.toFixed(2),
        q.avg_response_time.toFixed(2)
      ].join(','))
    ];

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_${sessionStats.session_name.replace(/\s+/g, '_')}_${Date.now()}.csv`;
    link.click();

    toast({
      title: "Export réussi",
      description: "Les statistiques ont été exportées en CSV"
    });
  };

  const exportToJSON = () => {
    if (!sessionStats) return;

    const jsonData = {
      session: sessionStats,
      questions: questionStats,
      teams: teamPerformance,
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_${sessionStats.session_name.replace(/\s+/g, '_')}_${Date.now()}.json`;
    link.click();

    toast({
      title: "Export réussi",
      description: "Les statistiques ont été exportées en JSON"
    });
  };

  // Prepare chart data
  const questionAccuracyData = questionStats.map(q => ({
    name: q.question_text.length > 30 ? q.question_text.substring(0, 30) + '...' : q.question_text,
    'Taux de réussite': q.accuracy_rate,
    'Tentatives': q.total_attempts
  }));

  const questionTypeDistribution = questionStats.reduce((acc, q) => {
    const type = q.question_type;
    if (!acc[type]) {
      acc[type] = { name: type, value: 0 };
    }
    acc[type].value++;
    return acc;
  }, {} as Record<string, { name: string; value: number }>);

  const teamScoreData = teamPerformance.map(t => ({
    name: t.team_name,
    Score: t.score,
    'Bonnes réponses': t.correct_answers
  }));

  return (
    <div className="min-h-screen bg-gradient-glow p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between py-8">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-arena bg-clip-text text-transparent">
              Statistiques & Analytics
            </h1>
            <p className="text-muted-foreground text-xl mt-2">
              Analysez les performances et exportez les données
            </p>
          </div>
          <Button onClick={() => navigate('/admin')} variant="outline" size="lg">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Retour
          </Button>
        </header>

        {/* Session selector and export buttons */}
        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <label className="text-sm font-medium">Session:</label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Sélectionner une session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map(session => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.name} ({session.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={exportToCSV}
                disabled={!sessionStats || questionStats.length === 0}
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button
                onClick={exportToJSON}
                disabled={!sessionStats || questionStats.length === 0}
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export JSON
              </Button>
            </div>
          </div>
        </Card>

        {loading ? (
          <Card className="p-12 text-center">
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Chargement des statistiques...
            </div>
          </Card>
        ) : !sessionStats ? (
          <Card className="p-12 text-center">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Sélectionnez une session</h3>
            <p className="text-muted-foreground">
              Choisissez une session pour afficher les statistiques
            </p>
          </Card>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Équipes</p>
                    <p className="text-2xl font-bold">{sessionStats.total_teams}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <Target className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Réponses totales</p>
                    <p className="text-2xl font-bold">{sessionStats.total_answers}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-yellow-500/10">
                    <Zap className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Buzzers</p>
                    <p className="text-2xl font-bold">{sessionStats.total_buzzers}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <Clock className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Temps moyen</p>
                    <p className="text-2xl font-bold">{sessionStats.avg_response_time.toFixed(1)}s</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Charts */}
            <Tabs defaultValue="questions" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="questions">Questions</TabsTrigger>
                <TabsTrigger value="teams">Équipes</TabsTrigger>
                <TabsTrigger value="types">Types</TabsTrigger>
              </TabsList>

              {/* Questions Tab */}
              <TabsContent value="questions" className="space-y-6">
                {/* Question Accuracy Chart */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Taux de réussite par question</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={questionAccuracyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Taux de réussite" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Question Stats Table */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Détails par question</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Question</th>
                          <th className="text-left p-2">Type</th>
                          <th className="text-center p-2">Tentatives</th>
                          <th className="text-center p-2">Bonnes</th>
                          <th className="text-center p-2">Mauvaises</th>
                          <th className="text-center p-2">Taux réussite</th>
                          <th className="text-center p-2">Temps moyen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {questionStats.map(q => (
                          <tr key={q.question_id} className="border-b hover:bg-muted/50">
                            <td className="p-2 max-w-xs truncate">{q.question_text}</td>
                            <td className="p-2">
                              <span className="px-2 py-1 rounded text-xs bg-primary/10">
                                {q.question_type}
                              </span>
                            </td>
                            <td className="text-center p-2">{q.total_attempts}</td>
                            <td className="text-center p-2 text-green-600">{q.correct_answers}</td>
                            <td className="text-center p-2 text-red-600">{q.incorrect_answers}</td>
                            <td className="text-center p-2 font-semibold">
                              {q.accuracy_rate.toFixed(1)}%
                            </td>
                            <td className="text-center p-2">{q.avg_response_time.toFixed(1)}s</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </TabsContent>

              {/* Teams Tab */}
              <TabsContent value="teams" className="space-y-6">
                {/* Team Scores Chart */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Scores des équipes</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={teamScoreData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Score" fill="#10b981" />
                      <Bar dataKey="Bonnes réponses" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Team Performance Table */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Performance des équipes</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Rang</th>
                          <th className="text-left p-2">Équipe</th>
                          <th className="text-center p-2">Score</th>
                          <th className="text-center p-2">Réponses totales</th>
                          <th className="text-center p-2">Bonnes réponses</th>
                          <th className="text-center p-2">Buzzers</th>
                          <th className="text-center p-2">Taux réussite</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamPerformance.map((team, idx) => (
                          <tr key={team.team_id} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-bold">#{idx + 1}</td>
                            <td className="p-2">{team.team_name}</td>
                            <td className="text-center p-2 font-bold text-primary">{team.score}</td>
                            <td className="text-center p-2">{team.total_answers}</td>
                            <td className="text-center p-2 text-green-600">{team.correct_answers}</td>
                            <td className="text-center p-2">{team.buzzers_count}</td>
                            <td className="text-center p-2">
                              {team.total_answers > 0
                                ? ((team.correct_answers / team.total_answers) * 100).toFixed(1)
                                : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </TabsContent>

              {/* Types Tab */}
              <TabsContent value="types" className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Distribution par type de question</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <RechartsPie>
                      <Pie
                        data={Object.values(questionTypeDistribution)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name} (${entry.value})`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.values(questionTypeDistribution).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Users, Timer, Radio, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AudioDeck } from "@/components/audio/AudioDeck";
import { getAudioEngine, type Track } from "@/lib/audio/AudioEngine";
import { gameEvents } from "@/lib/runtime/GameEvents";
import type { SoundWithCues } from "@/pages/AdminSounds";

const Regie = () => {
  const { toast } = useToast();
  const audioEngine = getAudioEngine();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [connectedTeams, setConnectedTeams] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [currentQuestionInstanceId, setCurrentQuestionInstanceId] = useState<string | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(30);
  const [audioTracks, setAudioTracks] = useState<Track[]>([]);
  const [buzzerLocked, setBuzzerLocked] = useState(false);

  useEffect(() => {
    loadActiveSession();
    loadRounds();
    loadQuestions();
    loadTeams();
    loadAudioTracks();
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const stateChannel = supabase.channel('game-state-regie')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state', filter: `game_session_id=eq.${sessionId}` }, loadGameState)
      .subscribe();
    loadGameState();
    return () => { supabase.removeChannel(stateChannel); };
  }, [sessionId]);

  useEffect(() => {
    if (!timerActive || timerRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimerRemaining(prev => {
        const next = prev - 1;
        if (next <= 0) { setTimerActive(false); audioEngine.stopWithFade(300); toast({ title: '⏱️ Temps écoulé' }); }
        return Math.max(0, next);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timerRemaining]);

  const loadActiveSession = async () => {
    const { data } = await supabase.from('game_sessions').select('*').eq('status', 'active').single();
    if (data) setSessionId(data.id);
  };

  const loadGameState = async () => {
    if (!sessionId) return;
    const { data } = await supabase.from('game_state').select('*').eq('game_session_id', sessionId).single();
    if (data) setGameState(data);
  };

  const loadRounds = async () => {
    const { data } = await supabase.from('rounds').select('*').order('created_at');
    if (data) setRounds(data);
  };

  const loadQuestions = async () => {
    const { data } = await supabase.from('questions').select('*').order('display_order');
    if (data) setQuestions(data);
  };

  const loadTeams = async () => {
    const { data } = await supabase.from('teams').select('*').eq('is_active', true).order('name');
    if (data) setConnectedTeams(data);
  };

  const loadAudioTracks = () => {
    const stored = localStorage.getItem('arena_sounds');
    if (stored) {
      try {
        const sounds: SoundWithCues[] = JSON.parse(stored);
        setAudioTracks(sounds.map(s => ({ id: s.id, name: s.name, url: s.url, cues: [{ label: 'Extrait', time: s.cue1_time }, { label: 'Solution', time: s.cue2_time }] })));
      } catch { setAudioTracks([]); }
    }
  };

  const startQuestion = async (question: any) => {
    const instanceId = crypto.randomUUID();
    setCurrentQuestionId(question.id);
    setCurrentQuestionInstanceId(instanceId);
    setCurrentRoundId(question.round_id);
    
    // Créer l'instance dans la BD
    await supabase.from('question_instances').insert({
      id: instanceId,
      question_id: question.id,
      game_session_id: sessionId,
      started_at: new Date().toISOString()
    });
    
    await supabase.from('game_state').update({ 
      current_question_id: question.id, 
      current_question_instance_id: instanceId, 
      current_round_id: question.round_id, 
      is_buzzer_active: true, 
      timer_active: false, 
      show_leaderboard: false, 
      answer_result: null 
    }).eq('game_session_id', sessionId);
    
    setBuzzerLocked(false);
    await gameEvents.startQuestion(question.id, instanceId, sessionId!);
    
    if (question.audio_url) {
      const sound = audioTracks.find(t => t.url === question.audio_url);
      if (sound) { 
        await audioEngine.loadAndPlay(sound); 
        await audioEngine.playClip30s(300); 
        const round = rounds.find(r => r.id === question.round_id); 
        setTimerRemaining(round?.timer_duration || 30); 
        setTimerActive(true); 
      }
    }
    toast({ title: '🎬 Question lancée' });
  };

  const handleWrongAnswer = async () => {
    await supabase.from('game_state').update({ answer_result: 'incorrect' }).eq('game_session_id', sessionId);
    setTimeout(async () => {
      await gameEvents.resetBuzzer(currentQuestionInstanceId!);
      setBuzzerLocked(false);
      await supabase.from('game_state').update({ is_buzzer_active: true, answer_result: null }).eq('game_session_id', sessionId);
      const currentPos = audioEngine.getPosition();
      if (currentPos < 30) { const q = questions.find(x => x.id === currentQuestionId); if (q?.audio_url) { const s = audioTracks.find(t => t.url === q.audio_url); if (s) await audioEngine.loadAndPlay(s, currentPos); } setTimerActive(true); }
      toast({ title: '❌ Mauvaise - Reprise' });
    }, 2000);
  };

  const handleCorrectAnswer = async () => {
    await supabase.from('game_state').update({ answer_result: 'correct', is_buzzer_active: false, timer_active: false }).eq('game_session_id', sessionId);
    const q = questions.find(x => x.id === currentQuestionId);
    if (q?.audio_url) { const s = audioTracks.find(t => t.url === q.audio_url); if (s) { await audioEngine.loadAndPlay(s); await audioEngine.playSolution(8, 300, 300); } }
    setTimeout(async () => { await supabase.from('game_state').update({ answer_result: null }).eq('game_session_id', sessionId); toast({ title: '✅ Correcte' }); }, 3000);
  };

  const roundQuestions = currentRoundId ? questions.filter(q => q.round_id === currentRoundId) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-3">
      <div className="max-w-[1400px] mx-auto space-y-3">
        <Card className="p-3 bg-card/90 backdrop-blur border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-arena bg-clip-text text-transparent">Régie TV</h1>
              <Badge variant="outline" className="gap-2"><Users className="h-3 w-3" />{connectedTeams.length} équipes</Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => window.open('/screen', '_blank')}>📺 Écran</Button>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card/95 backdrop-blur border-accent/30">
          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-4 flex items-center gap-2">
              <Music className="h-4 w-4" />
              <Button size="sm" variant="outline" onClick={() => { const q = questions.find(x => x.id === currentQuestionId); if (q?.audio_url) { const t = audioTracks.find(x => x.url === q.audio_url); if (t) { audioEngine.loadAndPlay(t); audioEngine.playClip30s(300); } } }}>Extrait 30s</Button>
              <Button size="sm" variant="outline" onClick={() => { const q = questions.find(x => x.id === currentQuestionId); if (q?.audio_url) { const t = audioTracks.find(x => x.url === q.audio_url); if (t) { audioEngine.loadAndPlay(t); audioEngine.playSolution(8, 300, 300); } } }}>Solution</Button>
            </div>
            <div className="col-span-3 flex items-center gap-2">
              <Timer className="h-4 w-4" />
              <div className={`text-xl font-mono font-bold ${timerRemaining <= 5 ? 'text-destructive' : ''}`}>{timerRemaining}s</div>
              <Button size="sm" onClick={() => setTimerActive(!timerActive)}>{timerActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}</Button>
              <Button size="sm" variant="ghost" onClick={() => { setTimerRemaining(30); setTimerActive(false); }}><RotateCcw className="h-3 w-3" /></Button>
            </div>
            <div className="col-span-5 flex items-center gap-2">
              <Radio className="h-4 w-4" />
              <Button size="sm" onClick={() => { setBuzzerLocked(true); setTimerActive(false); audioEngine.stopWithFade(300); }} disabled={buzzerLocked}>{buzzerLocked ? 'BUZZÉ' : 'Buzz'}</Button>
              <Button size="sm" onClick={handleWrongAnswer}>❌</Button>
              <Button size="sm" onClick={handleCorrectAnswer}>✅</Button>
              <Button size="sm" variant="ghost" onClick={async () => { await gameEvents.resetBuzzer(currentQuestionInstanceId || ''); setBuzzerLocked(false); }}>Reset</Button>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="questions">
          <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="questions">Questions</TabsTrigger><TabsTrigger value="audio">Audio</TabsTrigger><TabsTrigger value="teams">Équipes</TabsTrigger></TabsList>
          <TabsContent value="questions"><Card className="p-4"><div className="grid grid-cols-4 gap-2 mb-4">{rounds.map(r => <Button key={r.id} variant={currentRoundId === r.id ? 'default' : 'outline'} size="sm" onClick={() => setCurrentRoundId(r.id)}>{r.title}</Button>)}</div><div className="space-y-2 max-h-96 overflow-y-auto">{roundQuestions.map(q => <div key={q.id} className="flex justify-between p-3 border rounded"><div><div className="font-semibold">{q.question_text}</div><div className="text-xs text-muted-foreground">{q.points} pts</div></div><Button size="sm" onClick={() => startQuestion(q)}>Lancer</Button></div>)}</div></Card></TabsContent>
          <TabsContent value="audio"><AudioDeck tracks={audioTracks} /></TabsContent>
          <TabsContent value="teams"><Card className="p-4"><div className="space-y-2">{connectedTeams.map(t => <div key={t.id} className="flex justify-between p-3 border rounded"><div className="flex gap-2 items-center"><div className="w-6 h-6 rounded-full" style={{backgroundColor: t.color}} /><div><div className="font-bold">{t.name}</div><div className="text-xs">{t.score} pts</div></div></div></div>)}</div></Card></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Regie;

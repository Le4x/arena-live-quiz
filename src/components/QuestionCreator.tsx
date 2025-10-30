import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Music, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SoundWithCues } from "@/pages/AdminSounds";

interface QuestionCreatorProps {
  rounds: any[];
  onQuestionCreated: () => void;
}

export const QuestionCreator = ({ rounds, onQuestionCreated }: QuestionCreatorProps) => {
  const { toast } = useToast();
  const [roundId, setRoundId] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("blind_test");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [points, setPoints] = useState(10);
  const [penaltyPoints, setPenaltyPoints] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [selectedSoundId, setSelectedSoundId] = useState("");
  const [availableSounds, setAvailableSounds] = useState<SoundWithCues[]>([]);
  const [options, setOptions] = useState({ A: "", B: "", C: "", D: "" });
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Charger les sons depuis localStorage
    const stored = localStorage.getItem('arena_sounds');
    if (stored) {
      try {
        setAvailableSounds(JSON.parse(stored));
      } catch {
        setAvailableSounds([]);
      }
    }
  }, []);

  const createQuestion = async () => {
    if (!roundId || !questionText.trim()) {
      toast({ title: "Erreur", description: "Manche et question requises", variant: "destructive" });
      return;
    }

    // Récupérer les cue points si un son est sélectionné
    const selectedSound = availableSounds.find(s => s.id === selectedSoundId);
    const cuePoints = selectedSound ? {
      search: { start: selectedSound.cue1_time, end: selectedSound.cue1_time + 30 },
      solution: { start: selectedSound.cue2_time, end: selectedSound.cue2_time + selectedSound.solution_duration }
    } : undefined;

    const questionData = {
      round_id: roundId,
      question_text: questionText,
      question_type: questionType,
      correct_answer: correctAnswer,
      points,
      penalty_points: penaltyPoints,
      audio_url: selectedSound?.url || audioUrl || null,
      cue_points: cuePoints ? JSON.stringify(cuePoints) : null,
      options: questionType === 'qcm' ? JSON.stringify(options) : null
    };

    const { error } = await supabase.from('questions').insert([questionData]);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer la question", variant: "destructive" });
    } else {
      toast({ title: "Question créée !", description: "La question a été ajoutée" });
      setQuestionText("");
      setCorrectAnswer("");
      setPoints(10);
      setPenaltyPoints(0);
      setAudioUrl("");
      setSelectedSoundId("");
      setOptions({ A: "", B: "", C: "", D: "" });
      onQuestionCreated();
    }
  };

  return (
    <Card className="p-6 bg-card/80 backdrop-blur-sm border-secondary/20">
      <h3 className="text-xl font-bold text-secondary mb-4">Ajouter une question</h3>
      <div className="space-y-4">
        <div>
          <Label>Manche</Label>
          <Select value={roundId} onValueChange={setRoundId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Sélectionner une manche" />
            </SelectTrigger>
            <SelectContent>
              {rounds.map((round) => (
                <SelectItem key={round.id} value={round.id}>
                  {round.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label>Type de question</Label>
          <Select value={questionType} onValueChange={setQuestionType}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blind_test">Blind Test</SelectItem>
              <SelectItem value="qcm">QCM</SelectItem>
              <SelectItem value="free_text">Réponse libre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Question</Label>
          <Textarea
            placeholder="Quel est le titre de cette chanson ?"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="mt-1"
          />
        </div>

        {questionType === 'qcm' && (
          <div className="space-y-2">
            <Label>Options de réponse</Label>
            {Object.keys(options).map((key) => (
              <Input
                key={key}
                placeholder={`Option ${key}`}
                value={options[key as keyof typeof options]}
                onChange={(e) => setOptions({ ...options, [key]: e.target.value })}
              />
            ))}
          </div>
        )}

        <div>
          <Label>Réponse correcte</Label>
          <Input
            placeholder="La bonne réponse"
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-base font-semibold flex items-center gap-2">
            <Music className="h-4 w-4" />
            Son depuis la banque ({availableSounds.length} disponibles)
          </Label>
          {availableSounds.length === 0 ? (
            <div className="mt-2 p-3 bg-muted/50 border border-border rounded-lg">
              <p className="text-sm text-muted-foreground">
                Aucun son disponible. Allez dans <strong>Admin &gt; Banque de sons</strong> pour uploader vos fichiers MP3.
              </p>
            </div>
          ) : (
            <>
              <Select value={selectedSoundId} onValueChange={(id) => {
                setSelectedSoundId(id);
                const sound = availableSounds.find(s => s.id === id);
                if (sound) {
                  setAudioUrl(sound.url);
                  toast({ 
                    title: "🎵 Son sélectionné", 
                    description: sound.name 
                  });
                }
              }}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="🎵 Choisir un son depuis la banque..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSounds.map((sound) => (
                    <SelectItem key={sound.id} value={sound.id}>
                      🎵 {sound.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSoundId && (
                <div className="mt-2 p-2 bg-accent/10 border border-accent/20 rounded text-sm">
                  ✅ Son sélectionné : <strong>{availableSounds.find(s => s.id === selectedSoundId)?.name}</strong>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                💡 Les CUE points (extrait/solution) seront automatiquement appliqués
              </p>
            </>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <Label className="text-sm font-normal text-muted-foreground">
            Ou entrez une URL audio manuellement
          </Label>
          <div className="flex gap-2 mt-1">
            <Input
              placeholder="https://example.com/music.mp3"
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
            />
            {audioUrl && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause();
                  }
                }}
              >
                <Music className="h-4 w-4" />
              </Button>
            )}
          </div>
          <audio ref={audioRef} src={audioUrl} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Points gagnés</Label>
            <Input
              type="number"
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value))}
              className="mt-1"
              min="1"
            />
          </div>
          <div>
            <Label>Points perdus (0 = aucune pénalité)</Label>
            <Input
              type="number"
              value={penaltyPoints}
              onChange={(e) => setPenaltyPoints(parseInt(e.target.value))}
              className="mt-1"
              min="0"
            />
          </div>
        </div>

        <Button onClick={createQuestion} className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">
          <PlusCircle className="mr-2 h-5 w-5" />
          Ajouter la question
        </Button>
      </div>
    </Card>
  );
};

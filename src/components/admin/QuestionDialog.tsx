import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SoundWithCues } from "@/pages/AdminSounds";

interface QuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: any | null;
  rounds: any[];
  onSave: () => void;
}

export const QuestionDialog = ({ open, onOpenChange, question, rounds, onSave }: QuestionDialogProps) => {
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
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    if (question) {
      // Si question a un ID, c'est une édition, sinon c'est une création avec round pré-sélectionné
      setRoundId(question.round_id || "");
      setQuestionText(question.question_text || "");
      setQuestionType(question.question_type || "blind_test");
      setCorrectAnswer(question.correct_answer || "");
      setPoints(question.points || 10);
      setPenaltyPoints(question.penalty_points || 0);
      setAudioUrl(question.audio_url || "");
      
      // Trouver le son correspondant
      if (question.audio_url) {
        const sound = availableSounds.find(s => s.url === question.audio_url);
        setSelectedSoundId(sound?.id || "");
      }
      
      // Parser les options QCM
      if (question.options) {
        try {
          const parsedOptions = typeof question.options === 'string' 
            ? JSON.parse(question.options) 
            : question.options;
          setOptions(parsedOptions);
        } catch {
          setOptions({ A: "", B: "", C: "", D: "" });
        }
      } else {
        setOptions({ A: "", B: "", C: "", D: "" });
      }
    } else {
      // Reset pour création
      setRoundId("");
      setQuestionText("");
      setQuestionType("blind_test");
      setCorrectAnswer("");
      setPoints(10);
      setPenaltyPoints(0);
      setAudioUrl("");
      setSelectedSoundId("");
      setOptions({ A: "", B: "", C: "", D: "" });
    }
  }, [question, open, availableSounds]);

  const handleSave = async () => {
    if (!roundId || !questionText.trim()) {
      toast({
        title: "Erreur",
        description: "Manche et question sont requis",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      // Récupérer les cue points si un son est sélectionné
      const selectedSound = availableSounds.find(s => s.id === selectedSoundId);
      const cuePoints = selectedSound ? {
        search: { start: selectedSound.cue1_time, end: selectedSound.cue1_time + 30 },
        solution: { start: selectedSound.cue2_time, end: selectedSound.cue2_time + selectedSound.solution_duration }
      } : undefined;

      const questionData = {
        round_id: roundId,
        question_text: questionText.trim(),
        question_type: questionType,
        correct_answer: correctAnswer.trim() || null,
        points,
        penalty_points: penaltyPoints,
        audio_url: selectedSound?.url || audioUrl || null,
        cue_points: cuePoints ? JSON.stringify(cuePoints) : null,
        options: questionType === 'qcm' ? JSON.stringify(options) : null
      };

      if (question) {
        // Mise à jour
        const { error } = await supabase
          .from('questions')
          .update(questionData)
          .eq('id', question.id);

        if (error) throw error;

        toast({
          title: "Question mise à jour",
          description: "La question a été mise à jour avec succès"
        });
      } else {
        // Création
        const { error } = await supabase
          .from('questions')
          .insert([questionData]);

        if (error) throw error;

        toast({
          title: "Question créée",
          description: "La question a été créée avec succès"
        });
      }

      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {question ? "Modifier la question" : "Nouvelle question"}
          </DialogTitle>
          <DialogDescription>
            {question 
              ? "Modifiez les informations de la question"
              : "Créez une nouvelle question pour une manche"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="round">Manche *</Label>
            <Select value={roundId} onValueChange={setRoundId} disabled={saving}>
              <SelectTrigger id="round">
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

          <div className="space-y-2">
            <Label htmlFor="type">Type de question *</Label>
            <Select value={questionType} onValueChange={setQuestionType} disabled={saving}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blind_test">🎵 Blind Test</SelectItem>
                <SelectItem value="qcm">📋 QCM</SelectItem>
                <SelectItem value="free_text">✍️ Réponse libre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="question">Question *</Label>
            <Textarea
              id="question"
              placeholder="Quel est le titre de cette chanson ?"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              disabled={saving}
              rows={3}
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
                  disabled={saving}
                />
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="answer">Réponse correcte</Label>
            <Input
              id="answer"
              placeholder="La bonne réponse"
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              disabled={saving}
            />
          </div>

          {questionType === 'blind_test' && availableSounds.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="sound">Son depuis la banque</Label>
              <Select value={selectedSoundId} onValueChange={(id) => {
                setSelectedSoundId(id);
                const sound = availableSounds.find(s => s.id === id);
                if (sound) setAudioUrl(sound.url);
              }} disabled={saving}>
                <SelectTrigger id="sound">
                  <SelectValue placeholder="🎵 Choisir un son..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSounds.map((sound) => (
                    <SelectItem key={sound.id} value={sound.id}>
                      <div className="flex items-center gap-2">
                        <Music className="h-4 w-4" />
                        {sound.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="points">Points gagnés</Label>
              <Input
                id="points"
                type="number"
                min="1"
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 10)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="penalty">Points perdus</Label>
              <Input
                id="penalty"
                type="number"
                min="0"
                value={penaltyPoints}
                onChange={(e) => setPenaltyPoints(parseInt(e.target.value) || 0)}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">0 = aucune pénalité</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              question ? "Mettre à jour" : "Créer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

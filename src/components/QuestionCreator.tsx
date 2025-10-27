import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Music, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [audioUrl, setAudioUrl] = useState("");
  const [options, setOptions] = useState({ A: "", B: "", C: "", D: "" });
  const audioRef = useRef<HTMLAudioElement>(null);

  const createQuestion = async () => {
    if (!roundId || !questionText.trim()) {
      toast({ title: "Erreur", description: "Manche et question requises", variant: "destructive" });
      return;
    }

    const questionData = {
      round_id: roundId,
      question_text: questionText,
      question_type: questionType,
      correct_answer: correctAnswer,
      points,
      audio_url: audioUrl || null,
      options: questionType === 'qcm' ? JSON.stringify(options) : null
    };

    const { error } = await supabase.from('questions').insert([questionData]);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer la question", variant: "destructive" });
    } else {
      toast({ title: "Question créée !", description: "La question a été ajoutée" });
      setQuestionText("");
      setCorrectAnswer("");
      setAudioUrl("");
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
          <Label>URL Audio (optionnel)</Label>
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

        <div>
          <Label>Points</Label>
          <Input
            type="number"
            value={points}
            onChange={(e) => setPoints(parseInt(e.target.value))}
            className="mt-1"
          />
        </div>

        <Button onClick={createQuestion} className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">
          <PlusCircle className="mr-2 h-5 w-5" />
          Ajouter la question
        </Button>
      </div>
    </Card>
  );
};

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Music, PlusCircle, Image as ImageIcon, Upload, X } from "lucide-react";
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: "Erreur", description: "Veuillez sélectionner une image", variant: "destructive" });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    setUploading(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('question-images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('question-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible d'uploader l'image", variant: "destructive" });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const createQuestion = async () => {
    if (!roundId || !questionText.trim()) {
      toast({ title: "Erreur", description: "Manche et question requises", variant: "destructive" });
      return;
    }

    // Vérifier qu'il y a au moins 2 options remplies pour les QCM
    if (questionType === 'qcm') {
      const filledOptionsCount = Object.values(options).filter(v => v.trim() !== '').length;
      if (filledOptionsCount < 2) {
        toast({ 
          title: "Erreur", 
          description: "Un QCM doit avoir au moins 2 options de réponse", 
          variant: "destructive" 
        });
        return;
      }
    }

    setUploading(true);
    try {
      // Upload image si présente
      const imageUrl = await uploadImage();

      // Récupérer les cue points si un son est sélectionné
      const selectedSound = availableSounds.find(s => s.id === selectedSoundId);
      const cuePoints = selectedSound ? {
        search: { start: selectedSound.cue1_time, end: selectedSound.cue1_time + 30 },
        solution: { start: selectedSound.cue2_time, end: selectedSound.cue2_time + selectedSound.solution_duration }
      } : undefined;

      // Filtrer les options vides pour les QCM
      const filteredOptions = questionType === 'qcm' 
        ? Object.fromEntries(
            Object.entries(options).filter(([_, value]) => value.trim() !== '')
          )
        : null;

      const questionData = {
        round_id: roundId,
        question_text: questionText,
        question_type: questionType,
        correct_answer: correctAnswer,
        points,
        penalty_points: penaltyPoints,
        audio_url: selectedSound?.url || audioUrl || null,
        image_url: imageUrl,
        cue_points: cuePoints ? JSON.stringify(cuePoints) : null,
        options: filteredOptions ? JSON.stringify(filteredOptions) : null
      };

      const { error } = await supabase.from('questions').insert([questionData]);

      if (error) throw error;

      toast({ title: "Question créée !", description: "La question a été ajoutée" });
      setQuestionText("");
      setCorrectAnswer("");
      setPoints(10);
      setPenaltyPoints(0);
      setAudioUrl("");
      setSelectedSoundId("");
      setImageFile(null);
      setImagePreview(null);
      setOptions({ A: "", B: "", C: "", D: "" });
      onQuestionCreated();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
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
            <ImageIcon className="h-4 w-4" />
            Image (optionnelle)
          </Label>
          <div className="mt-2 space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Aperçu" className="w-full h-48 object-cover rounded-lg border border-border" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Upload className="mr-2 h-4 w-4" />
                Choisir une image
              </Button>
            )}
          </div>
        </div>

        <div>
          <Label className="text-base font-semibold flex items-center gap-2">
            <Music className="h-4 w-4" />
            Son (optionnel)
          </Label>
          {availableSounds.length > 0 ? (
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
              {questionType === 'blind_test' && (
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Les CUE points (extrait/solution) seront automatiquement appliqués
                </p>
              )}
            </>
          ) : (
            <div className="mt-2 p-3 bg-muted rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">
                ⚠️ Aucun son disponible. Veuillez d'abord ajouter des sons dans la section "Sons" de l'administration.
              </p>
            </div>
          )}

          <div className="mt-4">
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

        <Button onClick={createQuestion} disabled={uploading} className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">
          <PlusCircle className="mr-2 h-5 w-5" />
          {uploading ? "Upload en cours..." : "Ajouter la question"}
        </Button>
      </div>
    </Card>
  );
};

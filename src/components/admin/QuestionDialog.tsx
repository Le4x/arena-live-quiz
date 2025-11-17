import { useState, useEffect, useRef } from "react";
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
import { Loader2, Music, Image as ImageIcon, Upload, X } from "lucide-react";
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [showTemplateSave, setShowTemplateSave] = useState(false);

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

    // Charger les templates depuis localStorage
    const storedTemplates = localStorage.getItem('arena_question_templates');
    if (storedTemplates) {
      try {
        setTemplates(JSON.parse(storedTemplates));
      } catch {
        setTemplates([]);
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
      setExistingImageUrl(question.image_url || null);
      setImagePreview(question.image_url || null);
      
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
      setImageFile(null);
      setImagePreview(null);
      setExistingImageUrl(null);
    }
  }, [question, open, availableSounds]);

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

  const saveAsTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nom pour le template",
        variant: "destructive"
      });
      return;
    }

    const template = {
      id: Date.now().toString(),
      name: templateName,
      questionType,
      correctAnswer,
      points,
      penaltyPoints,
      options: questionType === 'qcm' ? options : null,
      createdAt: new Date().toISOString()
    };

    const updatedTemplates = [...templates, template];
    setTemplates(updatedTemplates);
    localStorage.setItem('arena_question_templates', JSON.stringify(updatedTemplates));

    toast({
      title: "Template sauvegardé",
      description: `Le template "${templateName}" a été créé`
    });

    setTemplateName("");
    setShowTemplateSave(false);
  };

  const loadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    setQuestionType(template.questionType);
    setCorrectAnswer(template.correctAnswer);
    setPoints(template.points);
    setPenaltyPoints(template.penaltyPoints);
    if (template.options) {
      setOptions(template.options);
    }

    toast({
      title: "Template chargé",
      description: `Le template "${template.name}" a été appliqué`
    });
  };

  const deleteTemplate = (templateId: string) => {
    const updatedTemplates = templates.filter(t => t.id !== templateId);
    setTemplates(updatedTemplates);
    localStorage.setItem('arena_question_templates', JSON.stringify(updatedTemplates));

    toast({
      title: "Template supprimé",
      description: "Le template a été supprimé"
    });
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return existingImageUrl;

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
      return existingImageUrl;
    }
  };

  const handleSave = async () => {
    // Validation de base
    if (!roundId || !questionText.trim()) {
      toast({
        title: "Erreur",
        description: "Manche et question sont requis",
        variant: "destructive"
      });
      return;
    }

    // Validation des points
    if (points <= 0) {
      toast({
        title: "Erreur",
        description: "Les points doivent être supérieurs à 0",
        variant: "destructive"
      });
      return;
    }

    // Validation spécifique aux blind tests
    if (questionType === 'blind_test') {
      if (!selectedSoundId && !audioUrl.trim()) {
        toast({
          title: "Erreur",
          description: "Un blind test nécessite un extrait audio",
          variant: "destructive"
        });
        return;
      }
      if (!correctAnswer.trim()) {
        toast({
          title: "Erreur",
          description: "La réponse correcte est requise",
          variant: "destructive"
        });
        return;
      }
    }

    // Validation spécifique aux QCM
    if (questionType === 'qcm') {
      const filledOptions = Object.entries(options).filter(([_, v]) => v.trim() !== '');
      const filledOptionsCount = filledOptions.length;

      if (filledOptionsCount < 2) {
        toast({
          title: "Erreur",
          description: "Un QCM doit avoir au moins 2 options de réponse",
          variant: "destructive"
        });
        return;
      }

      if (!correctAnswer.trim()) {
        toast({
          title: "Erreur",
          description: "La réponse correcte est requise pour un QCM",
          variant: "destructive"
        });
        return;
      }

      // Vérifier que la réponse correcte correspond à une des options
      const correctAnswerKey = correctAnswer.toUpperCase();
      if (!filledOptions.some(([key, _]) => key === correctAnswerKey)) {
        toast({
          title: "Erreur",
          description: `La réponse correcte (${correctAnswerKey}) doit correspondre à une option remplie`,
          variant: "destructive"
        });
        return;
      }
    }

    // Validation spécifique aux questions texte
    if (questionType === 'text') {
      if (!correctAnswer.trim()) {
        toast({
          title: "Erreur",
          description: "La réponse correcte est requise",
          variant: "destructive"
        });
        return;
      }
    }

    setSaving(true);
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
        question_text: questionText.trim(),
        question_type: questionType,
        correct_answer: correctAnswer.trim() || null,
        points,
        penalty_points: penaltyPoints,
        audio_url: selectedSound?.url || audioUrl || null,
        image_url: imageUrl,
        cue_points: cuePoints ? JSON.stringify(cuePoints) : null,
        options: filteredOptions ? JSON.stringify(filteredOptions) : null
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

        {/* Template Management */}
        {!question && (
          <div className="bg-muted/50 p-4 rounded-lg space-y-3 border border-primary/20">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">📋 Templates de questions</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTemplateSave(!showTemplateSave)}
              >
                {showTemplateSave ? "Annuler" : "Sauvegarder comme template"}
              </Button>
            </div>

            {showTemplateSave && (
              <div className="flex gap-2">
                <Input
                  placeholder="Nom du template (ex: QCM Musique, Blind Test Pop)..."
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveAsTemplate()}
                />
                <Button type="button" onClick={saveAsTemplate} size="sm">
                  Sauvegarder
                </Button>
              </div>
            )}

            {templates.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {templates.map(template => (
                  <div key={template.id} className="flex items-center gap-2 bg-background p-2 rounded border">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => loadTemplate(template.id)}
                      className="flex-1 justify-start truncate"
                    >
                      {template.name}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTemplate(template.id)}
                      className="h-8 w-8 p-0 text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                Aucun template. Configurez votre question et cliquez sur "Sauvegarder comme template".
              </p>
            )}
          </div>
        )}

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

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Image (optionnelle)
            </Label>
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
                    setExistingImageUrl(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  disabled={saving}
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
                disabled={saving}
              >
                <Upload className="mr-2 h-4 w-4" />
                Choisir une image
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Son (optionnel)
            </Label>
            {availableSounds.length > 0 ? (
              <>
                <Select value={selectedSoundId} onValueChange={(id) => {
                  setSelectedSoundId(id);
                  const sound = availableSounds.find(s => s.id === id);
                  if (sound) setAudioUrl(sound.url);
                }} disabled={saving}>
                  <SelectTrigger>
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
                {questionType === 'blind_test' && selectedSoundId && (
                  <p className="text-xs text-muted-foreground">
                    💡 Les CUE points seront automatiquement appliqués
                  </p>
                )}
              </>
            ) : (
              <div className="p-3 bg-muted rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">
                  ⚠️ Aucun son disponible. Veuillez d'abord ajouter des sons dans la section "Sons" de l'administration.
                </p>
              </div>
            )}
          </div>

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

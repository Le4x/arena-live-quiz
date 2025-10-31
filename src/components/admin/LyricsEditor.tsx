import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Play } from "lucide-react";
import { toast } from "sonner";

export interface LyricLine {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

interface LyricsEditorProps {
  lyrics: LyricLine[];
  onChange: (lyrics: LyricLine[]) => void;
  audioUrl?: string;
}

export const LyricsEditor = ({ lyrics, onChange, audioUrl }: LyricsEditorProps) => {
  const [currentTime, setCurrentTime] = useState(0);

  const addLine = () => {
    const lastLine = lyrics[lyrics.length - 1];
    const newStartTime = lastLine ? lastLine.endTime : 0;
    
    const newLine: LyricLine = {
      id: Math.random().toString(36).substr(2, 9),
      startTime: newStartTime,
      endTime: newStartTime + 5,
      text: "",
    };
    
    onChange([...lyrics, newLine]);
  };

  const removeLine = (id: string) => {
    onChange(lyrics.filter(line => line.id !== id));
  };

  const updateLine = (id: string, updates: Partial<LyricLine>) => {
    onChange(lyrics.map(line => 
      line.id === id ? { ...line, ...updates } : line
    ));
  };

  const getCurrentTime = () => {
    const audio = document.querySelector('audio');
    if (audio) {
      setCurrentTime(audio.currentTime);
    }
  };

  const setLineTime = (id: string, field: 'startTime' | 'endTime') => {
    const audio = document.querySelector('audio');
    if (!audio) {
      toast.error("Lancez d'abord la musique");
      return;
    }
    updateLine(id, { [field]: audio.currentTime });
    toast.success(`${field === 'startTime' ? 'Début' : 'Fin'} défini à ${audio.currentTime.toFixed(1)}s`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Paroles synchronisées</Label>
        <Button type="button" onClick={addLine} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter ligne
        </Button>
      </div>

      {audioUrl && (
        <Card className="p-4 bg-muted/50">
          <div className="space-y-2">
            <Label>Prévisualisation audio</Label>
            <audio 
              controls 
              src={audioUrl} 
              className="w-full"
              onTimeUpdate={getCurrentTime}
            />
            <p className="text-sm text-muted-foreground">
              Temps actuel: {currentTime.toFixed(1)}s
            </p>
          </div>
        </Card>
      )}

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {lyrics.map((line, index) => (
          <Card key={line.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Ligne {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeLine(line.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Texte (utilisez ___ pour les mots manquants)</Label>
              <Input
                value={line.text}
                onChange={(e) => updateLine(line.id, { text: e.target.value })}
                placeholder="Je ne veux pas ___ ..."
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Début (secondes)</Label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    step="0.1"
                    value={line.startTime}
                    onChange={(e) => updateLine(line.id, { startTime: parseFloat(e.target.value) })}
                    className="text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setLineTime(line.id, 'startTime')}
                    title="Définir au temps actuel"
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Fin (secondes)</Label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    step="0.1"
                    value={line.endTime}
                    onChange={(e) => updateLine(line.id, { endTime: parseFloat(e.target.value) })}
                    className="text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setLineTime(line.id, 'endTime')}
                    title="Définir au temps actuel"
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {lyrics.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucune ligne ajoutée. Cliquez sur "Ajouter ligne" pour commencer.
        </p>
      )}
    </div>
  );
};

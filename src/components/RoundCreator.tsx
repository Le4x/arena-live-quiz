import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const RoundCreator = ({ onRoundCreated }: { onRoundCreated: () => void }) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("blind_test");
  const [timerDuration, setTimerDuration] = useState(30);
  const [jingleUrl, setJingleUrl] = useState("");

  const createRound = async () => {
    if (!title.trim()) {
      toast({ title: "Erreur", description: "Titre requis", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from('rounds')
      .insert([{ 
        title, 
        type, 
        timer_duration: timerDuration, 
        jingle_url: jingleUrl || null,
        status: 'pending' 
      }]);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer la manche", variant: "destructive" });
    } else {
      toast({ title: "Manche créée !", description: `${title} a été créée` });
      setTitle("");
      setJingleUrl("");
      onRoundCreated();
    }
  };

  return (
    <Card className="p-6 bg-card/80 backdrop-blur-sm border-accent/20">
      <h3 className="text-xl font-bold text-accent mb-4">Créer une manche</h3>
      <div className="space-y-4">
        <div>
          <Label>Titre de la manche</Label>
          <Input
            placeholder="Blind Test Années 80"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Type de manche</Label>
          <Select value={type} onValueChange={setType}>
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
          <Label>Durée du chrono (secondes)</Label>
          <Input
            type="number"
            value={timerDuration}
            onChange={(e) => setTimerDuration(parseInt(e.target.value))}
            className="mt-1"
          />
        </div>
        <div>
          <Label>URL du jingle (son d'intro de manche) - Optionnel</Label>
          <Input
            placeholder="https://exemple.com/jingle.mp3"
            value={jingleUrl}
            onChange={(e) => setJingleUrl(e.target.value)}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Ce son sera joué lors de l'intro de la manche sur l'écran
          </p>
        </div>
        <Button onClick={createRound} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          <PlusCircle className="mr-2 h-5 w-5" />
          Créer la manche
        </Button>
      </div>
    </Card>
  );
};

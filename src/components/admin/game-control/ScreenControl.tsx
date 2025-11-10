/**
 * ScreenControl - Contrôle des écrans TV
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Monitor, Home, Users, Trophy, Heart, Radio } from 'lucide-react';

interface ScreenControlProps {
  sessionId: string;
  gameState: any;
  currentSession: any;
  onLoadData: () => void;
}

export const ScreenControl = ({
  sessionId,
  gameState,
  currentSession,
  onLoadData,
}: ScreenControlProps) => {
  const { toast } = useToast();

  const switchScreen = async (screen: string) => {
    try {
      const updates: any = {
        show_welcome_screen: screen === 'welcome',
        show_team_connection_screen: screen === 'teams',
        show_leaderboard: screen === 'leaderboard',
        show_thanks_screen: screen === 'thanks',
        show_sponsors_screen: screen === 'sponsors',
      };

      await supabase.from('game_state').update(updates).eq('session_id', sessionId);

      toast({ title: `Écran ${screen} activé` });
      onLoadData();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const screens = [
    { id: 'game', label: 'Jeu', icon: Monitor, desc: 'Retour au jeu' },
    { id: 'welcome', label: 'Accueil', icon: Home, desc: 'Écran d\'accueil' },
    { id: 'teams', label: 'Équipes', icon: Users, desc: 'Connexion équipes' },
    { id: 'leaderboard', label: 'Classement', icon: Trophy, desc: 'Tableau des scores' },
    { id: 'sponsors', label: 'Sponsors', icon: Radio, desc: 'Écran sponsors' },
    { id: 'thanks', label: 'Remerciements', icon: Heart, desc: 'Écran de fin' },
  ];

  return (
    <Card className="p-6">
      <h3 className="font-bold text-lg mb-4">Gestion des Écrans</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {screens.map((screen) => {
          const Icon = screen.icon;
          return (
            <Button
              key={screen.id}
              variant="outline"
              className="h-auto flex-col gap-2 p-4"
              onClick={() => switchScreen(screen.id)}
            >
              <Icon className="w-6 h-6" />
              <div className="text-center">
                <div className="font-semibold">{screen.label}</div>
                <div className="text-xs text-muted-foreground">{screen.desc}</div>
              </div>
            </Button>
          );
        })}
      </div>
    </Card>
  );
};

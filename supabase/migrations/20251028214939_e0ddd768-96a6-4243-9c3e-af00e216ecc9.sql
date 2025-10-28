-- Ajouter colonne last_seen_at pour tracking présence équipes
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone DEFAULT now();

-- Index pour les requêtes de présence
CREATE INDEX IF NOT EXISTS idx_teams_last_seen_at ON public.teams(last_seen_at);

-- Ajouter colonne show_waiting_screen pour l'écran d'attente
ALTER TABLE public.game_state 
ADD COLUMN IF NOT EXISTS show_waiting_screen boolean DEFAULT false;
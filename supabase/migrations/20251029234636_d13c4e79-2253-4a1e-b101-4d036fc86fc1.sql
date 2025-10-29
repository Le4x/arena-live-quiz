-- Ajouter les colonnes pour les nouveaux écrans
ALTER TABLE public.game_state
ADD COLUMN IF NOT EXISTS show_welcome_screen boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_team_connection_screen boolean DEFAULT false;
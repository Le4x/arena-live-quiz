-- Ajouter les contrôles karaoké dans game_state
ALTER TABLE public.game_state 
ADD COLUMN IF NOT EXISTS karaoke_playing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS karaoke_revealed BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.game_state.karaoke_playing IS 'Contrôle la lecture du karaoké (true=play, false=pause)';
COMMENT ON COLUMN public.game_state.karaoke_revealed IS 'Révèle les paroles manquantes après le trou';
-- Add excluded_teams column to game_state to track teams that can't buzz anymore
ALTER TABLE public.game_state
ADD COLUMN IF NOT EXISTS excluded_teams jsonb DEFAULT '[]'::jsonb;
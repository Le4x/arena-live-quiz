-- Add game_session_id to teams table
ALTER TABLE public.teams 
ADD COLUMN game_session_id uuid REFERENCES public.game_sessions(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_teams_game_session_id ON public.teams(game_session_id);

-- Update existing teams to link to the first active session (if any)
UPDATE public.teams 
SET game_session_id = (
  SELECT id FROM public.game_sessions 
  WHERE status = 'active' 
  ORDER BY created_at DESC 
  LIMIT 1
)
WHERE game_session_id IS NULL;
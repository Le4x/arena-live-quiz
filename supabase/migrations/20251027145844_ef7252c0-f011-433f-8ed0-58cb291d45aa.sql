-- Create game_sessions table
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  selected_rounds jsonb DEFAULT '[]'::jsonb,
  current_round_index integer DEFAULT 0
);

-- Enable RLS on game_sessions
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for game_sessions
CREATE POLICY "Public read access for game_sessions"
  ON public.game_sessions FOR SELECT
  USING (true);

CREATE POLICY "Public insert access for game_sessions"
  ON public.game_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access for game_sessions"
  ON public.game_sessions FOR UPDATE
  USING (true);

CREATE POLICY "Public delete access for game_sessions"
  ON public.game_sessions FOR DELETE
  USING (true);

-- Add game_session_id to team_answers
ALTER TABLE public.team_answers
ADD COLUMN IF NOT EXISTS game_session_id uuid REFERENCES public.game_sessions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_team_answers_game_session 
ON public.team_answers(game_session_id);

-- Add game_session_id to buzzer_attempts
ALTER TABLE public.buzzer_attempts
ADD COLUMN IF NOT EXISTS game_session_id uuid REFERENCES public.game_sessions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_buzzer_attempts_game_session 
ON public.buzzer_attempts(game_session_id);

-- Add game_session_id to game_state
ALTER TABLE public.game_state
ADD COLUMN IF NOT EXISTS game_session_id uuid REFERENCES public.game_sessions(id) ON DELETE SET NULL;

-- Create function to reset game session
CREATE OR REPLACE FUNCTION public.reset_game_session(session_id uuid)
RETURNS void AS $$
BEGIN
  DELETE FROM public.team_answers WHERE game_session_id = session_id;
  DELETE FROM public.buzzer_attempts WHERE game_session_id = session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
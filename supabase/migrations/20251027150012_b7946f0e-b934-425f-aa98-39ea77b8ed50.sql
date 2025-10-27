-- Fix search_path for reset_game_session function
CREATE OR REPLACE FUNCTION public.reset_game_session(session_id uuid)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.team_answers WHERE game_session_id = session_id;
  DELETE FROM public.buzzer_attempts WHERE game_session_id = session_id;
END;
$$;
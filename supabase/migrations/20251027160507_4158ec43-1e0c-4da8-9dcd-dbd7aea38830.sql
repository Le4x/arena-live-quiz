-- Améliorer la fonction de réinitialisation de session
CREATE OR REPLACE FUNCTION public.reset_game_session(session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Supprimer toutes les réponses de la session
  DELETE FROM public.team_answers WHERE game_session_id = session_id;
  
  -- Supprimer tous les buzzers de la session
  DELETE FROM public.buzzer_attempts WHERE game_session_id = session_id;
  
  -- Réinitialiser le game_state
  UPDATE public.game_state 
  SET 
    excluded_teams = '[]'::jsonb,
    answer_result = NULL,
    is_buzzer_active = false,
    timer_active = false,
    show_leaderboard = false,
    announcement_text = NULL
  WHERE game_session_id = session_id;
END;
$function$;

-- Fonction pour nettoyer automatiquement lors du démarrage d'une session
CREATE OR REPLACE FUNCTION public.cleanup_on_session_start()
RETURNS TRIGGER AS $$
BEGIN
  -- Si une session passe à 'active', nettoyer ses données
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    PERFORM public.reset_game_session(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pour nettoyer automatiquement
DROP TRIGGER IF EXISTS cleanup_on_start ON public.game_sessions;
CREATE TRIGGER cleanup_on_start
BEFORE UPDATE ON public.game_sessions
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_on_session_start();
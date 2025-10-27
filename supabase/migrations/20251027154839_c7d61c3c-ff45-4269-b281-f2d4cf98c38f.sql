-- Supprimer l'ancienne contrainte d'unicité qui ne considère pas la session
ALTER TABLE public.buzzer_attempts 
DROP CONSTRAINT IF EXISTS buzzer_attempts_team_id_question_id_key;

ALTER TABLE public.buzzer_attempts 
DROP CONSTRAINT IF EXISTS unique_buzzer_per_team_question;

-- Ajouter une nouvelle contrainte d'unicité qui inclut le game_session_id
ALTER TABLE public.buzzer_attempts 
ADD CONSTRAINT unique_buzzer_per_team_question_session 
UNIQUE (team_id, question_id, game_session_id);

-- Fonction pour nettoyer les anciennes tentatives lors d'une nouvelle session
CREATE OR REPLACE FUNCTION public.cleanup_old_session_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Si une nouvelle session est créée avec le statut 'active', désactiver les anciennes
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Désactiver toutes les autres sessions actives
    UPDATE public.game_sessions 
    SET status = 'ended' 
    WHERE status = 'active' AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pour nettoyer automatiquement lors de l'activation d'une session
DROP TRIGGER IF EXISTS cleanup_sessions_trigger ON public.game_sessions;
CREATE TRIGGER cleanup_sessions_trigger
BEFORE INSERT OR UPDATE ON public.game_sessions
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_old_session_data();
-- Fonction pour vérifier si une équipe peut buzzer (pas bloquée)
CREATE OR REPLACE FUNCTION public.can_team_buzz(
  p_team_id uuid,
  p_session_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.game_state
    WHERE game_session_id = p_session_id
    AND excluded_teams @> jsonb_build_array(jsonb_build_object('team_id', p_team_id))
  );
$$;

-- Policy pour empêcher les équipes bloquées de buzzer
DROP POLICY IF EXISTS "Teams can only buzz if not blocked" ON public.buzzer_attempts;

CREATE POLICY "Teams can only buzz if not blocked"
ON public.buzzer_attempts
FOR INSERT
WITH CHECK (
  public.can_team_buzz(team_id, game_session_id)
);
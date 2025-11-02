-- Améliorer la fonction can_team_buzz pour gérer tous les formats de excluded_teams
CREATE OR REPLACE FUNCTION public.can_team_buzz(p_team_id uuid, p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  excluded_teams_data jsonb;
  team_item jsonb;
  is_excluded boolean := false;
BEGIN
  -- Récupérer les équipes exclues
  SELECT excluded_teams INTO excluded_teams_data
  FROM public.game_state
  WHERE game_session_id = p_session_id
  LIMIT 1;
  
  -- Si pas de données ou pas un array, l'équipe n'est pas exclue
  IF excluded_teams_data IS NULL OR jsonb_typeof(excluded_teams_data) != 'array' THEN
    RETURN true;
  END IF;
  
  -- Parcourir chaque élément du tableau
  FOR team_item IN SELECT * FROM jsonb_array_elements(excluded_teams_data)
  LOOP
    -- Si c'est une string directe
    IF jsonb_typeof(team_item) = 'string' AND team_item::text = concat('"', p_team_id::text, '"') THEN
      is_excluded := true;
      EXIT;
    END IF;
    
    -- Si c'est un objet, vérifier team_id, id, ou teamId
    IF jsonb_typeof(team_item) = 'object' THEN
      IF (team_item->>'team_id')::uuid = p_team_id 
         OR (team_item->>'id')::uuid = p_team_id
         OR (team_item->>'teamId')::uuid = p_team_id THEN
        is_excluded := true;
        EXIT;
      END IF;
    END IF;
  END LOOP;
  
  -- Retourner true si l'équipe PEUT buzzer (pas exclue)
  RETURN NOT is_excluded;
END;
$$;
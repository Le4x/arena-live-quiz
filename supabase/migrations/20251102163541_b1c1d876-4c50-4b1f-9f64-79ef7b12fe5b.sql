-- Corriger le search_path de la fonction
CREATE OR REPLACE FUNCTION check_team_not_blocked()
RETURNS TRIGGER AS $$
DECLARE
  excluded_teams_data jsonb;
  is_blocked boolean;
BEGIN
  -- Récupérer la liste des équipes bloquées
  SELECT excluded_teams INTO excluded_teams_data
  FROM game_state
  WHERE game_session_id = NEW.game_session_id;
  
  -- Vérifier si l'équipe est dans la liste des bloquées
  is_blocked := EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(excluded_teams_data, '[]'::jsonb)) AS elem
    WHERE (elem->>'team_id')::uuid = NEW.team_id
       OR (elem->>'id')::uuid = NEW.team_id
       OR elem::text::uuid = NEW.team_id
  );
  
  -- Si bloquée, empêcher l'insertion
  IF is_blocked THEN
    RAISE EXCEPTION 'Équipe bloquée pour cette question'
      USING ERRCODE = 'P0001';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
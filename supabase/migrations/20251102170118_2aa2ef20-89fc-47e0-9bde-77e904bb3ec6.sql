-- Corriger la fonction check_team_not_blocked pour mieux gérer les UUIDs
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
  
  -- Si pas d'équipes bloquées, autoriser
  IF excluded_teams_data IS NULL OR jsonb_array_length(excluded_teams_data) = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Vérifier si l'équipe est dans la liste des bloquées
  -- On vérifie plusieurs formats possibles dans le JSON
  is_blocked := EXISTS (
    SELECT 1
    FROM jsonb_array_elements(excluded_teams_data) AS elem
    WHERE 
      -- Format: {team_id: "uuid"}
      (elem->>'team_id' = NEW.team_id::text)
      OR 
      -- Format: {id: "uuid"}
      (elem->>'id' = NEW.team_id::text)
      OR
      -- Format direct: "uuid"
      (elem::text = quote_literal(NEW.team_id::text))
  );
  
  -- Si bloquée, empêcher l'insertion
  IF is_blocked THEN
    RAISE EXCEPTION 'Équipe bloquée pour cette question'
      USING ERRCODE = 'P0001';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
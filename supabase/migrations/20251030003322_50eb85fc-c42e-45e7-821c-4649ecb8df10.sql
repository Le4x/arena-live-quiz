-- Corriger le search_path de la fonction generate_team_pin
CREATE OR REPLACE FUNCTION public.generate_team_pin()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pin TEXT;
  pin_exists BOOLEAN;
BEGIN
  LOOP
    -- Générer un nombre entre 1000 et 9999
    pin := LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
    
    -- Vérifier si le PIN existe déjà
    SELECT EXISTS(SELECT 1 FROM public.teams WHERE connection_pin = pin) INTO pin_exists;
    
    -- Si le PIN n'existe pas, on sort de la boucle
    EXIT WHEN NOT pin_exists;
  END LOOP;
  
  RETURN pin;
END;
$$;
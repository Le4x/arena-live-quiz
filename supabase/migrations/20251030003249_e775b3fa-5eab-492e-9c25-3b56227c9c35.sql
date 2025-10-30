-- Ajouter un champ connection_pin pour l'authentification par code PIN
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS connection_pin TEXT;

-- Fonction pour générer un code PIN aléatoire à 4 chiffres
CREATE OR REPLACE FUNCTION generate_team_pin()
RETURNS TEXT
LANGUAGE plpgsql
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

-- Générer des PINs pour toutes les équipes existantes qui n'en ont pas
UPDATE public.teams
SET connection_pin = generate_team_pin()
WHERE connection_pin IS NULL;

-- Trigger pour générer automatiquement un PIN lors de la création d'une équipe
CREATE OR REPLACE FUNCTION auto_generate_team_pin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.connection_pin IS NULL THEN
    NEW.connection_pin := generate_team_pin();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_generate_team_pin ON public.teams;
CREATE TRIGGER trigger_auto_generate_team_pin
  BEFORE INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_team_pin();
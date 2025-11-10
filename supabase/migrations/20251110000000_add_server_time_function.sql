-- Fonction pour obtenir l'heure du serveur (pour synchronisation d'horloge)
CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT now();
$$;

-- Rendre la fonction accessible publiquement
GRANT EXECUTE ON FUNCTION public.get_server_time() TO anon, authenticated;

-- Ajouter la colonne logo_url pour permettre la personnalisation du logo par session
ALTER TABLE public.game_sessions
ADD COLUMN IF NOT EXISTS logo_url text DEFAULT NULL;

COMMENT ON COLUMN public.game_sessions.logo_url IS 'URL du logo personnalisé pour cette session. Si NULL, utilise le logo par défaut Music Arena.';
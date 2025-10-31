-- Ajouter les colonnes pour le karaoké dans la table questions
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS lyrics JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS stop_time FLOAT DEFAULT NULL;

COMMENT ON COLUMN public.questions.lyrics IS 'Paroles synchronisées au format JSON (array de {id, startTime, endTime, text})';
COMMENT ON COLUMN public.questions.stop_time IS 'Temps en secondes où la musique doit s''arrêter (avant les paroles manquantes)';
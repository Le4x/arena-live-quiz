-- Ajouter la colonne penalty_points pour gérer les pénalités sur mauvaise réponse
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS penalty_points integer DEFAULT 0;

COMMENT ON COLUMN public.questions.penalty_points IS 'Points perdus en cas de mauvaise réponse. 0 = pas de pénalité.';
-- Ajouter la colonne stop_time à la table questions
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS stop_time NUMERIC;
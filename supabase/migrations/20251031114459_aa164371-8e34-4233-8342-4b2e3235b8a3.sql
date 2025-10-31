-- Ajouter la colonne lyrics pour les questions de type karaoké
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS lyrics jsonb DEFAULT NULL;

COMMENT ON COLUMN public.questions.lyrics IS 'Paroles synchronisées pour les questions de type karaoké, format: [{id, startTime, endTime, text}]';
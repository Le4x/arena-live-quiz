-- Supprimer l'ancienne contrainte sur question_type
ALTER TABLE public.questions
DROP CONSTRAINT IF EXISTS questions_question_type_check;

-- Ajouter la nouvelle contrainte avec le type 'lyrics'
ALTER TABLE public.questions
ADD CONSTRAINT questions_question_type_check
CHECK (question_type IN ('blind_test', 'qcm', 'free_text', 'lyrics'));
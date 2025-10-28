-- Ajouter question_instance_id pour gérer les répétitions de questions
-- Chaque lancement de question génère une nouvelle instance unique

ALTER TABLE public.buzzer_attempts 
ADD COLUMN IF NOT EXISTS question_instance_id UUID;

ALTER TABLE public.team_answers 
ADD COLUMN IF NOT EXISTS question_instance_id UUID;

ALTER TABLE public.game_state 
ADD COLUMN IF NOT EXISTS current_question_instance_id UUID;

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_buzzer_attempts_instance 
ON public.buzzer_attempts(question_instance_id);

CREATE INDEX IF NOT EXISTS idx_team_answers_instance 
ON public.team_answers(question_instance_id);

COMMENT ON COLUMN public.buzzer_attempts.question_instance_id IS 'ID unique de l''instance de question - permet de relancer la même question sans conflit';
COMMENT ON COLUMN public.team_answers.question_instance_id IS 'ID unique de l''instance de question - permet de relancer la même question sans conflit';
COMMENT ON COLUMN public.game_state.current_question_instance_id IS 'ID de l''instance actuelle de la question en cours';

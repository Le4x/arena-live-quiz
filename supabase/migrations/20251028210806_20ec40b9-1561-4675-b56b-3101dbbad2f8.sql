-- Créer la table question_instances pour gérer les instances uniques de questions
CREATE TABLE IF NOT EXISTS public.question_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL,
  game_session_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_question_instances_question_id ON public.question_instances(question_id);
CREATE INDEX idx_question_instances_session_id ON public.question_instances(game_session_id);
CREATE INDEX idx_question_instances_started_at ON public.question_instances(started_at);

-- RLS policies
ALTER TABLE public.question_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for question_instances" 
ON public.question_instances 
FOR SELECT 
USING (true);

CREATE POLICY "Public insert access for question_instances" 
ON public.question_instances 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public update access for question_instances" 
ON public.question_instances 
FOR UPDATE 
USING (true);

CREATE POLICY "Public delete access for question_instances" 
ON public.question_instances 
FOR DELETE 
USING (true);
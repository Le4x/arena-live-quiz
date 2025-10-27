-- ARENA Database Schema
-- Tables pour le système de quiz musical interactif

-- Table des équipes
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  avatar TEXT,
  score INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des manches de jeu
CREATE TABLE IF NOT EXISTS public.rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('blind_test', 'qcm', 'free_text')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'finished')),
  timer_duration INTEGER, -- en secondes
  timer_started_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des questions
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('blind_test', 'qcm', 'free_text')),
  audio_url TEXT,
  correct_answer TEXT,
  options JSONB, -- pour les QCM
  points INTEGER DEFAULT 10,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des tentatives de buzzer
CREATE TABLE IF NOT EXISTS public.buzzer_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  buzzed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_first BOOLEAN DEFAULT false,
  UNIQUE(team_id, question_id)
);

-- Table des réponses des équipes
CREATE TABLE IF NOT EXISTS public.team_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  is_correct BOOLEAN,
  points_awarded INTEGER DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_id, question_id)
);

-- Table de l'état global du jeu
CREATE TABLE IF NOT EXISTS public.game_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_round_id UUID REFERENCES public.rounds(id),
  current_question_id UUID REFERENCES public.questions(id),
  is_buzzer_active BOOLEAN DEFAULT false,
  timer_active BOOLEAN DEFAULT false,
  timer_remaining INTEGER, -- en secondes
  show_leaderboard BOOLEAN DEFAULT false,
  announcement_text TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert initial game state
INSERT INTO public.game_state (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buzzer_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for this local game application)
CREATE POLICY "Public read access for teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Public insert access for teams" ON public.teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for teams" ON public.teams FOR UPDATE USING (true);
CREATE POLICY "Public delete access for teams" ON public.teams FOR DELETE USING (true);

CREATE POLICY "Public read access for rounds" ON public.rounds FOR SELECT USING (true);
CREATE POLICY "Public insert access for rounds" ON public.rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for rounds" ON public.rounds FOR UPDATE USING (true);
CREATE POLICY "Public delete access for rounds" ON public.rounds FOR DELETE USING (true);

CREATE POLICY "Public read access for questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Public insert access for questions" ON public.questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for questions" ON public.questions FOR UPDATE USING (true);
CREATE POLICY "Public delete access for questions" ON public.questions FOR DELETE USING (true);

CREATE POLICY "Public read access for buzzer_attempts" ON public.buzzer_attempts FOR SELECT USING (true);
CREATE POLICY "Public insert access for buzzer_attempts" ON public.buzzer_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for buzzer_attempts" ON public.buzzer_attempts FOR UPDATE USING (true);
CREATE POLICY "Public delete access for buzzer_attempts" ON public.buzzer_attempts FOR DELETE USING (true);

CREATE POLICY "Public read access for team_answers" ON public.team_answers FOR SELECT USING (true);
CREATE POLICY "Public insert access for team_answers" ON public.team_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for team_answers" ON public.team_answers FOR UPDATE USING (true);
CREATE POLICY "Public delete access for team_answers" ON public.team_answers FOR DELETE USING (true);

CREATE POLICY "Public read access for game_state" ON public.game_state FOR SELECT USING (true);
CREATE POLICY "Public insert access for game_state" ON public.game_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for game_state" ON public.game_state FOR UPDATE USING (true);
CREATE POLICY "Public delete access for game_state" ON public.game_state FOR DELETE USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.buzzer_attempts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_state;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_game_state_updated_at
  BEFORE UPDATE ON public.game_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
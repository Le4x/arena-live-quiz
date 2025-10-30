-- Ajouter has_final aux sessions
ALTER TABLE public.game_sessions 
ADD COLUMN IF NOT EXISTS has_final BOOLEAN DEFAULT false;

-- Table pour définir les types de jokers
CREATE TABLE IF NOT EXISTS public.joker_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT DEFAULT '🎯',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table pour gérer les finales
CREATE TABLE IF NOT EXISTS public.finals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'intro', 'active', 'completed')),
  finalist_teams JSONB DEFAULT '[]'::jsonb, -- Array des 8 team_ids
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(game_session_id)
);

-- Table pour les jokers des équipes en finale
CREATE TABLE IF NOT EXISTS public.final_jokers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  final_id UUID NOT NULL REFERENCES public.finals(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  joker_type_id UUID NOT NULL REFERENCES public.joker_types(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(final_id, team_id, joker_type_id)
);

-- Table pour les votes du public
CREATE TABLE IF NOT EXISTS public.public_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  final_id UUID NOT NULL REFERENCES public.finals(id) ON DELETE CASCADE,
  question_instance_id UUID NOT NULL REFERENCES public.question_instances(id) ON DELETE CASCADE,
  voter_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  voted_for_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(final_id, question_instance_id, voter_team_id)
);

-- Ajouter final_mode au game_state
ALTER TABLE public.game_state 
ADD COLUMN IF NOT EXISTS final_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS final_id UUID REFERENCES public.finals(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.joker_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_jokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour joker_types
CREATE POLICY "Anyone can view joker types"
ON public.joker_types FOR SELECT
USING (true);

CREATE POLICY "Admins can manage joker types"
ON public.joker_types FOR ALL
USING (is_admin(auth.uid()));

-- RLS Policies pour finals
CREATE POLICY "Anyone can view finals"
ON public.finals FOR SELECT
USING (true);

CREATE POLICY "Admins can manage finals"
ON public.finals FOR ALL
USING (is_admin(auth.uid()));

-- RLS Policies pour final_jokers
CREATE POLICY "Anyone can view final jokers"
ON public.final_jokers FOR SELECT
USING (true);

CREATE POLICY "Admins can manage final jokers"
ON public.final_jokers FOR ALL
USING (is_admin(auth.uid()));

-- RLS Policies pour public_votes
CREATE POLICY "Anyone can view public votes"
ON public.public_votes FOR SELECT
USING (true);

CREATE POLICY "Anyone can vote"
ON public.public_votes FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage votes"
ON public.public_votes FOR ALL
USING (is_admin(auth.uid()));

-- Insérer les types de jokers par défaut
INSERT INTO public.joker_types (name, description, icon) VALUES
  ('double_points', 'Double les points de la prochaine bonne réponse', '✖️2️⃣'),
  ('shield', 'Annule la pénalité de la prochaine mauvaise réponse', '🛡️'),
  ('eliminate_answer', 'Élimine une mauvaise option dans un QCM', '❌'),
  ('time_bonus', 'Ajoute 10 secondes au timer', '⏰'),
  ('public_vote', 'Les spectateurs votent pour une équipe qui gagne des points bonus', '👥')
ON CONFLICT (name) DO NOTHING;
-- Table des sponsors
CREATE TABLE public.sponsors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('major', 'medium', 'minor')),
  display_order INTEGER DEFAULT 0,
  game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view sponsors" 
ON public.sponsors 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage sponsors" 
ON public.sponsors 
FOR ALL 
USING (is_admin(auth.uid()));

-- Ajouter les champs de contrôle sponsors dans game_state
ALTER TABLE public.game_state 
ADD COLUMN IF NOT EXISTS show_sponsors_screen BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_thanks_screen BOOLEAN DEFAULT false;

-- Index pour performance
CREATE INDEX idx_sponsors_session ON public.sponsors(game_session_id);
CREATE INDEX idx_sponsors_tier ON public.sponsors(tier);
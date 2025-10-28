-- Ajouter les champs pour les intros de manche
ALTER TABLE public.game_state 
ADD COLUMN IF NOT EXISTS show_round_intro BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS current_round_intro UUID REFERENCES public.rounds(id);
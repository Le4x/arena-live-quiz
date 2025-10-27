-- Ajouter le champ jingle_url pour les sons de manche
ALTER TABLE public.rounds ADD COLUMN jingle_url TEXT;

-- Ajouter les champs pour gérer l'animation d'intro de manche et la pause
ALTER TABLE public.game_state ADD COLUMN show_round_intro BOOLEAN DEFAULT false;
ALTER TABLE public.game_state ADD COLUMN current_round_intro UUID REFERENCES public.rounds(id);
ALTER TABLE public.game_state ADD COLUMN show_pause_screen BOOLEAN DEFAULT false;
-- Ajouter le champ leaderboard_page au game_state pour la pagination
ALTER TABLE public.game_state 
ADD COLUMN leaderboard_page integer DEFAULT 1;
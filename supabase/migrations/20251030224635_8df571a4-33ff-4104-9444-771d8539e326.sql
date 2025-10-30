-- Ajouter le champ yellow_cards dans la table teams
ALTER TABLE public.teams 
ADD COLUMN yellow_cards integer NOT NULL DEFAULT 0;
-- Ajouter le champ is_excluded pour marquer les équipes exclues définitivement
ALTER TABLE public.teams 
ADD COLUMN is_excluded boolean NOT NULL DEFAULT false;
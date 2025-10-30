-- Vider la table public_votes et modifier la structure
DELETE FROM public_votes;

ALTER TABLE public_votes 
  DROP COLUMN voted_for_team_id,
  ADD COLUMN voted_answer text NOT NULL;
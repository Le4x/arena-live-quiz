-- Supprimer les anciens types de jokers
DELETE FROM joker_types WHERE name NOT IN ('fifty_fifty', 'team_call', 'public_vote');

-- Mettre à jour ou insérer les 3 jokers
INSERT INTO joker_types (name, icon, description)
VALUES 
  ('fifty_fifty', '➗', 'Élimine deux mauvaises réponses'),
  ('team_call', '👥', 'Appel à l''équipe pour les capitaines'),
  ('public_vote', '🗳️', 'Vote du public')
ON CONFLICT (name) 
DO UPDATE SET
  icon = EXCLUDED.icon,
  description = EXCLUDED.description;
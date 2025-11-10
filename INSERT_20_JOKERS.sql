-- ============================================================================
-- INSÉRER LES 20 JOKERS STRATÉGIQUES
-- ============================================================================

-- D'abord, vérifier combien de jokers existent
SELECT COUNT(*) as total_jokers FROM public.joker_types;

-- Voir quels jokers existent déjà
SELECT name, icon, rarity, is_active FROM public.joker_types ORDER BY name;

-- ============================================================================
-- INSERTION DES 20 JOKERS (avec ON CONFLICT pour éviter les doublons)
-- ============================================================================

INSERT INTO public.joker_types (name, description, icon, effect_type, effect_value, is_active, rarity)
VALUES
  -- 🛡️ JOKERS DÉFENSIFS (4)
  ('BOUCLIER', 'Protège contre une mauvaise réponse', '🛡️', 'shield', '{"protection": true}', true, 'rare'),
  ('RESURRECTION', 'Récupère une vie perdue', '❤️‍🩹', 'heal', '{"lives": 1}', true, 'legendary'),
  ('SECONDE_CHANCE', 'Permet de répondre 2 fois', '🔄', 'retry', '{"attempts": 2}', true, 'rare'),
  ('TEMPS_SUPPLEMENTAIRE', 'Ajoute 30 secondes', '⏱️', 'time', '{"seconds": 30}', true, 'common'),

  -- ⚔️ JOKERS OFFENSIFS (4)
  ('VOL_POINTS', 'Vole 10 points à un adversaire', '🦹', 'steal', '{"points": 10}', true, 'epic'),
  ('SABOTAGE', 'Réduit le temps adverse de 50%', '💣', 'sabotage', '{"time_reduction": 0.5}', true, 'epic'),
  ('ELIMINATION_DIRECTE', 'Élimine un adversaire', '☠️', 'eliminate', '{"instant": true}', true, 'legendary'),
  ('MALUS_ADVERSE', 'Adversaire perd 5 points', '🎯', 'penalty', '{"points": -5}', true, 'rare'),

  -- 🎲 JOKERS STRATÉGIQUES (4)
  ('ECHANGE_POSITION', 'Échange de place au classement', '🔀', 'swap', '{"positions": true}', true, 'epic'),
  ('DOUBLE_POINTS', 'Cette question vaut double', '✖️2', 'multiplier', '{"factor": 2}', true, 'rare'),
  ('JOKER_MYSTERE', 'Effet aléatoire (bonus ou malus)', '🎰', 'random', '{"random": true}', true, 'legendary'),
  ('ALLIANCE', 'Partage les points avec une équipe', '🤝', 'alliance', '{"share": true}', true, 'epic'),

  -- 📊 JOKERS D'INFORMATION (3)
  ('VISION', 'Voir la réponse de tous les adversaires', '👁️', 'vision', '{"see_answers": true}', true, 'rare'),
  ('STATISTIQUES', 'Voir les % de chaque réponse', '📊', 'stats', '{"show_stats": true}', true, 'common'),
  ('INDICE', 'Révèle un indice sur la bonne réponse', '💡', 'hint', '{"hint": true}', true, 'common'),

  -- 🎭 JOKERS CLASSIQUES (3 que tu as déjà)
  ('FIFTY_FIFTY', 'Élimine deux mauvaises réponses', '➗', 'eliminate', '{"remove": 2}', true, 'common'),
  ('TEAM_CALL', 'Appel à l''équipe pour les capitaines', '👥', 'call', '{"team": true}', true, 'common'),
  ('PUBLIC_VOTE', 'Vote du public', '🗳️', 'vote', '{"public": true}', true, 'common'),

  -- 🌟 JOKERS SPÉCIAUX (2)
  ('CHANCE_ULTIME', 'Relance complète si mauvaise réponse', '🍀', 'ultimate', '{"full_retry": true}', true, 'legendary'),
  ('CONQUETE', 'Vol d''un joker adverse au hasard', '🏴‍☠️', 'steal_joker', '{"steal_random": true}', true, 'legendary')

ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  effect_type = EXCLUDED.effect_type,
  effect_value = EXCLUDED.effect_value,
  rarity = EXCLUDED.rarity,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- VÉRIFICATION FINALE
-- ============================================================================

SELECT
  COUNT(*) as total_jokers,
  COUNT(CASE WHEN is_active = true THEN 1 END) as jokers_actifs,
  COUNT(CASE WHEN rarity = 'common' THEN 1 END) as common,
  COUNT(CASE WHEN rarity = 'rare' THEN 1 END) as rare,
  COUNT(CASE WHEN rarity = 'epic' THEN 1 END) as epic,
  COUNT(CASE WHEN rarity = 'legendary' THEN 1 END) as legendary
FROM public.joker_types;

-- Lister tous les jokers
SELECT
  name,
  icon,
  rarity,
  effect_type,
  is_active,
  '✅ INSÉRÉ' as status
FROM public.joker_types
ORDER BY
  CASE rarity
    WHEN 'common' THEN 1
    WHEN 'rare' THEN 2
    WHEN 'epic' THEN 3
    WHEN 'legendary' THEN 4
  END,
  name;

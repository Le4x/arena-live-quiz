-- =====================================================
-- NOUVEAUX JOKERS POUR LE MODE FINALE
-- =====================================================
-- Ajout de 4 nouveaux jokers stylés pour rendre les finales plus excitantes

-- 🔥 Double Points - Double les points de la prochaine bonne réponse
INSERT INTO joker_types (id, name, description, icon, is_active)
VALUES (
  gen_random_uuid(),
  'double_points',
  'Double les points de votre prochaine bonne réponse !',
  '🔥',
  true
) ON CONFLICT DO NOTHING;

-- 🛡️ Bouclier - Protège contre la pénalité si mauvaise réponse
INSERT INTO joker_types (id, name, description, icon, is_active)
VALUES (
  gen_random_uuid(),
  'shield',
  'Protège contre la pénalité si vous donnez une mauvaise réponse',
  '🛡️',
  true
) ON CONFLICT DO NOTHING;

-- ⏱️ Temps Bonus - Ajoute du temps supplémentaire
INSERT INTO joker_types (id, name, description, icon, is_active)
VALUES (
  gen_random_uuid(),
  'time_bonus',
  'Ajoute +10 secondes pour répondre à la question',
  '⏱️',
  true
) ON CONFLICT DO NOTHING;

-- 🎲 Seconde Chance - Permet de re-répondre si erreur
INSERT INTO joker_types (id, name, description, icon, is_active)
VALUES (
  gen_random_uuid(),
  'second_chance',
  'Permet de donner une seconde réponse si la première est fausse',
  '🎲',
  true
) ON CONFLICT DO NOTHING;

-- Vérifier les jokers insérés
DO $$
BEGIN
  RAISE NOTICE '🃏 Nouveaux jokers ajoutés avec succès!';
END $$;

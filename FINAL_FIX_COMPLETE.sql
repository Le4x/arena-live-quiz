-- ============================================================================
-- SCRIPT COMPLET : TOUT RÉPARER EN UNE FOIS
-- ============================================================================
-- Ce script fait TOUT : ajoute les colonnes, insère les 20 jokers, corrige les RLS

-- ============================================================================
-- ÉTAPE 1 : Ajouter les colonnes manquantes à joker_types
-- ============================================================================

ALTER TABLE public.joker_types
  ADD COLUMN IF NOT EXISTS effect_type TEXT DEFAULT 'bonus',
  ADD COLUMN IF NOT EXISTS effect_value JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rarity TEXT DEFAULT 'common';

-- Ajouter la contrainte CHECK pour rarity
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'joker_types_rarity_check'
        AND conrelid = 'public.joker_types'::regclass
    ) THEN
        ALTER TABLE public.joker_types
        ADD CONSTRAINT joker_types_rarity_check
        CHECK (rarity IN ('common', 'rare', 'epic', 'legendary'));
    END IF;
END $$;

-- Ajouter la contrainte UNIQUE sur name
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'joker_types_name_key'
        AND conrelid = 'public.joker_types'::regclass
    ) THEN
        ALTER TABLE public.joker_types
        ADD CONSTRAINT joker_types_name_key UNIQUE (name);
    END IF;
END $$;

-- ============================================================================
-- ÉTAPE 2 : Corriger les created_at NULL
-- ============================================================================

WITH numbered_jokers AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY name) as row_num
  FROM public.joker_types
  WHERE created_at IS NULL
)
UPDATE public.joker_types
SET created_at = now() + (numbered_jokers.row_num * INTERVAL '1 second')
FROM numbered_jokers
WHERE public.joker_types.id = numbered_jokers.id;

-- ============================================================================
-- ÉTAPE 3 : Mettre à jour les 3 jokers existants avec leurs métadonnées
-- ============================================================================

UPDATE public.joker_types
SET
  effect_type = 'eliminate',
  effect_value = '{"remove": 2}'::jsonb,
  rarity = 'common'
WHERE name = 'fifty fifty';

UPDATE public.joker_types
SET
  effect_type = 'call',
  effect_value = '{"team": true}'::jsonb,
  rarity = 'common'
WHERE name = 'team call';

UPDATE public.joker_types
SET
  effect_type = 'vote',
  effect_value = '{"public": true}'::jsonb,
  rarity = 'common'
WHERE name = 'public vote';

-- ============================================================================
-- ÉTAPE 4 : Insérer les 17 NOUVEAUX jokers
-- ============================================================================

INSERT INTO public.joker_types (name, description, icon, effect_type, effect_value, is_active, rarity)
VALUES
  -- 🛡️ JOKERS DÉFENSIFS (4)
  ('BOUCLIER', 'Protège contre une mauvaise réponse', '🛡️', 'shield', '{"protection": true}'::jsonb, true, 'rare'),
  ('RESURRECTION', 'Récupère une vie perdue', '❤️‍🩹', 'heal', '{"lives": 1}'::jsonb, true, 'legendary'),
  ('SECONDE_CHANCE', 'Permet de répondre 2 fois', '🔄', 'retry', '{"attempts": 2}'::jsonb, true, 'rare'),
  ('TEMPS_SUPPLEMENTAIRE', 'Ajoute 30 secondes', '⏱️', 'time', '{"seconds": 30}'::jsonb, true, 'common'),

  -- ⚔️ JOKERS OFFENSIFS (4)
  ('VOL_POINTS', 'Vole 10 points à un adversaire', '🦹', 'steal', '{"points": 10}'::jsonb, true, 'epic'),
  ('SABOTAGE', 'Réduit le temps adverse de 50%', '💣', 'sabotage', '{"time_reduction": 0.5}'::jsonb, true, 'epic'),
  ('ELIMINATION_DIRECTE', 'Élimine un adversaire', '☠️', 'eliminate', '{"instant": true}'::jsonb, true, 'legendary'),
  ('MALUS_ADVERSE', 'Adversaire perd 5 points', '🎯', 'penalty', '{"points": -5}'::jsonb, true, 'rare'),

  -- 🎲 JOKERS STRATÉGIQUES (4)
  ('ECHANGE_POSITION', 'Échange de place au classement', '🔀', 'swap', '{"positions": true}'::jsonb, true, 'epic'),
  ('DOUBLE_POINTS', 'Cette question vaut double', '✖️2', 'multiplier', '{"factor": 2}'::jsonb, true, 'rare'),
  ('JOKER_MYSTERE', 'Effet aléatoire (bonus ou malus)', '🎰', 'random', '{"random": true}'::jsonb, true, 'legendary'),
  ('ALLIANCE', 'Partage les points avec une équipe', '🤝', 'alliance', '{"share": true}'::jsonb, true, 'epic'),

  -- 📊 JOKERS D'INFORMATION (3)
  ('VISION', 'Voir la réponse de tous les adversaires', '👁️', 'vision', '{"see_answers": true}'::jsonb, true, 'rare'),
  ('STATISTIQUES', 'Voir les % de chaque réponse', '📊', 'stats', '{"show_stats": true}'::jsonb, true, 'common'),
  ('INDICE', 'Révèle un indice sur la bonne réponse', '💡', 'hint', '{"hint": true}'::jsonb, true, 'common'),

  -- 🌟 JOKERS SPÉCIAUX (2)
  ('CHANCE_ULTIME', 'Relance complète si mauvaise réponse', '🍀', 'ultimate', '{"full_retry": true}'::jsonb, true, 'legendary'),
  ('CONQUETE', 'Vol d''un joker adverse au hasard', '🏴‍☠️', 'steal_joker', '{"steal_random": true}'::jsonb, true, 'legendary')

ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  effect_type = EXCLUDED.effect_type,
  effect_value = EXCLUDED.effect_value,
  rarity = EXCLUDED.rarity,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- ÉTAPE 5 : Réinitialiser les RLS policies
-- ============================================================================

-- Supprimer toutes les policies existantes
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'joker_types'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.joker_types CASCADE';
    END LOOP;
END $$;

-- Créer UNE SEULE policy ultra permissive
CREATE POLICY "joker_types_allow_all"
ON public.joker_types
FOR ALL
TO public, anon, authenticated
USING (true)
WITH CHECK (true);

-- Donner tous les droits
GRANT ALL PRIVILEGES ON public.joker_types TO anon;
GRANT ALL PRIVILEGES ON public.joker_types TO authenticated;

-- ============================================================================
-- VÉRIFICATION FINALE
-- ============================================================================

SELECT
  'Total jokers: ' || COUNT(*) || ' (attendu: 20)' as total,
  'Actifs: ' || COUNT(CASE WHEN is_active = true THEN 1 END) as actifs
FROM public.joker_types;

SELECT
  'Par rareté:' as info,
  COUNT(CASE WHEN rarity = 'common' THEN 1 END) as common,
  COUNT(CASE WHEN rarity = 'rare' THEN 1 END) as rare,
  COUNT(CASE WHEN rarity = 'epic' THEN 1 END) as epic,
  COUNT(CASE WHEN rarity = 'legendary' THEN 1 END) as legendary
FROM public.joker_types;

-- Lister tous les jokers par rareté
SELECT
  rarity,
  name,
  icon,
  effect_type
FROM public.joker_types
ORDER BY
  CASE rarity
    WHEN 'common' THEN 1
    WHEN 'rare' THEN 2
    WHEN 'epic' THEN 3
    WHEN 'legendary' THEN 4
  END,
  name;

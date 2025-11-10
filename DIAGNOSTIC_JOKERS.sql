-- ============================================================================
-- DIAGNOSTIC: Pourquoi seulement 3 jokers se chargent ?
-- ============================================================================

-- 1. Vérifier le nombre total de jokers actifs
SELECT
  COUNT(*) as total_jokers_actifs,
  COUNT(CASE WHEN created_at IS NULL THEN 1 END) as jokers_sans_date
FROM public.joker_types
WHERE is_active = true;

-- 2. Lister TOUS les jokers avec leurs dates de création
SELECT
  id,
  name,
  icon,
  rarity,
  is_active,
  created_at,
  CASE WHEN created_at IS NULL THEN '⚠️ NULL' ELSE '✓ OK' END as date_status
FROM public.joker_types
ORDER BY created_at NULLS LAST, name;

-- 3. Vérifier les 3 premiers jokers (ceux qui se chargent)
SELECT
  id,
  name,
  icon,
  created_at,
  '🟢 Ces 3 jokers se chargent' as status
FROM public.joker_types
WHERE is_active = true
ORDER BY created_at ASC
LIMIT 3;

-- 4. Vérifier les jokers qui ne se chargent PAS (après les 3 premiers)
SELECT
  id,
  name,
  icon,
  created_at,
  '🔴 Ces jokers NE se chargent PAS' as status
FROM public.joker_types
WHERE is_active = true
ORDER BY created_at ASC
OFFSET 3;

-- 5. Vérifier toutes les policies RLS sur joker_types
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as check_expression
FROM pg_policies
WHERE tablename = 'joker_types';

-- ============================================================================
-- FIX 1: Mettre à jour les created_at NULL
-- ============================================================================
-- Si des jokers ont created_at = NULL, ça peut causer des problèmes de tri

UPDATE public.joker_types
SET created_at = now() + (ROW_NUMBER() OVER (ORDER BY name)) * INTERVAL '1 second'
WHERE created_at IS NULL;

-- ============================================================================
-- FIX 2: Supprimer TOUTES les policies RLS et en recréer des simples
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

-- ============================================================================
-- FIX 3: Vérifier qu'il n'y a pas de limite de rangées dans PostgREST
-- ============================================================================

-- PostgREST a parfois une limite par défaut. On va forcer GRANT ALL.
GRANT ALL PRIVILEGES ON public.joker_types TO anon;
GRANT ALL PRIVILEGES ON public.joker_types TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ============================================================================
-- VÉRIFICATION FINALE
-- ============================================================================

SELECT
  'Nombre de jokers actifs: ' || COUNT(*) as resultat
FROM public.joker_types
WHERE is_active = true;

SELECT
  '✅ Policy RLS: ' || policyname as policy_info
FROM pg_policies
WHERE tablename = 'joker_types';

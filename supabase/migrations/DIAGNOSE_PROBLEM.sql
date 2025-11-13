-- ============================================
-- DIAGNOSTIC COMPLET DU PROBLÈME
-- ============================================

-- 1. Vérifier la structure de la table finals
SELECT
  'STRUCTURE TABLE FINALS' as diagnostic,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'finals'
ORDER BY ordinal_position;

-- 2. Vérifier toutes les finales
SELECT
  'TOUTES LES FINALES' as diagnostic,
  id,
  name,
  game_session_id,
  status,
  finalist_teams,
  finalist_count,
  created_at
FROM finals
ORDER BY created_at DESC;

-- 3. Vérifier toutes les sessions
SELECT
  'TOUTES LES SESSIONS' as diagnostic,
  id,
  name,
  status,
  created_at
FROM game_sessions
ORDER BY created_at DESC;

-- 4. Vérifier la correspondance
SELECT
  'CORRESPONDANCE FINALE-SESSION' as diagnostic,
  f.id as finale_id,
  f.name as finale_name,
  f.status as finale_status,
  f.game_session_id,
  gs.id as session_id,
  gs.name as session_name,
  gs.status as session_status,
  CASE
    WHEN gs.id IS NULL THEN '❌ Session introuvable'
    WHEN gs.status != 'active' THEN '⚠️ Session non active'
    ELSE '✅ OK'
  END as probleme
FROM finals f
LEFT JOIN game_sessions gs ON f.game_session_id = gs.id
WHERE f.status != 'completed'
ORDER BY f.created_at DESC;

-- 5. Vérifier le type de finalist_teams
SELECT
  'TYPE FINALIST_TEAMS' as diagnostic,
  name,
  jsonb_typeof(finalist_teams) as type_jsonb,
  jsonb_array_length(finalist_teams) as nb_teams,
  finalist_teams
FROM finals
WHERE name LIKE '%CORRIG%'
LIMIT 1;

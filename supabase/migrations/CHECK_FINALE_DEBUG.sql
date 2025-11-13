-- Script de debug pour vérifier la finale

-- 1. Vérifier la finale créée
SELECT
  'FINALE' as type,
  f.id,
  f.name,
  f.game_session_id,
  f.status,
  f.finalist_count,
  f.created_at
FROM finals f
WHERE f.name LIKE '%CORRIG%'
ORDER BY f.created_at DESC
LIMIT 1;

-- 2. Vérifier les sessions de jeu
SELECT
  'SESSIONS' as type,
  gs.id,
  gs.name,
  gs.status,
  gs.created_at
FROM game_sessions gs
ORDER BY gs.created_at DESC
LIMIT 5;

-- 3. Vérifier si la finale est liée à une session active
SELECT
  'CORRESPONDANCE' as type,
  f.name as finale_name,
  f.status as finale_status,
  gs.name as session_name,
  gs.status as session_status,
  CASE
    WHEN gs.status = 'active' THEN '✅ Session active'
    ELSE '❌ Session non active'
  END as resultat
FROM finals f
LEFT JOIN game_sessions gs ON f.game_session_id = gs.id
WHERE f.name LIKE '%CORRIG%'
ORDER BY f.created_at DESC
LIMIT 1;

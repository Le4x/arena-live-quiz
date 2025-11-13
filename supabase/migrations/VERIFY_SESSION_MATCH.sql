-- ============================================
-- VÉRIFICATION CORRESPONDANCE SESSIONS
-- ============================================
-- Ce script vérifie que la finale est bien liée
-- à la session active que la Régie utilise
-- ============================================

-- 1. Afficher TOUTES les sessions
SELECT
  '📋 TOUTES LES SESSIONS' as diagnostic,
  id,
  name,
  status,
  has_final,
  created_at,
  CASE
    WHEN status = 'active' THEN '✅ ACTIVE (La Régie utilise cette session)'
    ELSE '❌ Non active'
  END as info
FROM game_sessions
ORDER BY created_at DESC;

-- 2. Afficher TOUTES les finales non complétées
SELECT
  '🏆 TOUTES LES FINALES' as diagnostic,
  f.id as finale_id,
  f.name as finale_name,
  f.status as finale_status,
  f.game_session_id,
  gs.name as session_name,
  gs.status as session_status,
  f.created_at,
  CASE
    WHEN gs.status = 'active' THEN '✅ Liée à une session ACTIVE'
    WHEN gs.status IS NULL THEN '❌ Session introuvable'
    ELSE '⚠️ Session non active'
  END as info
FROM finals f
LEFT JOIN game_sessions gs ON f.game_session_id = gs.id
WHERE f.status != 'completed'
ORDER BY f.created_at DESC;

-- 3. Vérifier si session active a une finale
DO $$
DECLARE
  v_active_session_id UUID;
  v_finale_count INTEGER;
  v_finale_id UUID;
  v_finale_name TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '🔍 DIAGNOSTIC DE CORRESPONDANCE';
  RAISE NOTICE '═══════════════════════════════════════';

  -- Trouver la session active
  SELECT id INTO v_active_session_id
  FROM game_sessions
  WHERE status = 'active'
  LIMIT 1;

  IF v_active_session_id IS NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ PROBLÈME: Aucune session ACTIVE trouvée !';
    RAISE NOTICE '';
    RAISE NOTICE '➡️ SOLUTION:';
    RAISE NOTICE '   UPDATE game_sessions';
    RAISE NOTICE '   SET status = ''active''';
    RAISE NOTICE '   WHERE id = ''[VOTRE_SESSION_ID]'';';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '✅ Session ACTIVE trouvée: %', v_active_session_id;

    -- Chercher une finale pour cette session
    SELECT COUNT(*)
    INTO v_finale_count
    FROM finals
    WHERE game_session_id = v_active_session_id
    AND status != 'completed';

    IF v_finale_count > 0 THEN
      SELECT id, name
      INTO v_finale_id, v_finale_name
      FROM finals
      WHERE game_session_id = v_active_session_id
      AND status != 'completed'
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;

    IF v_finale_count = 0 THEN
      RAISE NOTICE '';
      RAISE NOTICE '❌ PROBLÈME: Aucune finale liée à la session active !';
      RAISE NOTICE '';
      RAISE NOTICE '➡️ La Régie cherche une finale pour session: %', v_active_session_id;
      RAISE NOTICE '   Mais aucune finale n''existe pour cette session.';
      RAISE NOTICE '';
      RAISE NOTICE '➡️ SOLUTION: Créez la finale depuis la Régie';
      RAISE NOTICE '   OU exécutez INSTALL_CLEAN.sql pour créer une finale de test';
      RAISE NOTICE '';
    ELSE
      RAISE NOTICE '✅ Finale trouvée: % (%)', v_finale_name, v_finale_id;
      RAISE NOTICE '';
      RAISE NOTICE '🎉 TOUT EST BON !';
      RAISE NOTICE '';
      RAISE NOTICE 'La session active et la finale correspondent.';
      RAISE NOTICE 'Les boutons devraient s''afficher dans la Régie.';
      RAISE NOTICE '';
      RAISE NOTICE 'Si les boutons ne s''affichent toujours pas:';
      RAISE NOTICE '1. Actualisez la page Régie (F5)';
      RAISE NOTICE '2. Ouvrez la console navigateur (F12)';
      RAISE NOTICE '3. Cherchez les logs commençant par "🔍 FinalManager"';
      RAISE NOTICE '4. Envoyez-moi ces logs pour diagnostic';
      RAISE NOTICE '';
    END IF;
  END IF;

  RAISE NOTICE '═══════════════════════════════════════';
END $$;

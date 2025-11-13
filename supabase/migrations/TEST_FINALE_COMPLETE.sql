-- Script de test complet pour vérifier le système de finale
-- Exécutez ce script pour tester toutes les fonctionnalités

-- ============================================
-- 1. VÉRIFIER QUE LES COLONNES EXISTENT
-- ============================================
DO $$
BEGIN
  -- Vérifier les nouvelles colonnes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'finals' AND column_name = 'name'
  ) THEN
    RAISE EXCEPTION '❌ La migration finale_customization n''a pas été appliquée ! Exécutez d''abord 20251113000001_finale_customization.sql';
  END IF;

  RAISE NOTICE '✅ Colonnes de personnalisation détectées';
END $$;

-- ============================================
-- 2. AFFICHER L'ÉTAT ACTUEL
-- ============================================
\echo '📊 État actuel de la base de données:'
\echo ''

\echo '🏆 Finales existantes:'
SELECT
  f.id,
  f.name,
  f.status,
  f.finalist_count,
  f.point_multiplier,
  f.visual_theme,
  array_length(f.finalist_teams, 1) as nb_teams,
  COUNT(fj.id) as nb_jokers
FROM finals f
LEFT JOIN final_jokers fj ON fj.final_id = f.id
GROUP BY f.id, f.name, f.status, f.finalist_count, f.point_multiplier, f.visual_theme, f.finalist_teams;

\echo ''
\echo '⚡ Jokers configurés:'
SELECT
  jt.name as joker_type,
  jt.icon,
  jt.description,
  COUNT(fj.id) as used_in_finals,
  SUM(fj.quantity) as total_quantity,
  SUM(fj.used_count) as total_used
FROM joker_types jt
LEFT JOIN final_jokers fj ON fj.joker_type_id = jt.id
WHERE jt.is_active = true
GROUP BY jt.id, jt.name, jt.icon, jt.description;

\echo ''
\echo '👥 Équipes disponibles:'
SELECT
  t.id,
  t.name,
  t.score,
  t.is_active
FROM teams t
ORDER BY t.score DESC
LIMIT 10;

-- ============================================
-- 3. NETTOYER LES DONNÉES DE TEST PRÉCÉDENTES
-- ============================================
\echo ''
\echo '🧹 Nettoyage des données de test...'

-- Supprimer les anciennes finales de test
DELETE FROM finals WHERE name LIKE '%TEST%';

-- ============================================
-- 4. CRÉER UNE FINALE DE TEST COMPLÈTE
-- ============================================
\echo ''
\echo '🎯 Création d''une finale de test...'

DO $$
DECLARE
  v_game_session_id UUID;
  v_final_id UUID;
  v_joker_fifty_fifty UUID;
  v_joker_team_call UUID;
  v_joker_public_vote UUID;
  v_teams UUID[];
  v_team_id UUID;
BEGIN
  -- Récupérer la première session de jeu active
  SELECT id INTO v_game_session_id FROM game_sessions WHERE status = 'active' LIMIT 1;

  IF v_game_session_id IS NULL THEN
    RAISE EXCEPTION '❌ Aucune session de jeu active trouvée ! Créez d''abord une session.';
  END IF;

  RAISE NOTICE '✅ Session trouvée: %', v_game_session_id;

  -- Récupérer les IDs des types de jokers
  SELECT id INTO v_joker_fifty_fifty FROM joker_types WHERE name = 'fifty_fifty';
  SELECT id INTO v_joker_team_call FROM joker_types WHERE name = 'team_call';
  SELECT id INTO v_joker_public_vote FROM joker_types WHERE name = 'public_vote';

  IF v_joker_fifty_fifty IS NULL THEN
    RAISE EXCEPTION '❌ Types de jokers introuvables ! Vérifiez la table joker_types.';
  END IF;

  RAISE NOTICE '✅ Jokers trouvés';

  -- Récupérer les 8 meilleures équipes
  SELECT array_agg(id ORDER BY score DESC) INTO v_teams
  FROM (
    SELECT id, score FROM teams ORDER BY score DESC LIMIT 8
  ) sub;

  IF array_length(v_teams, 1) < 4 THEN
    RAISE EXCEPTION '❌ Pas assez d''équipes (minimum 4). Créez d''abord des équipes !';
  END IF;

  RAISE NOTICE '✅ % équipes sélectionnées', array_length(v_teams, 1);

  -- Créer la finale de test
  INSERT INTO finals (
    game_session_id,
    status,
    finalist_teams,
    name,
    finalist_count,
    selection_method,
    min_score_threshold,
    point_multiplier,
    first_correct_bonus,
    speed_bonus_enabled,
    intro_duration,
    visual_theme,
    elimination_mode,
    public_voting_enabled
  ) VALUES (
    v_game_session_id,
    'pending',
    v_teams,
    'TEST - Finale Personnalisée',
    array_length(v_teams, 1),
    'auto',
    0,
    2.0, -- Double points !
    50, -- +50 pts pour la première bonne réponse
    false,
    10,
    'rainbow', -- Thème arc-en-ciel
    false,
    true
  ) RETURNING id INTO v_final_id;

  RAISE NOTICE '✅ Finale créée: %', v_final_id;

  -- Créer les jokers pour chaque équipe
  FOREACH v_team_id IN ARRAY v_teams
  LOOP
    -- 2× fifty_fifty
    INSERT INTO final_jokers (final_id, team_id, joker_type_id, quantity, used_count)
    VALUES (v_final_id, v_team_id, v_joker_fifty_fifty, 2, 0);

    -- 1× team_call
    INSERT INTO final_jokers (final_id, team_id, joker_type_id, quantity, used_count)
    VALUES (v_final_id, v_team_id, v_joker_team_call, 1, 0);

    -- 3× public_vote
    INSERT INTO final_jokers (final_id, team_id, joker_type_id, quantity, used_count)
    VALUES (v_final_id, v_team_id, v_joker_public_vote, 3, 0);
  END LOOP;

  RAISE NOTICE '✅ Jokers créés pour toutes les équipes';

  -- Afficher le résumé
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '🎉 FINALE DE TEST CRÉÉE AVEC SUCCÈS !';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'ID: %', v_final_id;
  RAISE NOTICE 'Nom: TEST - Finale Personnalisée';
  RAISE NOTICE 'Équipes: %', array_length(v_teams, 1);
  RAISE NOTICE 'Points: ×2.0 (DOUBLE!)';
  RAISE NOTICE 'Bonus 1ère réponse: +50 pts';
  RAISE NOTICE 'Thème: 🌈 Arc-en-ciel';
  RAISE NOTICE 'Jokers par équipe:';
  RAISE NOTICE '  • 2× fifty_fifty (➗)';
  RAISE NOTICE '  • 1× team_call (👥)';
  RAISE NOTICE '  • 3× public_vote (🗳️)';
  RAISE NOTICE '═══════════════════════════════════════';

END $$;

-- ============================================
-- 5. VÉRIFICATION FINALE
-- ============================================
\echo ''
\echo '✅ VÉRIFICATION FINALE:'

SELECT
  f.name as "Nom Finale",
  f.status as "Statut",
  f.finalist_count as "Nb Finalistes",
  f.point_multiplier as "Multiplicateur",
  f.first_correct_bonus as "Bonus 1ère",
  f.visual_theme as "Thème",
  COUNT(DISTINCT fj.team_id) as "Équipes avec jokers",
  SUM(fj.quantity) as "Total jokers"
FROM finals f
LEFT JOIN final_jokers fj ON fj.final_id = f.id
WHERE f.name LIKE '%TEST%'
GROUP BY f.id, f.name, f.status, f.finalist_count, f.point_multiplier, f.first_correct_bonus, f.visual_theme;

\echo ''
\echo '🎮 POUR TESTER:'
\echo '1. Allez dans l''onglet Régie'
\echo '2. Scrollez jusqu''à "Mode Final"'
\echo '3. Vous devriez voir la finale TEST'
\echo '4. Cliquez sur "Lancer l''Introduction"'
\echo '5. Puis "Activer la Finale"'
\echo '6. Les équipes peuvent maintenant utiliser leurs jokers !'

-- ============================================
-- VERSION ULTRA-SIMPLE POUR SUPABASE
-- Tout dans un seul bloc DO
-- ============================================

DO $$
DECLARE
  v_game_session_id UUID;
  v_final_id UUID;
  v_joker_fifty_fifty UUID;
  v_joker_team_call UUID;
  v_joker_public_vote UUID;
  v_teams UUID[];
  v_team_id UUID;
  v_column_exists BOOLEAN;
BEGIN
  -- 1. Vérifier que la migration est appliquée
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'finals' AND column_name = 'name'
  ) INTO v_column_exists;

  IF NOT v_column_exists THEN
    RAISE EXCEPTION '❌ Migration non appliquée ! Exécutez d''abord 20251113000001_finale_customization.sql';
  END IF;

  RAISE NOTICE '✅ Migration détectée';

  -- 2. Nettoyer anciennes données de test
  DELETE FROM finals WHERE name LIKE '%TEST%';
  RAISE NOTICE '🧹 Nettoyage effectué';

  -- 3. Récupérer la session de jeu active
  SELECT id INTO v_game_session_id
  FROM game_sessions
  WHERE status = 'active'
  LIMIT 1;

  IF v_game_session_id IS NULL THEN
    RAISE EXCEPTION '❌ Aucune session active ! Créez une session de jeu d''abord.';
  END IF;

  RAISE NOTICE '✅ Session: %', v_game_session_id;

  -- 4. Récupérer les types de jokers
  SELECT id INTO v_joker_fifty_fifty FROM joker_types WHERE name = 'fifty_fifty';
  SELECT id INTO v_joker_team_call FROM joker_types WHERE name = 'team_call';
  SELECT id INTO v_joker_public_vote FROM joker_types WHERE name = 'public_vote';

  IF v_joker_fifty_fifty IS NULL THEN
    RAISE EXCEPTION '❌ Jokers non trouvés ! Vérifiez la table joker_types.';
  END IF;

  RAISE NOTICE '✅ Jokers trouvés';

  -- 5. Récupérer le top 8 des équipes
  SELECT array_agg(id ORDER BY score DESC) INTO v_teams
  FROM (
    SELECT id, score FROM teams ORDER BY score DESC LIMIT 8
  ) sub;

  IF v_teams IS NULL OR array_length(v_teams, 1) < 4 THEN
    RAISE EXCEPTION '❌ Pas assez d''équipes ! Créez au moins 4 équipes avec des scores.';
  END IF;

  RAISE NOTICE '✅ % équipes sélectionnées', array_length(v_teams, 1);

  -- 6. Créer la finale
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
    2.0,
    50,
    false,
    10,
    'rainbow',
    false,
    true
  ) RETURNING id INTO v_final_id;

  RAISE NOTICE '✅ Finale créée: %', v_final_id;

  -- 7. Créer les jokers pour chaque équipe
  FOREACH v_team_id IN ARRAY v_teams
  LOOP
    INSERT INTO final_jokers (final_id, team_id, joker_type_id, quantity, used_count)
    VALUES (v_final_id, v_team_id, v_joker_fifty_fifty, 2, 0);

    INSERT INTO final_jokers (final_id, team_id, joker_type_id, quantity, used_count)
    VALUES (v_final_id, v_team_id, v_joker_team_call, 1, 0);

    INSERT INTO final_jokers (final_id, team_id, joker_type_id, quantity, used_count)
    VALUES (v_final_id, v_team_id, v_joker_public_vote, 3, 0);
  END LOOP;

  RAISE NOTICE '✅ Jokers créés';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '🎉 FINALE CRÉÉE AVEC SUCCÈS !';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'ID: %', v_final_id;
  RAISE NOTICE 'Nom: TEST - Finale Personnalisée';
  RAISE NOTICE 'Équipes: %', array_length(v_teams, 1);
  RAISE NOTICE 'Points: ×2.0 (DOUBLE!)';
  RAISE NOTICE 'Bonus 1ère: +50 pts';
  RAISE NOTICE 'Thème: 🌈 Arc-en-ciel';
  RAISE NOTICE 'Jokers:';
  RAISE NOTICE '  • 2× fifty_fifty (➗)';
  RAISE NOTICE '  • 1× team_call (👥)';
  RAISE NOTICE '  • 3× public_vote (🗳️)';
  RAISE NOTICE '═══════════════════════════════════════';
END $$;

-- 8. Afficher le résultat
SELECT
  f.name as "Nom",
  f.status as "Statut",
  f.finalist_count as "Finalistes",
  f.point_multiplier as "×Points",
  f.first_correct_bonus as "Bonus",
  f.visual_theme as "Thème",
  COUNT(fj.id) as "Jokers"
FROM finals f
LEFT JOIN final_jokers fj ON fj.final_id = f.id
WHERE f.name LIKE '%TEST%'
GROUP BY f.id, f.name, f.status, f.finalist_count, f.point_multiplier, f.first_correct_bonus, f.visual_theme;

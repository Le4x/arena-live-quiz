-- ============================================
-- INSTALLATION ZÉRO CONFIGURATION
-- Ce script fait ABSOLUMENT TOUT automatiquement
-- Même si votre base est vide !
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
  v_team_count INTEGER;
  v_session_count INTEGER;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '🚀 INSTALLATION AUTOMATIQUE COMPLÈTE';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '';

  -- ============================================
  -- PARTIE 1 : CRÉER LES TABLES
  -- ============================================

  RAISE NOTICE '📦 Création des tables...';

  CREATE TABLE IF NOT EXISTS public.joker_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon TEXT DEFAULT '🎯',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS public.finals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_session_id UUID NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'intro', 'active', 'completed')),
    finalist_teams JSONB DEFAULT '[]'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    name TEXT DEFAULT 'Finale',
    finalist_count INTEGER DEFAULT 8,
    selection_method TEXT DEFAULT 'auto' CHECK (selection_method IN ('auto', 'manual')),
    min_score_threshold INTEGER DEFAULT 0,
    point_multiplier DECIMAL DEFAULT 1.0,
    first_correct_bonus INTEGER DEFAULT 0,
    speed_bonus_enabled BOOLEAN DEFAULT false,
    intro_duration INTEGER DEFAULT 10,
    visual_theme TEXT DEFAULT 'gold' CHECK (visual_theme IN ('gold', 'silver', 'bronze', 'purple', 'blue', 'red', 'rainbow')),
    elimination_mode BOOLEAN DEFAULT false,
    public_voting_enabled BOOLEAN DEFAULT true,
    custom_config JSONB DEFAULT '{}'::jsonb
  );

  CREATE TABLE IF NOT EXISTS public.final_jokers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    final_id UUID NOT NULL REFERENCES public.finals(id) ON DELETE CASCADE,
    team_id UUID NOT NULL,
    joker_type_id UUID NOT NULL REFERENCES public.joker_types(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(final_id, team_id, joker_type_id)
  );

  RAISE NOTICE '✅ Tables créées';

  -- ============================================
  -- PARTIE 2 : CRÉER LES TYPES DE JOKERS
  -- ============================================

  RAISE NOTICE '⚡ Création des jokers...';

  DELETE FROM joker_types;

  INSERT INTO joker_types (name, icon, description)
  VALUES
    ('fifty_fifty', '➗', 'Élimine deux mauvaises réponses'),
    ('team_call', '👥', 'Appel à l''équipe pour les capitaines'),
    ('public_vote', '🗳️', 'Vote du public')
  ON CONFLICT (name) DO UPDATE SET
    icon = EXCLUDED.icon,
    description = EXCLUDED.description;

  SELECT id INTO v_joker_fifty_fifty FROM joker_types WHERE name = 'fifty_fifty';
  SELECT id INTO v_joker_team_call FROM joker_types WHERE name = 'team_call';
  SELECT id INTO v_joker_public_vote FROM joker_types WHERE name = 'public_vote';

  RAISE NOTICE '✅ Jokers créés (fifty_fifty, team_call, public_vote)';

  -- ============================================
  -- PARTIE 3 : VÉRIFIER/CRÉER SESSION
  -- ============================================

  RAISE NOTICE '🎮 Vérification session de jeu...';

  SELECT COUNT(*) INTO v_session_count FROM game_sessions WHERE status = 'active';

  IF v_session_count = 0 THEN
    RAISE NOTICE '⚠️  Aucune session active trouvée';
    RAISE NOTICE '📝 Création d''une session de test...';

    INSERT INTO game_sessions (name, status, selected_rounds, has_final)
    VALUES ('Session Auto-Créée', 'active', '[]'::jsonb, true)
    RETURNING id INTO v_game_session_id;

    RAISE NOTICE '✅ Session créée: %', v_game_session_id;
  ELSE
    SELECT id INTO v_game_session_id
    FROM game_sessions
    WHERE status = 'active'
    LIMIT 1;

    RAISE NOTICE '✅ Session active trouvée: %', v_game_session_id;
  END IF;

  -- ============================================
  -- PARTIE 4 : VÉRIFIER/CRÉER ÉQUIPES
  -- ============================================

  RAISE NOTICE '👥 Vérification équipes...';

  SELECT COUNT(*) INTO v_team_count FROM teams;

  IF v_team_count < 4 THEN
    RAISE NOTICE '⚠️  Moins de 4 équipes trouvées (%)', v_team_count;
    RAISE NOTICE '📝 Création de 8 équipes de test...';

    INSERT INTO teams (name, color, score, is_active, game_session_id)
    SELECT
      'Équipe ' || i,
      CASE
        WHEN i = 1 THEN '#FF0000'
        WHEN i = 2 THEN '#00FF00'
        WHEN i = 3 THEN '#0000FF'
        WHEN i = 4 THEN '#FFFF00'
        WHEN i = 5 THEN '#FF00FF'
        WHEN i = 6 THEN '#00FFFF'
        WHEN i = 7 THEN '#FFA500'
        ELSE '#800080'
      END,
      105 - (i * 5), -- Scores de 100 à 65
      true,
      v_game_session_id
    FROM generate_series(1, 8) AS i;

    RAISE NOTICE '✅ 8 équipes créées avec scores';
  ELSE
    RAISE NOTICE '✅ % équipes trouvées', v_team_count;
  END IF;

  -- ============================================
  -- PARTIE 5 : NETTOYER ANCIENNES FINALES
  -- ============================================

  DELETE FROM finals WHERE name LIKE '%TEST%';
  RAISE NOTICE '🧹 Nettoyage effectué';

  -- ============================================
  -- PARTIE 6 : CRÉER LA FINALE
  -- ============================================

  RAISE NOTICE '🏆 Création de la finale...';

  -- Récupérer le top 8
  SELECT array_agg(id ORDER BY score DESC) INTO v_teams
  FROM (
    SELECT id, score FROM teams ORDER BY score DESC LIMIT 8
  ) sub;

  -- Créer la finale
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

  -- ============================================
  -- PARTIE 7 : CRÉER LES JOKERS
  -- ============================================

  RAISE NOTICE '⚡ Attribution des jokers...';

  FOREACH v_team_id IN ARRAY v_teams
  LOOP
    INSERT INTO final_jokers (final_id, team_id, joker_type_id, quantity, used_count)
    VALUES (v_final_id, v_team_id, v_joker_fifty_fifty, 2, 0);

    INSERT INTO final_jokers (final_id, team_id, joker_type_id, quantity, used_count)
    VALUES (v_final_id, v_team_id, v_joker_team_call, 1, 0);

    INSERT INTO final_jokers (final_id, team_id, joker_type_id, quantity, used_count)
    VALUES (v_final_id, v_team_id, v_joker_public_vote, 3, 0);
  END LOOP;

  RAISE NOTICE '✅ Jokers attribués à % équipes', array_length(v_teams, 1);

  -- ============================================
  -- RÉSUMÉ FINAL
  -- ============================================

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '🎉 INSTALLATION TERMINÉE AVEC SUCCÈS !';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📦 CRÉÉ:';
  RAISE NOTICE '  • Tables: joker_types, finals, final_jokers';
  RAISE NOTICE '  • Types de jokers: ➗ 👥 🗳️';
  RAISE NOTICE '  • Session: %', v_game_session_id;
  RAISE NOTICE '  • Équipes: % avec scores', array_length(v_teams, 1);
  RAISE NOTICE '';
  RAISE NOTICE '🏆 FINALE DE TEST:';
  RAISE NOTICE '  ID: %', v_final_id;
  RAISE NOTICE '  Nom: TEST - Finale Personnalisée';
  RAISE NOTICE '  Équipes: %', array_length(v_teams, 1);
  RAISE NOTICE '  Points: ×2.0 (DOUBLE!)';
  RAISE NOTICE '  Bonus 1ère: +50 pts';
  RAISE NOTICE '  Thème: 🌈 Arc-en-ciel';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ JOKERS PAR ÉQUIPE:';
  RAISE NOTICE '  • 2× fifty_fifty (➗)';
  RAISE NOTICE '  • 1× team_call (👥)';
  RAISE NOTICE '  • 3× public_vote (🗳️)';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '📍 PROCHAINES ÉTAPES:';
  RAISE NOTICE '1. Ouvrez http://localhost:5173/regie';
  RAISE NOTICE '2. Scrollez vers "Mode Final"';
  RAISE NOTICE '3. Cliquez "Lancer l''Introduction"';
  RAISE NOTICE '4. Cliquez "Activer la Finale"';
  RAISE NOTICE '5. Testez les jokers sur http://localhost:5173/client';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Afficher le résultat
SELECT
  'FINALE DE TEST' as "Type",
  f.name as "Nom",
  f.status as "Statut",
  f.finalist_count as "Équipes",
  f.point_multiplier as "×Points",
  f.visual_theme as "Thème",
  COUNT(fj.id) as "Jokers"
FROM finals f
LEFT JOIN final_jokers fj ON fj.final_id = f.id
WHERE f.name LIKE '%TEST%'
GROUP BY f.id, f.name, f.status, f.finalist_count, f.point_multiplier, f.visual_theme;

SELECT
  'ÉQUIPES CRÉÉES' as "Type",
  t.name as "Nom",
  t.score as "Score",
  t.color as "Couleur"
FROM teams t
ORDER BY t.score DESC
LIMIT 8;

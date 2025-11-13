-- ============================================
-- INSTALLATION PROPRE - VERSION FINALE
-- ============================================
-- Ce script crée TOUT proprement de A à Z
-- ============================================

DO $$
DECLARE
  v_game_session_id UUID;
  v_final_id UUID;
  v_joker_fifty_fifty UUID;
  v_joker_team_call UUID;
  v_joker_public_vote UUID;
  v_teams UUID[];
  v_teams_jsonb JSONB;
  v_team_id UUID;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '🚀 INSTALLATION PROPRE';
  RAISE NOTICE '═══════════════════════════════════════';

  -- ============================================
  -- 1. CRÉER LES TABLES
  -- ============================================

  RAISE NOTICE '📦 Création des tables...';

  -- Table joker_types
  CREATE TABLE IF NOT EXISTS public.joker_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon TEXT DEFAULT '🎯',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );

  -- Table finals avec JSONB pour finalist_teams
  CREATE TABLE IF NOT EXISTS public.finals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_session_id UUID NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'intro', 'active', 'completed')),
    finalist_teams JSONB DEFAULT '[]'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Colonnes de personnalisation
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

  -- Table final_jokers
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
  -- 2. CRÉER LES TYPES DE JOKERS
  -- ============================================

  RAISE NOTICE '⚡ Création des jokers...';

  -- Supprimer les anciens
  DELETE FROM joker_types;

  -- Créer les 3 jokers
  INSERT INTO joker_types (name, icon, description)
  VALUES
    ('fifty_fifty', '➗', 'Élimine deux mauvaises réponses'),
    ('team_call', '👥', 'Appel à l''équipe'),
    ('public_vote', '🗳️', 'Vote du public')
  ON CONFLICT (name) DO UPDATE SET
    icon = EXCLUDED.icon,
    description = EXCLUDED.description;

  -- Récupérer les IDs
  SELECT id INTO v_joker_fifty_fifty FROM joker_types WHERE name = 'fifty_fifty';
  SELECT id INTO v_joker_team_call FROM joker_types WHERE name = 'team_call';
  SELECT id INTO v_joker_public_vote FROM joker_types WHERE name = 'public_vote';

  RAISE NOTICE '✅ Jokers créés: ➗ 👥 🗳️';

  -- ============================================
  -- 3. TROUVER/CRÉER UNE SESSION ACTIVE
  -- ============================================

  RAISE NOTICE '🎮 Recherche session active...';

  -- Chercher une session active
  SELECT id INTO v_game_session_id
  FROM game_sessions
  WHERE status = 'active'
  LIMIT 1;

  -- Si aucune session active, en créer une
  IF v_game_session_id IS NULL THEN
    -- Chercher n'importe quelle session
    SELECT id INTO v_game_session_id
    FROM game_sessions
    LIMIT 1;

    -- Si aucune session du tout, en créer une
    IF v_game_session_id IS NULL THEN
      INSERT INTO game_sessions (name, status, selected_rounds, has_final)
      VALUES ('Session Finale', 'active', '[]'::jsonb, true)
      RETURNING id INTO v_game_session_id;
      RAISE NOTICE '✅ Session créée: %', v_game_session_id;
    ELSE
      -- Activer la session existante
      UPDATE game_sessions
      SET status = 'active', has_final = true
      WHERE id = v_game_session_id;
      RAISE NOTICE '✅ Session activée: %', v_game_session_id;
    END IF;
  ELSE
    -- Activer has_final sur la session
    UPDATE game_sessions
    SET has_final = true
    WHERE id = v_game_session_id;
    RAISE NOTICE '✅ Session trouvée: %', v_game_session_id;
  END IF;

  -- ============================================
  -- 4. CRÉER DES ÉQUIPES SI NÉCESSAIRE
  -- ============================================

  RAISE NOTICE '👥 Vérification équipes...';

  -- Compter les équipes
  IF (SELECT COUNT(*) FROM teams WHERE game_session_id = v_game_session_id) < 4 THEN
    RAISE NOTICE '📝 Création de 8 équipes...';

    -- Supprimer les anciennes équipes de cette session
    DELETE FROM teams WHERE game_session_id = v_game_session_id;

    -- Créer 8 équipes
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
      105 - (i * 5),
      true,
      v_game_session_id
    FROM generate_series(1, 8) AS i;

    RAISE NOTICE '✅ 8 équipes créées';
  ELSE
    RAISE NOTICE '✅ Équipes existantes';
  END IF;

  -- ============================================
  -- 5. NETTOYER LES ANCIENNES FINALES
  -- ============================================

  RAISE NOTICE '🧹 Nettoyage anciennes finales...';

  DELETE FROM finals WHERE game_session_id = v_game_session_id;

  RAISE NOTICE '✅ Nettoyage terminé';

  -- ============================================
  -- 6. CRÉER LA FINALE
  -- ============================================

  RAISE NOTICE '🏆 Création de la finale...';

  -- Récupérer les 8 meilleures équipes en UUID[]
  SELECT array_agg(id ORDER BY score DESC) INTO v_teams
  FROM (
    SELECT id, score
    FROM teams
    WHERE game_session_id = v_game_session_id
    ORDER BY score DESC
    LIMIT 8
  ) sub;

  -- Convertir UUID[] en JSONB array de strings
  -- IMPORTANT: to_jsonb() sur un UUID[] crée un array JSON
  v_teams_jsonb := to_jsonb(v_teams);

  RAISE NOTICE '📊 Équipes sélectionnées: %', array_length(v_teams, 1);
  RAISE NOTICE '📄 JSONB: %', v_teams_jsonb;

  -- Créer la finale avec JSONB
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
    v_teams_jsonb,
    'Finale de Test',
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
  -- 7. CRÉER LES JOKERS
  -- ============================================

  RAISE NOTICE '⚡ Attribution des jokers...';

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

  RAISE NOTICE '✅ Jokers attribués à % équipes', array_length(v_teams, 1);

  -- ============================================
  -- RÉSUMÉ FINAL
  -- ============================================

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '🎉 INSTALLATION RÉUSSIE !';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📍 FINALE:';
  RAISE NOTICE '  ID: %', v_final_id;
  RAISE NOTICE '  Session: %', v_game_session_id;
  RAISE NOTICE '  Nom: Finale de Test';
  RAISE NOTICE '  Statut: pending';
  RAISE NOTICE '  Équipes: %', array_length(v_teams, 1);
  RAISE NOTICE '';
  RAISE NOTICE '⚡ JOKERS PAR ÉQUIPE:';
  RAISE NOTICE '  • 2× ➗ fifty_fifty';
  RAISE NOTICE '  • 1× 👥 team_call';
  RAISE NOTICE '  • 3× 🗳️ public_vote';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '📍 PROCHAINES ÉTAPES:';
  RAISE NOTICE '1. Actualisez la page Régie (F5)';
  RAISE NOTICE '2. Scrollez vers "Mode Final"';
  RAISE NOTICE '3. Vous devriez voir:';
  RAISE NOTICE '   "Finale de Test créée"';
  RAISE NOTICE '   [🎬 Lancer l''Introduction]';
  RAISE NOTICE '4. Cliquez sur le bouton !';
  RAISE NOTICE '═══════════════════════════════════════';

END $$;

-- Afficher le résultat final
SELECT
  '✅ FINALE CRÉÉE' as "Résultat",
  f.id,
  f.name as "Nom",
  f.status as "Statut",
  f.game_session_id as "Session ID",
  gs.name as "Session",
  gs.status as "Session Statut",
  f.finalist_count as "Équipes",
  COUNT(fj.id) as "Jokers"
FROM finals f
JOIN game_sessions gs ON f.game_session_id = gs.id
LEFT JOIN final_jokers fj ON fj.final_id = f.id
WHERE f.name = 'Finale de Test'
GROUP BY f.id, f.name, f.status, f.game_session_id, gs.name, gs.status, f.finalist_count;

-- ============================================
-- INSTALLATION RAPIDE - VERSION CORRIGÉE
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
  RAISE NOTICE '🚀 INSTALLATION RAPIDE - CORRIGÉE';
  RAISE NOTICE '═══════════════════════════════════════';

  -- Créer les tables
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

  -- Créer les jokers
  DELETE FROM joker_types;
  INSERT INTO joker_types (name, icon, description)
  VALUES
    ('fifty_fifty', '➗', 'Élimine deux mauvaises réponses'),
    ('team_call', '👥', 'Appel à l''équipe'),
    ('public_vote', '🗳️', 'Vote du public')
  ON CONFLICT (name) DO UPDATE SET icon = EXCLUDED.icon;

  SELECT id INTO v_joker_fifty_fifty FROM joker_types WHERE name = 'fifty_fifty';
  SELECT id INTO v_joker_team_call FROM joker_types WHERE name = 'team_call';
  SELECT id INTO v_joker_public_vote FROM joker_types WHERE name = 'public_vote';
  RAISE NOTICE '✅ Jokers créés';

  -- Session
  SELECT COUNT(*) INTO v_session_count FROM game_sessions WHERE status = 'active';
  IF v_session_count = 0 THEN
    INSERT INTO game_sessions (name, status, selected_rounds, has_final)
    VALUES ('Session Auto', 'active', '[]'::jsonb, true)
    RETURNING id INTO v_game_session_id;
    RAISE NOTICE '✅ Session créée';
  ELSE
    SELECT id INTO v_game_session_id FROM game_sessions WHERE status = 'active' LIMIT 1;
    RAISE NOTICE '✅ Session trouvée';
  END IF;

  -- Équipes
  SELECT COUNT(*) INTO v_team_count FROM teams;
  IF v_team_count < 4 THEN
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

  -- Nettoyer
  DELETE FROM finals WHERE name LIKE '%TEST%';

  -- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  -- RÉCUPÉRER LES ÉQUIPES EN UUID[]
  -- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  SELECT array_agg(id ORDER BY score DESC) INTO v_teams
  FROM (SELECT id, score FROM teams ORDER BY score DESC LIMIT 8) sub;

  -- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  -- CONVERTIR EN JSONB AVEC to_jsonb() !!!
  -- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  INSERT INTO finals (
    game_session_id,
    status,
    finalist_teams,
    name,
    finalist_count,
    selection_method,
    point_multiplier,
    first_correct_bonus,
    visual_theme
  ) VALUES (
    v_game_session_id,
    'pending',
    to_jsonb(v_teams),  -- <<<< CONVERSION ICI !
    'TEST - Finale CORRIGÉE',
    array_length(v_teams, 1),
    'auto',
    2.0,
    50,
    'rainbow'
  ) RETURNING id INTO v_final_id;

  RAISE NOTICE '✅ Finale créée: %', v_final_id;

  -- Jokers
  FOREACH v_team_id IN ARRAY v_teams
  LOOP
    INSERT INTO final_jokers (final_id, team_id, joker_type_id, quantity)
    VALUES
      (v_final_id, v_team_id, v_joker_fifty_fifty, 2),
      (v_final_id, v_team_id, v_joker_team_call, 1),
      (v_final_id, v_team_id, v_joker_public_vote, 3);
  END LOOP;

  RAISE NOTICE '✅ Jokers créés';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '🎉 SUCCÈS ! Finale: %', v_final_id;
  RAISE NOTICE '═══════════════════════════════════════';
END $$;

-- Résultat
SELECT
  f.name as "Nom",
  f.status as "Statut",
  f.finalist_count as "Finalistes",
  COUNT(fj.id) as "Jokers"
FROM finals f
LEFT JOIN final_jokers fj ON fj.final_id = f.id
WHERE f.name LIKE '%TEST%CORRIGÉE%'
GROUP BY f.id, f.name, f.status, f.finalist_count;

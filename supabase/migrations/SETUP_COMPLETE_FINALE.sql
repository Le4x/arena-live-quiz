-- ============================================
-- SETUP COMPLET - FINALE PERSONNALISABLE
-- Ce script fait TOUT : migrations + jokers + test
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
BEGIN
  RAISE NOTICE '🚀 Début du setup complet...';

  -- ============================================
  -- PARTIE 1 : CRÉER LES TABLES SI NÉCESSAIRE
  -- ============================================

  -- Créer la table joker_types si elle n'existe pas
  CREATE TABLE IF NOT EXISTS public.joker_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon TEXT DEFAULT '🎯',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );
  RAISE NOTICE '✅ Table joker_types vérifiée';

  -- Créer la table finals si elle n'existe pas (avec tous les champs)
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
  RAISE NOTICE '✅ Table finals vérifiée';

  -- Créer la table final_jokers si elle n'existe pas
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
  RAISE NOTICE '✅ Table final_jokers vérifiée';

  -- ============================================
  -- PARTIE 2 : CRÉER LES TYPES DE JOKERS
  -- ============================================

  -- Supprimer les anciens types
  DELETE FROM joker_types;

  -- Créer les 3 types de jokers
  INSERT INTO joker_types (name, icon, description)
  VALUES
    ('fifty_fifty', '➗', 'Élimine deux mauvaises réponses'),
    ('team_call', '👥', 'Appel à l''équipe pour les capitaines'),
    ('public_vote', '🗳️', 'Vote du public')
  ON CONFLICT (name) DO UPDATE SET
    icon = EXCLUDED.icon,
    description = EXCLUDED.description;

  RAISE NOTICE '✅ Types de jokers créés';

  -- ============================================
  -- PARTIE 3 : NETTOYER LES ANCIENNES FINALES DE TEST
  -- ============================================

  DELETE FROM finals WHERE name LIKE '%TEST%';
  RAISE NOTICE '🧹 Nettoyage effectué';

  -- ============================================
  -- PARTIE 4 : CRÉER UNE FINALE DE TEST
  -- ============================================

  -- Récupérer la session de jeu active
  SELECT id INTO v_game_session_id
  FROM game_sessions
  WHERE status = 'active'
  LIMIT 1;

  IF v_game_session_id IS NULL THEN
    RAISE EXCEPTION '❌ Aucune session active ! Créez une session de jeu d''abord (dans la Régie).';
  END IF;

  RAISE NOTICE '✅ Session trouvée: %', v_game_session_id;

  -- Récupérer les types de jokers
  SELECT id INTO v_joker_fifty_fifty FROM joker_types WHERE name = 'fifty_fifty';
  SELECT id INTO v_joker_team_call FROM joker_types WHERE name = 'team_call';
  SELECT id INTO v_joker_public_vote FROM joker_types WHERE name = 'public_vote';

  RAISE NOTICE '✅ Jokers récupérés';

  -- Récupérer le top 8 des équipes
  SELECT array_agg(id ORDER BY score DESC) INTO v_teams
  FROM (
    SELECT id, score FROM teams ORDER BY score DESC LIMIT 8
  ) sub;

  IF v_teams IS NULL OR array_length(v_teams, 1) < 4 THEN
    RAISE EXCEPTION '❌ Pas assez d''équipes ! Créez au moins 4 équipes avec des scores dans la Régie.';
  END IF;

  RAISE NOTICE '✅ % équipes sélectionnées', array_length(v_teams, 1);

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

  -- Créer les jokers pour chaque équipe
  FOREACH v_team_id IN ARRAY v_teams
  LOOP
    INSERT INTO final_jokers (final_id, team_id, joker_type_id, quantity, used_count)
    VALUES (v_final_id, v_team_id, v_joker_fifty_fifty, 2, 0);

    INSERT INTO final_jokers (final_id, team_id, joker_type_id, quantity, used_count)
    VALUES (v_final_id, v_team_id, v_joker_team_call, 1, 0);

    INSERT INTO final_jokers (final_id, team_id, joker_type_id, quantity, used_count)
    VALUES (v_final_id, v_team_id, v_joker_public_vote, 3, 0);
  END LOOP;

  RAISE NOTICE '✅ Jokers créés pour toutes les équipes';

  -- ============================================
  -- RÉSUMÉ FINAL
  -- ============================================

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '🎉 SETUP COMPLET TERMINÉ !';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Tables créées: joker_types, finals, final_jokers';
  RAISE NOTICE 'Types de jokers: fifty_fifty, team_call, public_vote';
  RAISE NOTICE '';
  RAISE NOTICE 'FINALE DE TEST CRÉÉE:';
  RAISE NOTICE 'ID: %', v_final_id;
  RAISE NOTICE 'Nom: TEST - Finale Personnalisée';
  RAISE NOTICE 'Équipes: %', array_length(v_teams, 1);
  RAISE NOTICE 'Points: ×2.0 (DOUBLE!)';
  RAISE NOTICE 'Bonus 1ère: +50 pts';
  RAISE NOTICE 'Thème: 🌈 Arc-en-ciel';
  RAISE NOTICE '';
  RAISE NOTICE 'Jokers par équipe:';
  RAISE NOTICE '  • 2× fifty_fifty (➗)';
  RAISE NOTICE '  • 1× team_call (👥)';
  RAISE NOTICE '  • 3× public_vote (🗳️)';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📍 PROCHAINES ÉTAPES:';
  RAISE NOTICE '1. Ouvrez la Régie';
  RAISE NOTICE '2. Scrollez vers "Mode Final"';
  RAISE NOTICE '3. Lancez l''introduction';
  RAISE NOTICE '4. Activez la finale';
  RAISE NOTICE '5. Testez les jokers côté client !';
  RAISE NOTICE '';
END $$;

-- Afficher le résultat
SELECT
  f.name as "Nom",
  f.status as "Statut",
  f.finalist_count as "Finalistes",
  f.point_multiplier as "×Points",
  f.first_correct_bonus as "Bonus",
  f.visual_theme as "Thème",
  COUNT(fj.id) as "Jokers créés"
FROM finals f
LEFT JOIN final_jokers fj ON fj.final_id = f.id
WHERE f.name LIKE '%TEST%'
GROUP BY f.id, f.name, f.status, f.finalist_count, f.point_multiplier, f.first_correct_bonus, f.visual_theme;

-- Migration pour rendre les finales totalement personnalisables
-- Ajoute tous les champs de configuration pour des finales sur mesure

-- 1. Ajouter les colonnes de personnalisation à la table finals
ALTER TABLE public.finals
ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Finale',
ADD COLUMN IF NOT EXISTS finalist_count INTEGER DEFAULT 8,
ADD COLUMN IF NOT EXISTS selection_method TEXT DEFAULT 'auto' CHECK (selection_method IN ('auto', 'manual')),
ADD COLUMN IF NOT EXISTS min_score_threshold INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS point_multiplier DECIMAL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS first_correct_bonus INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS speed_bonus_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS intro_duration INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS visual_theme TEXT DEFAULT 'gold' CHECK (visual_theme IN ('gold', 'silver', 'bronze', 'purple', 'blue', 'red', 'rainbow')),
ADD COLUMN IF NOT EXISTS elimination_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS public_voting_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS custom_config JSONB DEFAULT '{}'::jsonb;

-- 2. Ajouter une table pour la configuration des jokers par finale
CREATE TABLE IF NOT EXISTS public.final_joker_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  final_id UUID NOT NULL REFERENCES public.finals(id) ON DELETE CASCADE,
  joker_type_id UUID NOT NULL REFERENCES public.joker_types(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  quantity_per_team INTEGER DEFAULT 1,
  unlock_after_question INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(final_id, joker_type_id)
);

-- 3. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_final_joker_config_final_id ON public.final_joker_config(final_id);
CREATE INDEX IF NOT EXISTS idx_finals_game_session ON public.finals(game_session_id);
CREATE INDEX IF NOT EXISTS idx_finals_status ON public.finals(status);

-- 4. Commentaires pour documentation
COMMENT ON COLUMN public.finals.name IS 'Nom personnalisé de la finale (ex: "Demi-Finale", "Grande Finale")';
COMMENT ON COLUMN public.finals.finalist_count IS 'Nombre d''équipes finalistes (4, 6, 8, 10, 12, etc.)';
COMMENT ON COLUMN public.finals.selection_method IS 'Méthode de sélection: auto (top N) ou manual';
COMMENT ON COLUMN public.finals.min_score_threshold IS 'Score minimum requis pour participer';
COMMENT ON COLUMN public.finals.point_multiplier IS 'Multiplicateur de points pour la finale (1.0 = normal, 2.0 = double)';
COMMENT ON COLUMN public.finals.first_correct_bonus IS 'Points bonus pour la première équipe qui répond correctement';
COMMENT ON COLUMN public.finals.speed_bonus_enabled IS 'Activer les bonus de vitesse';
COMMENT ON COLUMN public.finals.intro_duration IS 'Durée de l''écran d''introduction en secondes';
COMMENT ON COLUMN public.finals.visual_theme IS 'Thème visuel de la finale';
COMMENT ON COLUMN public.finals.elimination_mode IS 'Mode élimination progressive des équipes';
COMMENT ON COLUMN public.finals.public_voting_enabled IS 'Autoriser le vote du public';
COMMENT ON COLUMN public.finals.custom_config IS 'Configuration JSON personnalisée supplémentaire';

COMMENT ON TABLE public.final_joker_config IS 'Configuration des jokers par finale (actif/inactif, quantité, déblocage)';

-- 5. Fonction helper pour valider la configuration d'une finale
CREATE OR REPLACE FUNCTION validate_finale_config(finale_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  finale_record RECORD;
  team_count INTEGER;
BEGIN
  -- Récupérer la finale
  SELECT * INTO finale_record FROM public.finals WHERE id = finale_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Finale introuvable';
  END IF;

  -- Valider le nombre d'équipes
  team_count := jsonb_array_length(finale_record.finalist_teams);
  IF team_count != finale_record.finalist_count THEN
    RAISE EXCEPTION 'Le nombre d''équipes (%) ne correspond pas à finalist_count (%)',
      team_count, finale_record.finalist_count;
  END IF;

  -- Valider le multiplicateur
  IF finale_record.point_multiplier < 0.1 OR finale_record.point_multiplier > 10.0 THEN
    RAISE EXCEPTION 'Le multiplicateur de points doit être entre 0.1 et 10.0';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 6. Logs de migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration finale_customization appliquée avec succès';
  RAISE NOTICE '📊 Nouvelles colonnes ajoutées à la table finals';
  RAISE NOTICE '🎮 Table final_joker_config créée';
  RAISE NOTICE '🔧 Fonction validate_finale_config créée';
END $$;

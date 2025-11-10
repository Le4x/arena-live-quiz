-- Migration: Système de finale personnalisable avec jokers cool

-- Améliorer la table finals pour plus de personnalisation
ALTER TABLE public.finals ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'elimination' CHECK (mode IN ('elimination', 'lives', 'points_race', 'sudden_death', 'tournament'));
ALTER TABLE public.finals ADD COLUMN IF NOT EXISTS nb_finalists INTEGER DEFAULT 8;
ALTER TABLE public.finals ADD COLUMN IF NOT EXISTS starting_lives INTEGER DEFAULT 3;
ALTER TABLE public.finals ADD COLUMN IF NOT EXISTS points_to_win INTEGER DEFAULT 100;
ALTER TABLE public.finals ADD COLUMN IF NOT EXISTS allow_comebacks BOOLEAN DEFAULT true;
ALTER TABLE public.finals ADD COLUMN IF NOT EXISTS joker_refill_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.finals ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

-- Améliorer la table final_jokers pour tracking d'utilisation
ALTER TABLE public.final_jokers ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0;
ALTER TABLE public.final_jokers ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Table pour tracking des vies des finalistes
CREATE TABLE IF NOT EXISTS public.final_lives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  final_id UUID REFERENCES public.finals(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  lives_remaining INTEGER DEFAULT 3 NOT NULL,
  lives_lost INTEGER DEFAULT 0 NOT NULL,
  is_eliminated BOOLEAN DEFAULT false,
  eliminated_at TIMESTAMPTZ,

  UNIQUE(final_id, team_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_final_lives_final_id ON public.final_lives(final_id);
CREATE INDEX IF NOT EXISTS idx_final_lives_team_id ON public.final_lives(team_id);
CREATE INDEX IF NOT EXISTS idx_final_lives_eliminated ON public.final_lives(is_eliminated);

-- Table pour tracking des utilisations de jokers
CREATE TABLE IF NOT EXISTS public.joker_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  final_id UUID REFERENCES public.finals(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  joker_type_id UUID REFERENCES public.joker_types(id) ON DELETE CASCADE NOT NULL,
  question_instance_id UUID REFERENCES public.question_instances(id) ON DELETE SET NULL,

  effect_data JSONB DEFAULT '{}'::jsonb,
  success BOOLEAN DEFAULT true,

  used_by TEXT, -- Nom du joueur qui a utilisé le joker
  notes TEXT
);

-- Index
CREATE INDEX IF NOT EXISTS idx_joker_usages_final_id ON public.joker_usages(final_id);
CREATE INDEX IF NOT EXISTS idx_joker_usages_team_id ON public.joker_usages(team_id);
CREATE INDEX IF NOT EXISTS idx_joker_usages_question ON public.joker_usages(question_instance_id);

-- Nouveaux jokers cool
INSERT INTO public.joker_types (id, name, description, icon, effect_type, effect_value, is_active, rarity)
VALUES
  -- Jokers défensifs
  (gen_random_uuid(), 'BOUCLIER', 'Protège contre une mauvaise réponse - pas de pénalité ni perte de vie', '🛡️', 'shield', '{"protection": true}', true, 'rare'),
  (gen_random_uuid(), 'RESURRECTION', 'Récupère une vie perdue (si mode vies)', '❤️‍🩹', 'heal', '{"lives": 1}', true, 'legendary'),

  -- Jokers offensifs
  (gen_random_uuid(), 'VOL_POINTS', 'Vole 10 points à l''équipe de ton choix', '🦹', 'steal', '{"points": 10}', true, 'epic'),
  (gen_random_uuid(), 'SABOTAGE', 'Bloque le buzzer d''une équipe pour cette question', '⚡', 'block_buzzer', '{"duration": "question"}', true, 'epic'),
  (gen_random_uuid(), 'CONFUSION', 'Inverse 2 options de réponse pour les autres équipes', '🌪️', 'swap_options', '{"count": 2}', true, 'rare'),

  -- Jokers informatifs
  (gen_random_uuid(), 'VISION', 'Révèle quelle option est correcte (QCM uniquement)', '👁️', 'reveal_answer', '{}', true, 'legendary'),
  (gen_random_uuid(), 'INDICE', 'Élimine 2 mauvaises réponses (QCM uniquement)', '💡', 'eliminate', '{"count": 2}', true, 'common'),
  (gen_random_uuid(), 'TEMPS_LIBRE', 'Ajoute 15 secondes au chrono de l''équipe', '⏰', 'add_time', '{"seconds": 15}', true, 'rare'),

  -- Jokers tactiques
  (gen_random_uuid(), 'DOUBLE_OU_RIEN', 'Double les points si bonne réponse, 0 si mauvaise', '🎲', 'double_or_nothing', '{}', true, 'epic'),
  (gen_random_uuid(), 'PASSE_TON_TOUR', 'Saute cette question sans pénalité', '⏭️', 'skip', '{}', true, 'common'),
  (gen_random_uuid(), 'MULTIPLICATEUR', 'X2 sur les points de cette question', '✖️2', 'multiplier', '{"factor": 2}', true, 'epic'),
  (gen_random_uuid(), 'CHANCE', 'Réponse aléatoire - 25% de réussir', '🍀', 'random_answer', '{"success_rate": 0.25}', true, 'rare'),

  -- Jokers d''équipe
  (gen_random_uuid(), 'PARTAGE', 'Partage tes points avec une autre équipe', '🤝', 'share_points', '{"percentage": 50}', true, 'rare'),
  (gen_random_uuid(), 'ALLIANCE', 'Forme une alliance avec une équipe - points partagés pendant 3 questions', '🔗', 'alliance', '{"duration": 3}', true, 'legendary'),
  (gen_random_uuid(), 'TRAHISON', 'Rompt une alliance et vole tous les points de l''allié', '🗡️', 'betray', '{}', true, 'legendary')
ON CONFLICT (id) DO NOTHING;

-- RLS Policies
ALTER TABLE public.final_lives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.joker_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Final lives visible by authenticated users"
  ON public.final_lives FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage final lives"
  ON public.final_lives FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Joker usages visible by authenticated users"
  ON public.joker_usages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert joker usages"
  ON public.joker_usages FOR INSERT TO authenticated WITH CHECK (true);

-- Grants
GRANT ALL ON public.final_lives TO authenticated;
GRANT ALL ON public.joker_usages TO authenticated;

-- Fonction pour utiliser un joker
CREATE OR REPLACE FUNCTION public.use_joker(
  p_final_id UUID,
  p_team_id UUID,
  p_joker_type_id UUID,
  p_question_instance_id UUID DEFAULT NULL,
  p_effect_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_joker RECORD;
  v_result JSONB;
BEGIN
  -- Vérifier que l'équipe a ce joker disponible
  SELECT * INTO v_joker
  FROM public.final_jokers
  WHERE final_id = p_final_id
    AND team_id = p_team_id
    AND joker_type_id = p_joker_type_id
    AND quantity > used_count;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Joker non disponible ou déjà utilisé'
    );
  END IF;

  -- Incrémenter le compteur d'utilisation
  UPDATE public.final_jokers
  SET used_count = used_count + 1,
      last_used_at = now()
  WHERE final_id = p_final_id
    AND team_id = p_team_id
    AND joker_type_id = p_joker_type_id;

  -- Enregistrer l'utilisation
  INSERT INTO public.joker_usages (
    final_id,
    team_id,
    joker_type_id,
    question_instance_id,
    effect_data
  ) VALUES (
    p_final_id,
    p_team_id,
    p_joker_type_id,
    p_question_instance_id,
    p_effect_data
  );

  RETURN jsonb_build_object(
    'success', true,
    'joker_type', (SELECT name FROM public.joker_types WHERE id = p_joker_type_id),
    'remaining', v_joker.quantity - v_joker.used_count - 1
  );
END;
$$;

-- Fonction pour perdre une vie
CREATE OR REPLACE FUNCTION public.lose_life(
  p_final_id UUID,
  p_team_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lives RECORD;
BEGIN
  -- Récupérer les vies actuelles
  SELECT * INTO v_lives
  FROM public.final_lives
  WHERE final_id = p_final_id AND team_id = p_team_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Équipe non trouvée');
  END IF;

  IF v_lives.is_eliminated THEN
    RETURN jsonb_build_object('success', false, 'error', 'Équipe déjà éliminée');
  END IF;

  -- Décrémenter les vies
  UPDATE public.final_lives
  SET
    lives_remaining = GREATEST(0, lives_remaining - 1),
    lives_lost = lives_lost + 1,
    is_eliminated = CASE WHEN lives_remaining - 1 <= 0 THEN true ELSE false END,
    eliminated_at = CASE WHEN lives_remaining - 1 <= 0 THEN now() ELSE NULL END,
    updated_at = now()
  WHERE final_id = p_final_id AND team_id = p_team_id;

  -- Récupérer le nouvel état
  SELECT * INTO v_lives
  FROM public.final_lives
  WHERE final_id = p_final_id AND team_id = p_team_id;

  RETURN jsonb_build_object(
    'success', true,
    'lives_remaining', v_lives.lives_remaining,
    'is_eliminated', v_lives.is_eliminated
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_joker TO authenticated;
GRANT EXECUTE ON FUNCTION public.lose_life TO authenticated;

COMMENT ON TABLE public.final_lives IS 'Tracking des vies des finalistes dans les finales avec système de vies';
COMMENT ON TABLE public.joker_usages IS 'Historique d''utilisation des jokers avec effets';
COMMENT ON FUNCTION public.use_joker IS 'Utiliser un joker et enregistrer son effet';
COMMENT ON FUNCTION public.lose_life IS 'Faire perdre une vie à une équipe et gérer l''élimination';

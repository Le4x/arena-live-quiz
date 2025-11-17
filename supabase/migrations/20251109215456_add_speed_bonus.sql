-- Ajouter un système de bonus de rapidité
-- Les 3 premiers qui buzzent ou répondent correctement gagnent des points bonus
-- 1er: +3 points, 2ème: +2 points, 3ème: +1 point

-- Ajouter colonne speed_bonus à team_answers
ALTER TABLE public.team_answers
ADD COLUMN IF NOT EXISTS speed_bonus INTEGER DEFAULT 0;

-- Ajouter colonne speed_bonus à buzzer_attempts
ALTER TABLE public.buzzer_attempts
ADD COLUMN IF NOT EXISTS speed_bonus INTEGER DEFAULT 0;

-- Fonction pour calculer le bonus de rapidité basé sur le rang
CREATE OR REPLACE FUNCTION public.calculate_speed_bonus(rank_position INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE rank_position
    WHEN 1 THEN RETURN 3;
    WHEN 2 THEN RETURN 2;
    WHEN 3 THEN RETURN 1;
    ELSE RETURN 0;
  END CASE;
END;
$$;

-- Fonction pour attribuer les bonus de rapidité pour les réponses
CREATE OR REPLACE FUNCTION public.assign_answer_speed_bonuses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  answer_rank INTEGER;
BEGIN
  -- Calculer le rang de cette réponse parmi les réponses correctes
  -- pour cette question spécifique
  SELECT COUNT(*) + 1 INTO answer_rank
  FROM team_answers
  WHERE question_instance_id = NEW.question_instance_id
    AND is_correct = true
    AND answered_at < NEW.answered_at;

  -- Attribuer le bonus uniquement si la réponse est correcte
  IF NEW.is_correct THEN
    NEW.speed_bonus := calculate_speed_bonus(answer_rank);
  ELSE
    NEW.speed_bonus := 0;
  END IF;

  RETURN NEW;
END;
$$;

-- Fonction pour attribuer les bonus de rapidité pour les buzzers
CREATE OR REPLACE FUNCTION public.assign_buzzer_speed_bonuses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buzzer_rank INTEGER;
BEGIN
  -- Calculer le rang de ce buzzer pour cette question spécifique
  SELECT COUNT(*) + 1 INTO buzzer_rank
  FROM buzzer_attempts
  WHERE question_instance_id = NEW.question_instance_id
    AND buzzed_at < NEW.buzzed_at;

  -- Attribuer le bonus selon le rang
  NEW.speed_bonus := calculate_speed_bonus(buzzer_rank);

  RETURN NEW;
END;
$$;

-- Trigger pour attribuer automatiquement les bonus sur les réponses
DROP TRIGGER IF EXISTS trigger_assign_answer_speed_bonus ON public.team_answers;
CREATE TRIGGER trigger_assign_answer_speed_bonus
  BEFORE INSERT ON public.team_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_answer_speed_bonuses();

-- Trigger pour attribuer automatiquement les bonus sur les buzzers
DROP TRIGGER IF EXISTS trigger_assign_buzzer_speed_bonus ON public.buzzer_attempts;
CREATE TRIGGER trigger_assign_buzzer_speed_bonus
  BEFORE INSERT ON public.buzzer_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_buzzer_speed_bonuses();

-- Fonction pour recalculer tous les bonus de rapidité d'une question
-- (utile si besoin de recalculer après coup)
CREATE OR REPLACE FUNCTION public.recalculate_speed_bonuses_for_question(p_question_instance_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recalculer pour les réponses correctes
  WITH ranked_answers AS (
    SELECT
      id,
      ROW_NUMBER() OVER (ORDER BY answered_at ASC) as rank
    FROM team_answers
    WHERE question_instance_id = p_question_instance_id
      AND is_correct = true
  )
  UPDATE team_answers ta
  SET speed_bonus = calculate_speed_bonus(ra.rank)
  FROM ranked_answers ra
  WHERE ta.id = ra.id;

  -- Recalculer pour les buzzers
  WITH ranked_buzzers AS (
    SELECT
      id,
      ROW_NUMBER() OVER (ORDER BY buzzed_at ASC) as rank
    FROM buzzer_attempts
    WHERE question_instance_id = p_question_instance_id
  )
  UPDATE buzzer_attempts ba
  SET speed_bonus = calculate_speed_bonus(rb.rank)
  FROM ranked_buzzers rb
  WHERE ba.id = rb.id;
END;
$$;

-- Mettre à jour la fonction de mise à jour du score pour inclure le speed_bonus
-- (Cette fonction sera appelée par l'application quand une réponse est validée)
CREATE OR REPLACE FUNCTION public.update_team_score_with_bonus(
  p_team_id UUID,
  p_base_points INTEGER,
  p_speed_bonus INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE teams
  SET score = score + p_base_points + p_speed_bonus
  WHERE id = p_team_id;
END;
$$;

-- Commentaires pour la documentation
COMMENT ON COLUMN team_answers.speed_bonus IS 'Bonus de rapidité: 1er=+3pts, 2ème=+2pts, 3ème=+1pt';
COMMENT ON COLUMN buzzer_attempts.speed_bonus IS 'Bonus de rapidité: 1er=+3pts, 2ème=+2pts, 3ème=+1pt';
COMMENT ON FUNCTION calculate_speed_bonus IS 'Calcule le bonus selon le rang: 1er=3, 2ème=2, 3ème=1, autres=0';
COMMENT ON FUNCTION recalculate_speed_bonuses_for_question IS 'Recalcule les bonus pour une question donnée';

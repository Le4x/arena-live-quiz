-- =====================================================
-- EXPORT COMPLET DU SCHÉMA SUPABASE - MusicArena Pro
-- Date: 2025-11-03
-- =====================================================

-- =====================================================
-- TYPES ENUM
-- =====================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- =====================================================
-- TABLES
-- =====================================================

-- Table: profiles
CREATE TABLE public.profiles (
    id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    email text,
    PRIMARY KEY (id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Table: user_roles
CREATE TABLE public.user_roles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Table: game_sessions
CREATE TABLE public.game_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    name text NOT NULL,
    status text DEFAULT 'draft'::text,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    selected_rounds jsonb DEFAULT '[]'::jsonb,
    has_final boolean DEFAULT false,
    current_round_index integer DEFAULT 0,
    logo_url text,
    PRIMARY KEY (id)
);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Table: teams
CREATE TABLE public.teams (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    game_session_id uuid REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    name text NOT NULL,
    color text NOT NULL,
    avatar text,
    connection_pin text,
    connected_device_id text,
    last_seen_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    score integer DEFAULT 0,
    is_excluded boolean NOT NULL DEFAULT false,
    yellow_cards integer NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Table: rounds
CREATE TABLE public.rounds (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    title text NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'pending'::text,
    jingle_url text,
    timer_duration integer,
    timer_started_at timestamp with time zone,
    PRIMARY KEY (id)
);

ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;

-- Table: questions
CREATE TABLE public.questions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    round_id uuid REFERENCES public.rounds(id) ON DELETE CASCADE,
    question_text text NOT NULL,
    question_type text NOT NULL,
    correct_answer text,
    options jsonb,
    audio_url text,
    image_url text,
    points integer DEFAULT 10,
    penalty_points integer DEFAULT 0,
    display_order integer DEFAULT 0,
    stop_time numeric,
    lyrics jsonb,
    cue_points jsonb DEFAULT '{"search": {"end": 30, "start": 0}, "solution": {"end": 60, "start": 30}}'::jsonb,
    PRIMARY KEY (id)
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Table: question_instances
CREATE TABLE public.question_instances (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    game_session_id uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    ended_at timestamp with time zone,
    PRIMARY KEY (id)
);

CREATE INDEX idx_question_instances_question_id ON public.question_instances(question_id);
CREATE INDEX idx_question_instances_session_id ON public.question_instances(game_session_id);
CREATE INDEX idx_question_instances_started_at ON public.question_instances(started_at DESC);

ALTER TABLE public.question_instances ENABLE ROW LEVEL SECURITY;

-- Table: buzzer_attempts
CREATE TABLE public.buzzer_attempts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
    question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE,
    question_instance_id uuid REFERENCES public.question_instances(id) ON DELETE CASCADE,
    game_session_id uuid REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    buzzed_at timestamp with time zone DEFAULT now(),
    is_first boolean DEFAULT false,
    PRIMARY KEY (id)
);

ALTER TABLE public.buzzer_attempts ENABLE ROW LEVEL SECURITY;

-- Table: team_answers
CREATE TABLE public.team_answers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
    question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE,
    question_instance_id uuid REFERENCES public.question_instances(id) ON DELETE CASCADE,
    game_session_id uuid REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    answer text NOT NULL,
    is_correct boolean,
    points_awarded integer DEFAULT 0,
    answered_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE public.team_answers ENABLE ROW LEVEL SECURITY;

-- Table: game_state
CREATE TABLE public.game_state (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    game_session_id uuid REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    updated_at timestamp with time zone DEFAULT now(),
    current_round_id uuid REFERENCES public.rounds(id) ON DELETE SET NULL,
    current_question_id uuid REFERENCES public.questions(id) ON DELETE SET NULL,
    current_question_instance_id uuid REFERENCES public.question_instances(id) ON DELETE SET NULL,
    is_buzzer_active boolean DEFAULT false,
    timer_active boolean DEFAULT false,
    timer_remaining integer,
    timer_duration integer,
    timer_started_at timestamp with time zone,
    show_leaderboard boolean DEFAULT false,
    leaderboard_page integer DEFAULT 1,
    excluded_teams jsonb DEFAULT '[]'::jsonb,
    show_ambient_screen boolean DEFAULT true,
    show_round_intro boolean DEFAULT false,
    current_round_intro uuid REFERENCES public.rounds(id) ON DELETE SET NULL,
    show_pause_screen boolean DEFAULT false,
    show_waiting_screen boolean DEFAULT false,
    show_answer boolean DEFAULT false,
    show_welcome_screen boolean DEFAULT false,
    show_team_connection_screen boolean DEFAULT false,
    show_sponsors_screen boolean DEFAULT false,
    show_thanks_screen boolean DEFAULT false,
    audio_is_playing boolean DEFAULT false,
    audio_current_time double precision DEFAULT 0,
    karaoke_playing boolean DEFAULT false,
    karaoke_revealed boolean DEFAULT false,
    announcement_text text,
    answer_result text,
    final_mode boolean DEFAULT false,
    final_id uuid REFERENCES public.finals(id) ON DELETE SET NULL,
    PRIMARY KEY (id)
);

ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;

-- Table: sponsors
CREATE TABLE public.sponsors (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    game_session_id uuid REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    name text NOT NULL,
    logo_url text NOT NULL,
    tier text NOT NULL,
    display_order integer DEFAULT 0,
    PRIMARY KEY (id)
);

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

-- Table: help_requests
CREATE TABLE public.help_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
    game_session_id uuid REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    message text,
    status text DEFAULT 'pending'::text,
    resolved_at timestamp with time zone,
    PRIMARY KEY (id)
);

ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;

-- Table: joker_types
CREATE TABLE public.joker_types (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    name text NOT NULL,
    description text NOT NULL,
    icon text DEFAULT '🎯'::text,
    is_active boolean DEFAULT true,
    PRIMARY KEY (id)
);

ALTER TABLE public.joker_types ENABLE ROW LEVEL SECURITY;

-- Table: finals
CREATE TABLE public.finals (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    game_session_id uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    status text DEFAULT 'pending'::text,
    finalist_teams jsonb DEFAULT '[]'::jsonb,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    PRIMARY KEY (id)
);

ALTER TABLE public.finals ENABLE ROW LEVEL SECURITY;

-- Table: final_jokers
CREATE TABLE public.final_jokers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    final_id uuid NOT NULL REFERENCES public.finals(id) ON DELETE CASCADE,
    team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    joker_type_id uuid NOT NULL REFERENCES public.joker_types(id) ON DELETE CASCADE,
    quantity integer DEFAULT 1,
    used_count integer DEFAULT 0,
    PRIMARY KEY (id)
);

ALTER TABLE public.final_jokers ENABLE ROW LEVEL SECURITY;

-- Table: public_votes
CREATE TABLE public.public_votes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    final_id uuid NOT NULL REFERENCES public.finals(id) ON DELETE CASCADE,
    question_instance_id uuid NOT NULL REFERENCES public.question_instances(id) ON DELETE CASCADE,
    voter_team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    voted_answer text NOT NULL,
    PRIMARY KEY (id)
);

ALTER TABLE public.public_votes ENABLE ROW LEVEL SECURITY;

-- Table: public_questions (VIEW)
CREATE VIEW public.public_questions AS
SELECT 
    id,
    created_at,
    round_id,
    question_text,
    question_type,
    audio_url,
    options,
    points,
    display_order,
    cue_points
FROM public.questions;

-- =====================================================
-- FONCTIONS
-- =====================================================

-- Fonction: is_admin
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = 'admin'
  )
$function$;

-- Fonction: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$function$;

-- Fonction: generate_team_pin
CREATE OR REPLACE FUNCTION public.generate_team_pin()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pin TEXT;
  pin_exists BOOLEAN;
BEGIN
  LOOP
    pin := LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.teams WHERE connection_pin = pin) INTO pin_exists;
    EXIT WHEN NOT pin_exists;
  END LOOP;
  RETURN pin;
END;
$function$;

-- Fonction: auto_generate_team_pin
CREATE OR REPLACE FUNCTION public.auto_generate_team_pin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.connection_pin IS NULL THEN
    NEW.connection_pin := generate_team_pin();
  END IF;
  RETURN NEW;
END;
$function$;

-- Fonction: cleanup_old_session_data
CREATE OR REPLACE FUNCTION public.cleanup_old_session_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    UPDATE public.game_sessions 
    SET status = 'ended' 
    WHERE status = 'active' AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fonction: reset_game_session
CREATE OR REPLACE FUNCTION public.reset_game_session(session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.team_answers WHERE game_session_id = session_id;
  DELETE FROM public.buzzer_attempts WHERE game_session_id = session_id;
  
  UPDATE public.game_state 
  SET 
    excluded_teams = '[]'::jsonb,
    answer_result = NULL,
    is_buzzer_active = false,
    timer_active = false,
    show_leaderboard = false,
    announcement_text = NULL
  WHERE game_session_id = session_id;
END;
$function$;

-- Fonction: cleanup_on_session_start
CREATE OR REPLACE FUNCTION public.cleanup_on_session_start()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    PERFORM public.reset_game_session(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

-- Fonction: can_team_buzz
CREATE OR REPLACE FUNCTION public.can_team_buzz(p_team_id uuid, p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  excluded_teams_data jsonb;
  team_item jsonb;
  is_excluded boolean := false;
BEGIN
  SELECT excluded_teams INTO excluded_teams_data
  FROM public.game_state
  WHERE game_session_id = p_session_id
  LIMIT 1;
  
  IF excluded_teams_data IS NULL OR jsonb_typeof(excluded_teams_data) != 'array' THEN
    RETURN true;
  END IF;
  
  FOR team_item IN SELECT * FROM jsonb_array_elements(excluded_teams_data)
  LOOP
    IF jsonb_typeof(team_item) = 'string' AND team_item::text = concat('"', p_team_id::text, '"') THEN
      is_excluded := true;
      EXIT;
    END IF;
    
    IF jsonb_typeof(team_item) = 'object' THEN
      IF (team_item->>'team_id')::uuid = p_team_id 
         OR (team_item->>'id')::uuid = p_team_id
         OR (team_item->>'teamId')::uuid = p_team_id THEN
        is_excluded := true;
        EXIT;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NOT is_excluded;
END;
$function$;

-- Fonction: check_team_not_blocked
CREATE OR REPLACE FUNCTION public.check_team_not_blocked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  excluded_teams_data jsonb;
  is_blocked boolean;
BEGIN
  SELECT excluded_teams INTO excluded_teams_data
  FROM game_state
  WHERE game_session_id = NEW.game_session_id;
  
  IF excluded_teams_data IS NULL OR jsonb_array_length(excluded_teams_data) = 0 THEN
    RETURN NEW;
  END IF;
  
  is_blocked := EXISTS (
    SELECT 1
    FROM jsonb_array_elements(excluded_teams_data) AS elem
    WHERE 
      (elem->>'team_id' = NEW.team_id::text)
      OR 
      (elem->>'id' = NEW.team_id::text)
      OR
      (elem::text = quote_literal(NEW.team_id::text))
  );
  
  IF is_blocked THEN
    RAISE EXCEPTION 'Équipe bloquée pour cette question'
      USING ERRCODE = 'P0001';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fonction: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE TRIGGER auto_generate_pin
  BEFORE INSERT ON public.teams
  FOR EACH ROW EXECUTE PROCEDURE public.auto_generate_team_pin();

CREATE TRIGGER cleanup_old_sessions
  BEFORE UPDATE ON public.game_sessions
  FOR EACH ROW EXECUTE PROCEDURE public.cleanup_old_session_data();

CREATE TRIGGER cleanup_session_start
  AFTER UPDATE ON public.game_sessions
  FOR EACH ROW EXECUTE PROCEDURE public.cleanup_on_session_start();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Policies: profiles
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policies: user_roles
CREATE POLICY "Service can read user roles"
ON public.user_roles FOR SELECT
USING (true);

-- Policies: game_sessions
CREATE POLICY "Anyone can view game sessions"
ON public.game_sessions FOR SELECT
USING (true);

CREATE POLICY "Admins can manage game sessions"
ON public.game_sessions FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- Policies: teams
CREATE POLICY "Anyone can view teams"
ON public.teams FOR SELECT
USING (true);

CREATE POLICY "Admins can manage teams"
ON public.teams FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- Policies: rounds
CREATE POLICY "Anyone can view rounds"
ON public.rounds FOR SELECT
USING (true);

CREATE POLICY "Admins can manage rounds"
ON public.rounds FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- Policies: questions
CREATE POLICY "Anyone can view questions"
ON public.questions FOR SELECT
USING (true);

CREATE POLICY "Admins can manage questions"
ON public.questions FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- Policies: question_instances
CREATE POLICY "Anyone can view question instances"
ON public.question_instances FOR SELECT
USING (true);

CREATE POLICY "Admins can insert question instances"
ON public.question_instances FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update question instances"
ON public.question_instances FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete question instances"
ON public.question_instances FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Policies: buzzer_attempts
CREATE POLICY "Anyone can view buzzer attempts"
ON public.buzzer_attempts FOR SELECT
USING (true);

CREATE POLICY "Anyone can create buzzer attempts"
ON public.buzzer_attempts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Teams can only buzz if not blocked"
ON public.buzzer_attempts FOR INSERT
WITH CHECK (can_team_buzz(team_id, game_session_id));

CREATE POLICY "Admins can update buzzer attempts"
ON public.buzzer_attempts FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete buzzer attempts"
ON public.buzzer_attempts FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Policies: team_answers
CREATE POLICY "Anyone can view team answers"
ON public.team_answers FOR SELECT
USING (true);

CREATE POLICY "Anyone can submit answers"
ON public.team_answers FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update team answers"
ON public.team_answers FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete team answers"
ON public.team_answers FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Policies: game_state
CREATE POLICY "Anyone can view game state"
ON public.game_state FOR SELECT
USING (true);

CREATE POLICY "Admins can manage game state"
ON public.game_state FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- Policies: sponsors
CREATE POLICY "Anyone can view sponsors"
ON public.sponsors FOR SELECT
USING (true);

CREATE POLICY "Admins can manage sponsors"
ON public.sponsors FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- Policies: help_requests
CREATE POLICY "Anyone can view help requests"
ON public.help_requests FOR SELECT
USING (true);

CREATE POLICY "Anyone can create help requests"
ON public.help_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update help requests"
ON public.help_requests FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

-- Policies: joker_types
CREATE POLICY "Anyone can view joker types"
ON public.joker_types FOR SELECT
USING (true);

CREATE POLICY "Admins can manage joker types"
ON public.joker_types FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- Policies: finals
CREATE POLICY "Anyone can view finals"
ON public.finals FOR SELECT
USING (true);

CREATE POLICY "Admins can manage finals"
ON public.finals FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- Policies: final_jokers
CREATE POLICY "Anyone can view final jokers"
ON public.final_jokers FOR SELECT
USING (true);

CREATE POLICY "Admins can manage final jokers"
ON public.final_jokers FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- Policies: public_votes
CREATE POLICY "Anyone can view public votes"
ON public.public_votes FOR SELECT
USING (true);

CREATE POLICY "Anyone can vote"
ON public.public_votes FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage votes"
ON public.public_votes FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- Bucket: audio-files (public)
-- Bucket: session-logos (public)
-- Bucket: question-images (public)

-- =====================================================
-- REALTIME PUBLICATION
-- =====================================================

-- Enable realtime for all tables (à configurer selon vos besoins)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.game_state;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.buzzer_attempts;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.team_answers;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
-- etc.

-- =====================================================
-- FIN DE L'EXPORT
-- =====================================================

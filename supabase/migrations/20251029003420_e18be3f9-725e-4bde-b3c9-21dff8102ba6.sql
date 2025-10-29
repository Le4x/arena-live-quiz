-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Create roles enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = 'admin'
  )
$$;

-- Create trigger function for new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

-- Create trigger for auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update teams table policies
DROP POLICY IF EXISTS "Public read access for teams" ON public.teams;
DROP POLICY IF EXISTS "Public insert access for teams" ON public.teams;
DROP POLICY IF EXISTS "Public update access for teams" ON public.teams;
DROP POLICY IF EXISTS "Public delete access for teams" ON public.teams;

CREATE POLICY "Anyone can view teams"
ON public.teams FOR SELECT
USING (true);

CREATE POLICY "Admins can manage teams"
ON public.teams FOR ALL
USING (is_admin(auth.uid()));

-- Update rounds table policies
DROP POLICY IF EXISTS "Public read access for rounds" ON public.rounds;
DROP POLICY IF EXISTS "Public insert access for rounds" ON public.rounds;
DROP POLICY IF EXISTS "Public update access for rounds" ON public.rounds;
DROP POLICY IF EXISTS "Public delete access for rounds" ON public.rounds;

CREATE POLICY "Anyone can view rounds"
ON public.rounds FOR SELECT
USING (true);

CREATE POLICY "Admins can manage rounds"
ON public.rounds FOR ALL
USING (is_admin(auth.uid()));

-- Update questions table policies and create public view
DROP POLICY IF EXISTS "Public read access for questions" ON public.questions;
DROP POLICY IF EXISTS "Public insert access for questions" ON public.questions;
DROP POLICY IF EXISTS "Public update access for questions" ON public.questions;
DROP POLICY IF EXISTS "Public delete access for questions" ON public.questions;

CREATE POLICY "Admins can manage questions"
ON public.questions FOR ALL
USING (is_admin(auth.uid()));

-- Create view without correct answers
CREATE OR REPLACE VIEW public.public_questions AS
SELECT 
  id,
  round_id,
  question_text,
  question_type,
  options,
  audio_url,
  points,
  display_order,
  cue_points,
  created_at
FROM public.questions;

GRANT SELECT ON public.public_questions TO anon, authenticated;

-- Update game_sessions table policies
DROP POLICY IF EXISTS "Public read access for game_sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Public insert access for game_sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Public update access for game_sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Public delete access for game_sessions" ON public.game_sessions;

CREATE POLICY "Anyone can view game sessions"
ON public.game_sessions FOR SELECT
USING (true);

CREATE POLICY "Admins can manage game sessions"
ON public.game_sessions FOR ALL
USING (is_admin(auth.uid()));

-- Update game_state table policies
DROP POLICY IF EXISTS "Public read access for game_state" ON public.game_state;
DROP POLICY IF EXISTS "Public insert access for game_state" ON public.game_state;
DROP POLICY IF EXISTS "Public update access for game_state" ON public.game_state;
DROP POLICY IF EXISTS "Public delete access for game_state" ON public.game_state;

CREATE POLICY "Anyone can view game state"
ON public.game_state FOR SELECT
USING (true);

CREATE POLICY "Admins can manage game state"
ON public.game_state FOR ALL
USING (is_admin(auth.uid()));

-- Update buzzer_attempts table policies
DROP POLICY IF EXISTS "Public read access for buzzer_attempts" ON public.buzzer_attempts;
DROP POLICY IF EXISTS "Public insert access for buzzer_attempts" ON public.buzzer_attempts;
DROP POLICY IF EXISTS "Public update access for buzzer_attempts" ON public.buzzer_attempts;
DROP POLICY IF EXISTS "Public delete access for buzzer_attempts" ON public.buzzer_attempts;

CREATE POLICY "Anyone can view buzzer attempts"
ON public.buzzer_attempts FOR SELECT
USING (true);

CREATE POLICY "Anyone can create buzzer attempts"
ON public.buzzer_attempts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update buzzer attempts"
ON public.buzzer_attempts FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete buzzer attempts"
ON public.buzzer_attempts FOR DELETE
USING (is_admin(auth.uid()));

-- Update team_answers table policies
DROP POLICY IF EXISTS "Public read access for team_answers" ON public.team_answers;
DROP POLICY IF EXISTS "Public insert access for team_answers" ON public.team_answers;
DROP POLICY IF EXISTS "Public update access for team_answers" ON public.team_answers;
DROP POLICY IF EXISTS "Public delete access for team_answers" ON public.team_answers;

CREATE POLICY "Anyone can view team answers"
ON public.team_answers FOR SELECT
USING (true);

CREATE POLICY "Anyone can submit answers"
ON public.team_answers FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update team answers"
ON public.team_answers FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete team answers"
ON public.team_answers FOR DELETE
USING (is_admin(auth.uid()));

-- Update question_instances table policies
DROP POLICY IF EXISTS "Public read access for question_instances" ON public.question_instances;
DROP POLICY IF EXISTS "Public insert access for question_instances" ON public.question_instances;
DROP POLICY IF EXISTS "Public update access for question_instances" ON public.question_instances;
DROP POLICY IF EXISTS "Public delete access for question_instances" ON public.question_instances;

CREATE POLICY "Anyone can view question instances"
ON public.question_instances FOR SELECT
USING (true);

CREATE POLICY "Admins can insert question instances"
ON public.question_instances FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update question instances"
ON public.question_instances FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete question instances"
ON public.question_instances FOR DELETE
USING (is_admin(auth.uid()));
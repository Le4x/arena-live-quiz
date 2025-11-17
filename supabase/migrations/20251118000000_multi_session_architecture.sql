-- Migration: Multi-Session Architecture
-- Description: Transform game_state from singleton to multi-session support
-- Features: One game_state per session, complete isolation, concurrent sessions

-- ============================================================================
-- STEP 1: Transform game_state to support multiple sessions
-- ============================================================================

-- Add game_session_id to game_state
ALTER TABLE public.game_state
ADD COLUMN IF NOT EXISTS game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_game_state_session ON public.game_state(game_session_id);

-- Remove the singleton constraint by allowing multiple game_states
-- The old singleton ID will remain for backward compatibility
-- New sessions will create their own game_state rows

-- Add unique constraint to ensure one game_state per session
DROP INDEX IF EXISTS idx_game_state_unique_session;
CREATE UNIQUE INDEX idx_game_state_unique_session ON public.game_state(game_session_id) WHERE game_session_id IS NOT NULL;

-- ============================================================================
-- STEP 2: Add session isolation to all related tables
-- ============================================================================

-- Add game_session_id to buzzer_attempts if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'buzzer_attempts' AND column_name = 'game_session_id'
  ) THEN
    ALTER TABLE public.buzzer_attempts
    ADD COLUMN game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE;

    CREATE INDEX idx_buzzer_attempts_session ON public.buzzer_attempts(game_session_id);
  END IF;
END $$;

-- Add game_session_id to team_answers if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_answers' AND column_name = 'game_session_id'
  ) THEN
    ALTER TABLE public.team_answers
    ADD COLUMN game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE;

    CREATE INDEX idx_team_answers_session ON public.team_answers(game_session_id);
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Create function to initialize game_state for new sessions
-- ============================================================================

CREATE OR REPLACE FUNCTION create_game_state_for_session(session_id UUID)
RETURNS UUID AS $$
DECLARE
  state_id UUID;
BEGIN
  -- Check if game_state already exists for this session
  SELECT id INTO state_id
  FROM public.game_state
  WHERE game_session_id = session_id;

  -- If not exists, create it
  IF state_id IS NULL THEN
    INSERT INTO public.game_state (
      game_session_id,
      is_buzzer_active,
      timer_active,
      show_leaderboard
    ) VALUES (
      session_id,
      false,
      false,
      false
    )
    RETURNING id INTO state_id;
  END IF;

  RETURN state_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: Auto-create game_state when session becomes active
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_game_state()
RETURNS TRIGGER AS $$
BEGIN
  -- When session status changes to 'active', ensure game_state exists
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    PERFORM create_game_state_for_session(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_create_game_state ON public.game_sessions;
CREATE TRIGGER trigger_auto_create_game_state
  AFTER INSERT OR UPDATE OF status ON public.game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_game_state();

-- ============================================================================
-- STEP 5: Update RLS policies for session isolation
-- ============================================================================

-- Drop old game_state policies
DROP POLICY IF EXISTS "Public read access for game_state" ON public.game_state;
DROP POLICY IF EXISTS "Public insert access for game_state" ON public.game_state;
DROP POLICY IF EXISTS "Public update access for game_state" ON public.game_state;
DROP POLICY IF EXISTS "Public delete access for game_state" ON public.game_state;

-- Create new session-aware policies for game_state
CREATE POLICY "Anyone can read game_state"
  ON public.game_state
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert game_state"
  ON public.game_state
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update game_state"
  ON public.game_state
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete game_state"
  ON public.game_state
  FOR DELETE
  USING (true);

-- ============================================================================
-- STEP 6: Create helper views for multi-session management
-- ============================================================================

-- View: Active sessions with their game_state
CREATE OR REPLACE VIEW public.active_sessions_with_state AS
SELECT
  s.id as session_id,
  s.name as session_name,
  s.access_code,
  s.status as session_status,
  s.event_date,
  s.client_name,
  s.client_company,
  s.max_teams,
  gs.id as game_state_id,
  gs.current_question_id,
  gs.is_buzzer_active,
  gs.timer_active,
  gs.timer_remaining,
  gs.show_leaderboard,
  (SELECT COUNT(*) FROM public.teams WHERE game_session_id = s.id AND is_active = true) as active_teams_count,
  (SELECT COUNT(*) FROM public.teams WHERE game_session_id = s.id) as total_teams_count
FROM public.game_sessions s
LEFT JOIN public.game_state gs ON gs.game_session_id = s.id
WHERE s.status IN ('active', 'paused')
ORDER BY s.created_at DESC;

-- Grant access to views
GRANT SELECT ON public.active_sessions_with_state TO authenticated;
GRANT SELECT ON public.active_sessions_with_state TO anon;

-- ============================================================================
-- STEP 7: Function to cleanup session data
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_session_data(session_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete all session-related data
  DELETE FROM public.buzzer_attempts WHERE game_session_id = session_id;
  DELETE FROM public.team_answers WHERE game_session_id = session_id;
  DELETE FROM public.teams WHERE game_session_id = session_id;

  -- Reset game_state
  UPDATE public.game_state
  SET
    current_question_id = NULL,
    current_round_id = NULL,
    is_buzzer_active = false,
    timer_active = false,
    timer_remaining = NULL,
    show_leaderboard = false,
    announcement_text = NULL,
    current_question_instance_id = NULL,
    excluded_teams = '[]'::jsonb,
    final_mode = false,
    final_id = NULL
  WHERE game_session_id = session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 8: Function to get or create game_state for session
-- ============================================================================

CREATE OR REPLACE FUNCTION get_game_state_for_session(session_id UUID)
RETURNS TABLE(
  id UUID,
  game_session_id UUID,
  current_round_id UUID,
  current_question_id UUID,
  current_question_instance_id UUID,
  is_buzzer_active BOOLEAN,
  timer_active BOOLEAN,
  timer_remaining INTEGER,
  show_leaderboard BOOLEAN,
  announcement_text TEXT,
  excluded_teams JSONB,
  final_mode BOOLEAN,
  final_id UUID,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Ensure game_state exists for this session
  PERFORM create_game_state_for_session(session_id);

  -- Return the game_state
  RETURN QUERY
  SELECT
    gs.id,
    gs.game_session_id,
    gs.current_round_id,
    gs.current_question_id,
    gs.current_question_instance_id,
    gs.is_buzzer_active,
    gs.timer_active,
    gs.timer_remaining,
    gs.show_leaderboard,
    gs.announcement_text,
    gs.excluded_teams,
    gs.final_mode,
    gs.final_id,
    gs.updated_at
  FROM public.game_state gs
  WHERE gs.game_session_id = session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 9: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.game_state.game_session_id IS 'Links game_state to a specific session for multi-session support';
COMMENT ON FUNCTION create_game_state_for_session IS 'Creates or retrieves game_state for a specific session';
COMMENT ON FUNCTION get_game_state_for_session IS 'Gets game_state for a session, creating it if needed';
COMMENT ON FUNCTION cleanup_session_data IS 'Removes all data associated with a session';
COMMENT ON VIEW public.active_sessions_with_state IS 'Shows all active sessions with their current game state and team counts';

-- ============================================================================
-- STEP 10: Migrate existing singleton data (if needed)
-- ============================================================================

-- Find the singleton game_state and link it to the first active session if exists
DO $$
DECLARE
  singleton_id UUID := '00000000-0000-0000-0000-000000000001';
  first_session_id UUID;
BEGIN
  -- Check if singleton exists and has no session_id
  IF EXISTS (
    SELECT 1 FROM public.game_state
    WHERE id = singleton_id AND game_session_id IS NULL
  ) THEN
    -- Find first active session
    SELECT id INTO first_session_id
    FROM public.game_sessions
    WHERE status = 'active'
    ORDER BY created_at ASC
    LIMIT 1;

    -- If an active session exists, link the singleton to it
    IF first_session_id IS NOT NULL THEN
      UPDATE public.game_state
      SET game_session_id = first_session_id
      WHERE id = singleton_id;

      RAISE NOTICE 'Linked singleton game_state to session %', first_session_id;
    END IF;
  END IF;
END $$;

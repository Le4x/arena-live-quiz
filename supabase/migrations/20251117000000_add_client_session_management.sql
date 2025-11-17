-- Migration: Add client session management fields
-- Description: Extends game_sessions table to support multi-client event management
-- Features: Access codes, client info, branding, event details, custom instructions

-- Add new columns to game_sessions
ALTER TABLE public.game_sessions
ADD COLUMN IF NOT EXISTS access_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS client_email TEXT,
ADD COLUMN IF NOT EXISTS client_phone TEXT,
ADD COLUMN IF NOT EXISTS client_company TEXT,
ADD COLUMN IF NOT EXISTS client_address TEXT,
ADD COLUMN IF NOT EXISTS event_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS event_location TEXT,
ADD COLUMN IF NOT EXISTS event_description TEXT,
ADD COLUMN IF NOT EXISTS max_teams INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS custom_instructions TEXT,
ADD COLUMN IF NOT EXISTS branding_primary_color TEXT DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS branding_secondary_color TEXT DEFAULT '#8b5cf6',
ADD COLUMN IF NOT EXISTS branding_logo_url TEXT,
ADD COLUMN IF NOT EXISTS branding_background_url TEXT,
ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'quiz' CHECK (session_type IN ('quiz', 'blindtest', 'mixed')),
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS qr_code_url TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for faster lookups by access_code
CREATE INDEX IF NOT EXISTS idx_game_sessions_access_code ON public.game_sessions(access_code);
CREATE INDEX IF NOT EXISTS idx_game_sessions_event_date ON public.game_sessions(event_date);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON public.game_sessions(status);

-- Function to generate unique access code
CREATE OR REPLACE FUNCTION generate_session_access_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate format: XXXX-YYYY-ZZZZ (12 chars alphanumeric uppercase)
    code := UPPER(
      SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4) || '-' ||
      SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4) || '-' ||
      SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)
    );

    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.game_sessions WHERE access_code = code) INTO exists;

    -- Exit loop if code is unique
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate access_code if not provided
CREATE OR REPLACE FUNCTION set_session_access_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.access_code IS NULL THEN
    NEW.access_code := generate_session_access_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_session_access_code ON public.game_sessions;
CREATE TRIGGER trigger_set_session_access_code
  BEFORE INSERT ON public.game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_session_access_code();

-- Create a view for active/upcoming sessions
CREATE OR REPLACE VIEW public.active_client_sessions AS
SELECT
  id,
  name,
  access_code,
  client_name,
  client_company,
  event_date,
  event_location,
  session_type,
  max_teams,
  status,
  created_at,
  logo_url,
  branding_primary_color,
  branding_secondary_color,
  branding_logo_url,
  (SELECT COUNT(*) FROM public.teams WHERE game_session_id = game_sessions.id) as connected_teams
FROM public.game_sessions
WHERE status IN ('draft', 'active', 'paused')
  OR (event_date IS NOT NULL AND event_date >= NOW() - INTERVAL '1 day')
ORDER BY event_date ASC NULLS LAST, created_at DESC;

-- Grant necessary permissions
GRANT SELECT ON public.active_client_sessions TO authenticated;
GRANT SELECT ON public.active_client_sessions TO anon;

-- Update RLS policies to allow public access via access_code
CREATE POLICY "Public can view sessions by access_code"
  ON public.game_sessions
  FOR SELECT
  USING (access_code IS NOT NULL);

-- Comment on new columns
COMMENT ON COLUMN public.game_sessions.access_code IS 'Unique access code for client session (format: XXXX-YYYY-ZZZZ)';
COMMENT ON COLUMN public.game_sessions.client_name IS 'Client contact name';
COMMENT ON COLUMN public.game_sessions.client_email IS 'Client email address';
COMMENT ON COLUMN public.game_sessions.client_company IS 'Client company name';
COMMENT ON COLUMN public.game_sessions.event_date IS 'Scheduled date and time of the event';
COMMENT ON COLUMN public.game_sessions.event_location IS 'Physical location of the event';
COMMENT ON COLUMN public.game_sessions.max_teams IS 'Maximum number of teams allowed in this session';
COMMENT ON COLUMN public.game_sessions.custom_instructions IS 'Customizable instructions template for players';
COMMENT ON COLUMN public.game_sessions.branding_primary_color IS 'Primary brand color (hex)';
COMMENT ON COLUMN public.game_sessions.branding_secondary_color IS 'Secondary brand color (hex)';
COMMENT ON COLUMN public.game_sessions.session_type IS 'Type of session: quiz, blindtest, or mixed';
COMMENT ON COLUMN public.game_sessions.qr_code_url IS 'Generated QR code image URL (stored in Supabase Storage)';

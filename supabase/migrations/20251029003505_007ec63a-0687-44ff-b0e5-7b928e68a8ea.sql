-- Fix user_roles RLS policy
CREATE POLICY "Service can read user roles"
ON public.user_roles FOR SELECT
USING (true);

-- Recreate public_questions as a regular view (not security definer)
DROP VIEW IF EXISTS public.public_questions;

CREATE VIEW public.public_questions AS
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
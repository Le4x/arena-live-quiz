-- Fix SECURITY DEFINER view warning for public_questions
-- Recreate view with explicit SECURITY INVOKER to use querying user's permissions
DROP VIEW IF EXISTS public.public_questions;

CREATE VIEW public.public_questions 
WITH (security_invoker = true)
AS
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
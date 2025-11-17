-- Fix teams table RLS policy to allow anonymous team creation
-- Issue: Migration 20251029003420 removed public INSERT access for teams
-- This prevented anonymous users from creating teams via the Client app

-- Add INSERT policy for anonymous and authenticated users
CREATE POLICY "Anyone can create teams"
ON public.teams
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

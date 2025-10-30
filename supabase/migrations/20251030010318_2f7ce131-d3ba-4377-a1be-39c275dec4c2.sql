-- Ajouter un champ timer_started_at pour synchroniser les timers en temps réel
ALTER TABLE public.game_state 
ADD COLUMN IF NOT EXISTS timer_started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS timer_duration integer;
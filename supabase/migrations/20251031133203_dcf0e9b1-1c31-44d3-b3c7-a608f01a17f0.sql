-- Ajouter les colonnes pour synchroniser l'audio entre Régie et Screen
ALTER TABLE public.game_state
ADD COLUMN IF NOT EXISTS audio_current_time FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS audio_is_playing BOOLEAN DEFAULT false;
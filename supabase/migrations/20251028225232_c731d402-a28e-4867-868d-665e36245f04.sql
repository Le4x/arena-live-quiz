-- Add show_answer column to game_state for revealing answers on screen
ALTER TABLE public.game_state 
ADD COLUMN show_answer boolean DEFAULT false;
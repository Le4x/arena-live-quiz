-- Add answer_result field to game_state to display validation result on screen
ALTER TABLE public.game_state
ADD COLUMN answer_result TEXT DEFAULT NULL;

COMMENT ON COLUMN public.game_state.answer_result IS 'Result of answer validation: correct, incorrect, or null';
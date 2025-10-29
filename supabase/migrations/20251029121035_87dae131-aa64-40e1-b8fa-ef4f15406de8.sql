-- Allow everyone (including non-authenticated users) to read questions
-- The correct_answer is already hidden by using public_questions view
CREATE POLICY "Anyone can view questions"
ON public.questions
FOR SELECT
USING (true);
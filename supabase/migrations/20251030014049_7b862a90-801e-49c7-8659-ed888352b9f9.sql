-- Ajouter une colonne image_url à la table questions
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Créer un bucket pour les images de questions
INSERT INTO storage.buckets (id, name, public) 
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- Créer les politiques RLS pour le bucket question-images
CREATE POLICY "Anyone can view question images"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-images');

CREATE POLICY "Admins can upload question images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'question-images' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update question images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'question-images' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete question images"
ON storage.objects FOR DELETE
USING (bucket_id = 'question-images' AND is_admin(auth.uid()));
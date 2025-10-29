-- Créer le bucket audio-files pour les fichiers MP3
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-files', 'audio-files', true);

-- Politique : tout le monde peut voir les fichiers (lecture publique)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-files');

-- Politique : seuls les utilisateurs authentifiés peuvent uploader
CREATE POLICY "Authenticated users can upload audio files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio-files');

-- Politique : seuls les utilisateurs authentifiés peuvent supprimer leurs fichiers
CREATE POLICY "Users can delete their own audio files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'audio-files');
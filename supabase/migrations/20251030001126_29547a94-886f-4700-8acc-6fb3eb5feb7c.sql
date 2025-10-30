-- Créer le bucket pour les logos de session (public pour pouvoir afficher les logos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('session-logos', 'session-logos', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- Politique pour permettre à tout le monde de voir les logos
CREATE POLICY "Anyone can view session logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'session-logos');

-- Politique pour permettre aux admins d'uploader des logos
CREATE POLICY "Admins can upload session logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'session-logos' AND (SELECT is_admin(auth.uid())));

-- Politique pour permettre aux admins de supprimer des logos
CREATE POLICY "Admins can delete session logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'session-logos' AND (SELECT is_admin(auth.uid())));

-- Politique pour permettre aux admins de mettre à jour des logos
CREATE POLICY "Admins can update session logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'session-logos' AND (SELECT is_admin(auth.uid())));
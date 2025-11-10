-- Migration: Système de gestion des médias (musiques, jingles, images)

-- Table pour stocker les assets média
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Métadonnées de l'asset
  name TEXT NOT NULL,
  description TEXT,
  file_type TEXT NOT NULL, -- 'audio', 'image', 'video'
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  duration_ms INTEGER, -- Durée pour audio/video en millisecondes

  -- Stockage
  storage_path TEXT NOT NULL UNIQUE,
  storage_bucket TEXT NOT NULL DEFAULT 'media',
  public_url TEXT,

  -- Catégorisation
  category TEXT NOT NULL, -- 'jingle_intro', 'jingle_reveal', 'background_music', 'sponsor_logo', etc.
  tags TEXT[], -- Tags pour recherche

  -- Association à des événements
  event_trigger TEXT, -- 'round_intro', 'correct_answer', 'incorrect_answer', 'leaderboard', etc.

  -- Métadonnées audio spécifiques
  artist TEXT,
  album TEXT,
  bpm INTEGER,

  -- État
  is_active BOOLEAN DEFAULT true,

  -- Propriétaire
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_media_assets_category ON public.media_assets(category);
CREATE INDEX IF NOT EXISTS idx_media_assets_file_type ON public.media_assets(file_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_event_trigger ON public.media_assets(event_trigger);
CREATE INDEX IF NOT EXISTS idx_media_assets_is_active ON public.media_assets(is_active);
CREATE INDEX IF NOT EXISTS idx_media_assets_tags ON public.media_assets USING GIN(tags);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_media_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_media_assets_updated_at();

-- RLS Policies
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Permettre la lecture à tous (authenticated)
CREATE POLICY "Media assets visible by authenticated users"
  ON public.media_assets
  FOR SELECT
  TO authenticated
  USING (true);

-- Permettre l'insertion aux utilisateurs authentifiés
CREATE POLICY "Users can insert media assets"
  ON public.media_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Permettre la mise à jour par le propriétaire
CREATE POLICY "Users can update their own media assets"
  ON public.media_assets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Permettre la suppression par le propriétaire
CREATE POLICY "Users can delete their own media assets"
  ON public.media_assets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Table pour associer les médias aux sessions/rounds/questions
CREATE TABLE IF NOT EXISTS public.session_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE NOT NULL,

  -- Configuration de lecture
  play_at TEXT NOT NULL, -- 'start', 'reveal', 'timer_end', etc.
  volume DECIMAL(3,2) DEFAULT 1.0, -- 0.0 à 1.0
  fade_in_ms INTEGER DEFAULT 0,
  fade_out_ms INTEGER DEFAULT 0,
  loop BOOLEAN DEFAULT false,

  -- Ordre de lecture si plusieurs médias
  play_order INTEGER DEFAULT 0
);

-- Index
CREATE INDEX IF NOT EXISTS idx_session_media_session_id ON public.session_media(session_id);
CREATE INDEX IF NOT EXISTS idx_session_media_round_id ON public.session_media(round_id);
CREATE INDEX IF NOT EXISTS idx_session_media_question_id ON public.session_media(question_id);
CREATE INDEX IF NOT EXISTS idx_session_media_media_asset_id ON public.session_media(media_asset_id);

-- RLS
ALTER TABLE public.session_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session media visible by authenticated users"
  ON public.session_media
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage session media"
  ON public.session_media
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Créer le bucket de stockage media (sera créé automatiquement via Supabase dashboard)
-- Commentaire pour rappel : Créer le bucket 'media' dans Supabase Storage avec accès public

-- Grant permissions
GRANT ALL ON public.media_assets TO authenticated;
GRANT ALL ON public.session_media TO authenticated;

COMMENT ON TABLE public.media_assets IS 'Stockage des assets média (musiques, jingles, images) pour l''application';
COMMENT ON TABLE public.session_media IS 'Association des médias aux sessions, rounds et questions avec configuration de lecture';

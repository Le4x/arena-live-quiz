-- Créer la table pour les demandes d'aide des équipes
CREATE TABLE IF NOT EXISTS public.help_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Activer RLS
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;

-- Politique : Tout le monde peut voir les demandes
CREATE POLICY "Anyone can view help requests"
ON public.help_requests
FOR SELECT
USING (true);

-- Politique : Tout le monde peut créer une demande d'aide
CREATE POLICY "Anyone can create help requests"
ON public.help_requests
FOR INSERT
WITH CHECK (true);

-- Politique : Les admins peuvent mettre à jour les demandes
CREATE POLICY "Admins can update help requests"
ON public.help_requests
FOR UPDATE
USING (is_admin(auth.uid()));

-- Activer les mises à jour en temps réel
ALTER TABLE public.help_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.help_requests;
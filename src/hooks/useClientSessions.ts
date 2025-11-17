import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClientSessionData {
  id: string;
  created_at: string;
  name: string;
  status: string;
  access_code: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_company?: string;
  client_address?: string;
  event_date?: string;
  event_location?: string;
  event_description?: string;
  max_teams: number;
  custom_instructions?: string;
  branding_primary_color?: string;
  branding_secondary_color?: string;
  branding_logo_url?: string;
  branding_background_url?: string;
  session_type: 'quiz' | 'blindtest' | 'mixed';
  is_public: boolean;
  qr_code_url?: string;
  notes?: string;
  logo_url?: string;
  started_at?: string;
  ended_at?: string;
  selected_rounds?: any[];
  has_final?: boolean;
  current_round_index?: number;
}

export interface CreateSessionInput {
  name: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_company?: string;
  client_address?: string;
  event_date?: string;
  event_location?: string;
  event_description?: string;
  max_teams?: number;
  custom_instructions?: string;
  branding_primary_color?: string;
  branding_secondary_color?: string;
  branding_logo_url?: string;
  session_type?: 'quiz' | 'blindtest' | 'mixed';
  notes?: string;
}

export function useClientSessions() {
  const queryClient = useQueryClient();

  // Fetch all client sessions
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['client-sessions-v2'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .order('event_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get team counts separately for each session
      const sessionsWithCounts = await Promise.all(
        (data || []).map(async (session) => {
          const { count } = await supabase
            .from('teams')
            .select('*', { count: 'exact', head: true })
            .eq('game_session_id', session.id);

          return {
            ...session,
            teams: [{ count: count || 0 }],
          };
        })
      );

      return sessionsWithCounts as (ClientSessionData & { teams: { count: number }[] })[];
    },
  });

  // Fetch single session by ID
  const useSession = (sessionId?: string) => {
    return useQuery({
      queryKey: ['client-session', sessionId],
      queryFn: async () => {
        if (!sessionId) return null;

        const { data, error } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (error) throw error;
        return data as ClientSessionData;
      },
      enabled: !!sessionId,
    });
  };

  // Fetch session by access code
  const useSessionByCode = (accessCode?: string) => {
    return useQuery({
      queryKey: ['client-session-by-code', accessCode],
      queryFn: async () => {
        if (!accessCode) return null;

        const { data, error } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('access_code', accessCode)
          .single();

        if (error) throw error;
        return data as ClientSessionData;
      },
      enabled: !!accessCode,
    });
  };

  // Create new session
  const createSession = useMutation({
    mutationFn: async (input: CreateSessionInput) => {
      const { data, error } = await supabase
        .from('game_sessions')
        .insert({
          ...input,
          status: 'draft',
          max_teams: input.max_teams || 20,
          session_type: input.session_type || 'quiz',
          branding_primary_color: input.branding_primary_color || '#3b82f6',
          branding_secondary_color: input.branding_secondary_color || '#8b5cf6',
          is_public: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ClientSessionData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-sessions-v2'] });
      queryClient.invalidateQueries({ queryKey: ['client-sessions'] }); // Old key
      toast.success('Session créée avec succès !');
    },
    onError: (error) => {
      console.error('Error creating session:', error);
      toast.error('Erreur lors de la création de la session');
    },
  });

  // Update session
  const updateSession = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ClientSessionData> & { id: string }) => {
      const { data, error } = await supabase
        .from('game_sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ClientSessionData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-sessions-v2'] });
      queryClient.invalidateQueries({ queryKey: ['client-sessions'] }); // Old key
      toast.success('Session mise à jour avec succès !');
    },
    onError: (error) => {
      console.error('Error updating session:', error);
      toast.error('Erreur lors de la mise à jour de la session');
    },
  });

  // Delete session
  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('game_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-sessions-v2'] });
      queryClient.invalidateQueries({ queryKey: ['client-sessions'] }); // Old key
      toast.success('Session supprimée avec succès !');
    },
    onError: (error) => {
      console.error('Error deleting session:', error);
      toast.error('Erreur lors de la suppression de la session');
    },
  });

  return {
    sessions,
    isLoading,
    useSession,
    useSessionByCode,
    createSession,
    updateSession,
    deleteSession,
  };
}

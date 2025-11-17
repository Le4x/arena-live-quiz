/**
 * RegieWrapper - Smart wrapper for Regie page
 * Handles session selection via URL parameter or shows SessionSelector
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Regie from "./Regie";
import SessionSelector from "./SessionSelector";
import { useToast } from "@/hooks/use-toast";

const RegieWrapper = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);

  useEffect(() => {
    const initializeSession = async () => {
      // Try to get session from URL parameter first
      const urlSessionId = searchParams.get('session');

      if (urlSessionId) {
        // Validate the session exists and is active/paused
        const { data, error } = await supabase
          .from('game_sessions')
          .select('id, status, name')
          .eq('id', urlSessionId)
          .single();

        if (error || !data) {
          toast({
            title: "Session invalide",
            description: "La session demandée n'existe pas",
            variant: "destructive"
          });
          // Redirect to session selector
          navigate('/regie');
          setLoading(false);
          return;
        }

        if (data.status === 'completed') {
          toast({
            title: "Session terminée",
            description: `La session "${data.name}" est terminée. Veuillez en sélectionner une autre.`,
            variant: "destructive"
          });
          navigate('/regie');
          setLoading(false);
          return;
        }

        // If session status is draft, activate it automatically
        if (data.status === 'draft') {
          const { error: updateError } = await supabase
            .from('game_sessions')
            .update({ status: 'active' })
            .eq('id', urlSessionId);

          if (updateError) {
            console.error('Error activating session:', updateError);
          } else {
            toast({
              title: "✅ Session activée",
              description: `Session "${data.name}" est maintenant active`
            });
          }
        }

        // Valid session found
        setSessionId(urlSessionId);
        setSessionValid(true);
        localStorage.setItem('last_regie_session_id', urlSessionId);
        setLoading(false);
        return;
      }

      // No URL parameter - try localStorage
      const lastSessionId = localStorage.getItem('last_regie_session_id');
      if (lastSessionId) {
        // Validate it still exists
        const { data, error } = await supabase
          .from('game_sessions')
          .select('id, status')
          .eq('id', lastSessionId)
          .single();

        if (data && data.status !== 'completed') {
          // Redirect to URL with session parameter
          navigate(`/regie?session=${lastSessionId}`, { replace: true });
          setLoading(false);
          return;
        }
      }

      // No valid session - show selector
      setLoading(false);
    };

    initializeSession();
  }, [searchParams, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl">Chargement de la session...</p>
        </div>
      </div>
    );
  }

  // Show Regie if valid session, otherwise show SessionSelector
  return sessionValid && sessionId ? <Regie key={sessionId} /> : <SessionSelector />;
};

export default RegieWrapper;

/**
 * useResync - Hook pour re-synchroniser l'état après un refresh
 * Garantit qu'un client/screen retrouve tout l'état du jeu
 */

import { useEffect, useState } from 'react';
import { fetchSnapshot, type CompleteGameState } from '@/lib/services/snapshot';

export const useResync = (sessionId: string | null) => {
  const [snapshot, setSnapshot] = useState<CompleteGameState | null>(null);
  const [isResyncing, setIsResyncing] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setIsResyncing(false);
      return;
    }

    const resync = async () => {
      console.log('🔄 [useResync] Démarrage re-sync pour session', sessionId);
      setIsResyncing(true);
      setError(null);

      try {
        const data = await fetchSnapshot(sessionId);
        setSnapshot(data);
        console.log('✅ [useResync] Re-sync terminé', data);
      } catch (err) {
        console.error('❌ [useResync] Erreur re-sync:', err);
        setError(err as Error);
      } finally {
        setIsResyncing(false);
      }
    };

    resync();
  }, [sessionId]);

  return { snapshot, isResyncing, error };
};

import { useEffect, useRef } from 'react';

/**
 * Hook pour empêcher l'écran de se mettre en veille
 * Utilise l'API Wake Lock pour garder l'écran actif
 */
export const useWakeLock = () => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('🔒 Wake Lock activé - l\'écran ne se mettra pas en veille');
        
        wakeLockRef.current.addEventListener('release', () => {
          console.log('🔓 Wake Lock relâché');
        });
      } else {
        console.warn('⚠️ Wake Lock API non supportée sur cet appareil');
      }
    } catch (err) {
      console.error('❌ Erreur lors de l\'activation du Wake Lock:', err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('🔓 Wake Lock désactivé');
      } catch (err) {
        console.error('❌ Erreur lors de la désactivation du Wake Lock:', err);
      }
    }
  };

  useEffect(() => {
    // Activer le Wake Lock au montage du composant
    requestWakeLock();

    // Réactiver le Wake Lock quand l'utilisateur revient sur la page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('📱 Page visible - Réactivation du Wake Lock');
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Nettoyer au démontage
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, []);

  return {
    requestWakeLock,
    releaseWakeLock
  };
};

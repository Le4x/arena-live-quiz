import * as Sentry from '@sentry/react';

/**
 * Initialiser Sentry pour le monitoring d'erreurs
 * À appeler au démarrage de l'application
 */
export const initSentry = () => {
  // Ne pas initialiser en développement sauf si explicitement activé
  if (import.meta.env.DEV && !import.meta.env.VITE_SENTRY_ENABLE_DEV) {
    console.log('🔧 Sentry désactivé en mode développement');
    return;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn('⚠️ VITE_SENTRY_DSN non configuré - Sentry désactivé');
    return;
  }

  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Taux d'échantillonnage des transactions pour la performance
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,

    // Taux d'échantillonnage des replays
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Environnement
    environment: import.meta.env.MODE,

    // Version de l'app (à synchroniser avec package.json)
    release: `arena-live-quiz@${import.meta.env.VITE_APP_VERSION || '0.0.0'}`,

    // Filtrer les erreurs non pertinentes
    beforeSend(event, hint) {
      // Ignorer certaines erreurs connues
      const error = hint.originalException;

      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as Error).message;

        // Ignorer les erreurs de réseau transitoires
        if (message.includes('NetworkError') || message.includes('fetch')) {
          return null;
        }

        // Ignorer les erreurs d'extension de navigateur
        if (message.includes('chrome-extension://') || message.includes('moz-extension://')) {
          return null;
        }
      }

      return event;
    },

    // Ne pas envoyer les données sensibles
    beforeBreadcrumb(breadcrumb) {
      // Filtrer les données sensibles dans les breadcrumbs
      if (breadcrumb.category === 'console') {
        return null;
      }
      return breadcrumb;
    },
  });

  console.log('✅ Sentry initialisé');
};

import * as Sentry from '@sentry/react';
import { toast } from '@/hooks/use-toast';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  userId?: string;
  teamId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  [key: string]: any;
}

/**
 * Classe centralisée pour la gestion des erreurs
 */
export class ErrorHandler {
  /**
   * Capturer et traiter une erreur
   */
  static capture(
    error: Error | string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: ErrorContext
  ): void {
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    // Log en console en développement
    if (import.meta.env.DEV) {
      console.error('🔴 Error captured:', {
        error: errorObj,
        severity,
        context,
      });
    }

    // Envoyer à Sentry en production
    if (import.meta.env.PROD) {
      Sentry.captureException(errorObj, {
        level: this.mapSeverityToSentryLevel(severity),
        contexts: context ? { custom: context } : undefined,
        tags: context ? {
          component: context.component,
          action: context.action,
        } : undefined,
      });
    }

    // Afficher un toast pour les erreurs critiques
    if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH) {
      this.showErrorToast(errorObj);
    }
  }

  /**
   * Wrapper pour les fonctions async avec gestion d'erreur
   */
  static async withErrorHandling<T>(
    fn: () => Promise<T>,
    context?: ErrorContext,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      this.capture(error as Error, severity, context);
      return null;
    }
  }

  /**
   * Wrapper pour les fonctions synchrones avec gestion d'erreur
   */
  static withErrorHandlingSync<T>(
    fn: () => T,
    context?: ErrorContext,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): T | null {
    try {
      return fn();
    } catch (error) {
      this.capture(error as Error, severity, context);
      return null;
    }
  }

  /**
   * Mapper la sévérité vers Sentry
   */
  private static mapSeverityToSentryLevel(severity: ErrorSeverity): Sentry.SeverityLevel {
    const mapping: Record<ErrorSeverity, Sentry.SeverityLevel> = {
      [ErrorSeverity.LOW]: 'info',
      [ErrorSeverity.MEDIUM]: 'warning',
      [ErrorSeverity.HIGH]: 'error',
      [ErrorSeverity.CRITICAL]: 'fatal',
    };
    return mapping[severity];
  }

  /**
   * Afficher un toast d'erreur
   */
  private static showErrorToast(error: Error): void {
    toast({
      variant: 'destructive',
      title: 'Une erreur est survenue',
      description: import.meta.env.DEV
        ? error.message
        : 'Veuillez réessayer ou contacter le support si le problème persiste.',
    });
  }

  /**
   * Configurer le contexte utilisateur pour Sentry
   */
  static setUserContext(userId: string, email?: string, teamId?: string): void {
    if (import.meta.env.PROD) {
      Sentry.setUser({
        id: userId,
        email,
        teamId,
      });
    }
  }

  /**
   * Effacer le contexte utilisateur
   */
  static clearUserContext(): void {
    if (import.meta.env.PROD) {
      Sentry.setUser(null);
    }
  }

  /**
   * Ajouter un breadcrumb pour le suivi
   */
  static addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
    if (import.meta.env.PROD) {
      Sentry.addBreadcrumb({
        message,
        category,
        data,
        level: 'info',
      });
    }
  }
}

/**
 * Hook pour utiliser ErrorHandler dans les composants
 */
export const useErrorHandler = () => {
  return {
    capture: ErrorHandler.capture.bind(ErrorHandler),
    withErrorHandling: ErrorHandler.withErrorHandling.bind(ErrorHandler),
    withErrorHandlingSync: ErrorHandler.withErrorHandlingSync.bind(ErrorHandler),
    setUserContext: ErrorHandler.setUserContext.bind(ErrorHandler),
    clearUserContext: ErrorHandler.clearUserContext.bind(ErrorHandler),
    addBreadcrumb: ErrorHandler.addBreadcrumb.bind(ErrorHandler),
  };
};

import { ErrorHandler, ErrorSeverity } from '@/lib/error/errorHandler';

/**
 * Niveaux de log disponibles
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Configuration du logger
 */
interface LoggerConfig {
  enableConsole: boolean;
  enableSentry: boolean;
  minLevel: LogLevel;
}

const DEFAULT_CONFIG: LoggerConfig = {
  enableConsole: true,
  enableSentry: import.meta.env.PROD,
  minLevel: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO,
};

/**
 * Logger centralisé et professionnel
 */
export class Logger {
  private static config: LoggerConfig = DEFAULT_CONFIG;
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Configurer le logger globalement
   */
  static configure(config: Partial<LoggerConfig>) {
    Logger.config = { ...Logger.config, ...config };
  }

  /**
   * Créer une instance de logger avec contexte
   */
  static create(context: string): Logger {
    return new Logger(context);
  }

  /**
   * Log de debug
   */
  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log d'information
   */
  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log d'avertissement
   */
  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log d'erreur
   */
  error(message: string, error?: Error | any, data?: any) {
    this.log(LogLevel.ERROR, message, data, error);
  }

  /**
   * Log critique
   */
  critical(message: string, error?: Error | any, data?: any) {
    this.log(LogLevel.CRITICAL, message, data, error);
  }

  /**
   * Méthode interne de log
   */
  private log(level: LogLevel, message: string, data?: any, error?: Error | any) {
    // Vérifier le niveau minimum
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}`;

    // Log en console
    if (Logger.config.enableConsole) {
      this.logToConsole(level, formattedMessage, data, error);
    }

    // Envoyer à Sentry si c'est une erreur
    if (Logger.config.enableSentry && (level === LogLevel.ERROR || level === LogLevel.CRITICAL)) {
      const severity = level === LogLevel.CRITICAL ? ErrorSeverity.CRITICAL : ErrorSeverity.HIGH;
      const errorObj = error instanceof Error ? error : new Error(message);

      ErrorHandler.capture(errorObj, severity, {
        component: this.context,
        ...data,
      });
    }

    // Ajouter un breadcrumb pour Sentry
    if (Logger.config.enableSentry) {
      ErrorHandler.addBreadcrumb(message, this.context, data);
    }
  }

  /**
   * Vérifier si on doit logger ce niveau
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.CRITICAL];
    const currentLevelIndex = levels.indexOf(Logger.config.minLevel);
    const logLevelIndex = levels.indexOf(level);
    return logLevelIndex >= currentLevelIndex;
  }

  /**
   * Logger dans la console avec le bon format
   */
  private logToConsole(level: LogLevel, message: string, data?: any, error?: Error | any) {
    const emoji = this.getEmojiForLevel(level);
    const styledMessage = `${emoji} ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(styledMessage, data || '');
        break;
      case LogLevel.INFO:
        console.info(styledMessage, data || '');
        break;
      case LogLevel.WARN:
        console.warn(styledMessage, data || '');
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(styledMessage, error || data || '');
        if (error?.stack) {
          console.error(error.stack);
        }
        break;
    }
  }

  /**
   * Obtenir l'emoji pour le niveau de log
   */
  private getEmojiForLevel(level: LogLevel): string {
    const emojis: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: '🔍',
      [LogLevel.INFO]: '💡',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.ERROR]: '❌',
      [LogLevel.CRITICAL]: '🔥',
    };
    return emojis[level];
  }

  /**
   * Mesurer la performance d'une fonction
   */
  async measurePerformance<T>(
    label: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    this.debug(`${label} - Début`);

    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.info(`${label} - Terminé en ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`${label} - Erreur après ${duration.toFixed(2)}ms`, error as Error);
      throw error;
    }
  }
}

// Exports de convenance
export const createLogger = (context: string) => Logger.create(context);

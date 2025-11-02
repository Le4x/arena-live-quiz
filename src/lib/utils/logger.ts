/**
 * Système de logging structuré
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  action?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private minLevel: LogLevel = 'debug';

  private getEmoji(level: LogLevel): string {
    switch (level) {
      case 'debug': return '🔍';
      case 'info': return 'ℹ️';
      case 'warn': return '⚠️';
      case 'error': return '❌';
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDevelopment) return level === 'error';
    
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const emoji = this.getEmoji(level);
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = context?.component ? `[${context.component}]` : '';
    
    return `${emoji} ${timestamp} ${prefix} ${message}`;
  }

  debug(message: string, context?: LogContext) {
    if (!this.shouldLog('debug')) return;
    console.log(this.formatMessage('debug', message, context), context || '');
  }

  info(message: string, context?: LogContext) {
    if (!this.shouldLog('info')) return;
    console.info(this.formatMessage('info', message, context), context || '');
  }

  warn(message: string, context?: LogContext) {
    if (!this.shouldLog('warn')) return;
    console.warn(this.formatMessage('warn', message, context), context || '');
  }

  error(message: string, error?: Error, context?: LogContext) {
    if (!this.shouldLog('error')) return;
    console.error(this.formatMessage('error', message, context), error, context || '');
  }

  // Helpers spécifiques
  realtime(message: string, data?: any) {
    this.debug(`📡 ${message}`, { component: 'Realtime', data });
  }

  audio(message: string, data?: any) {
    this.debug(`🎵 ${message}`, { component: 'Audio', data });
  }

  buzzer(message: string, data?: any) {
    this.info(`🔔 ${message}`, { component: 'Buzzer', data });
  }

  game(message: string, data?: any) {
    this.info(`🎮 ${message}`, { component: 'Game', data });
  }
}

export const logger = new Logger();

/**
 * Logger Utility
 * 
 * Structured logging for the scraper with different log levels
 * and context tracking.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

class Logger {
  private level: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };

    this.logs.push(entry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Output to console
    const logFn = this.getLogFunction(level);
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    logFn(`[${entry.timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private getLogFunction(level: LogLevel): typeof console.log {
    switch (level) {
      case 'debug': return console.debug;
      case 'info': return console.info;
      case 'warn': return console.warn;
      case 'error': return console.error;
    }
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

export const logger = new Logger(process.env.LOG_LEVEL as LogLevel || 'info');

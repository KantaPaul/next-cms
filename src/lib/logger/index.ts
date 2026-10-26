import pino, { type Logger as PinoLogger } from 'pino';
import { getPinoConfig, redactionPaths } from './config';

class Logger {
  private logger: PinoLogger;
  private static instance: Logger;

  private constructor() {
    try {
      const config = getPinoConfig();

      // Add redaction for sensitive data
      this.logger = pino({
        ...config,
        redact: {
          paths: redactionPaths,
          remove: true,
        },
      });
    } catch (error) {
      // Fallback to basic logger if transport fails
      this.logger = pino({
        level: process.env.LOG_LEVEL || 'info',
        timestamp: true,
      });
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }

    return Logger.instance;
  }

  // Main logging methods
  public fatal(message: string, ...args: any[]): void {
    this.logger.fatal(this.formatArgs(args), message);
  }

  public error(message: string | Error, ...args: any[]): void {
    if (message instanceof Error) {
      this.logger.error(
        { err: message, ...this.formatArgs(args) },
        message.message
      );
    } else {
      this.logger.error(this.formatArgs(args), message);
    }
  }

  public warn(message: string, ...args: any[]): void {
    this.logger.warn(this.formatArgs(args), message);
  }

  public info(message: string, ...args: any[]): void {
    this.logger.info(this.formatArgs(args), message);
  }

  public debug(message: string, ...args: any[]): void {
    this.logger.debug(this.formatArgs(args), message);
  }

  public trace(message: string, ...args: any[]): void {
    this.logger.trace(this.formatArgs(args), message);
  }

  // Specialized logging methods
  public logError(error: Error, context?: string): void {
    this.logger.error(
      {
        err: error,
        context,
        errorName: error.name,
        errorMessage: error.message,
      },
      `Error in ${context || 'Application'}`
    );
  }

  public logRequest(req: any, res: any, responseTime: number): void {
    const level =
      res.statusCode >= 400 ? 'error' : res.statusCode >= 300 ? 'warn' : 'info';

    this.logger[level](
      {
        req: {
          method: req.method,
          url: req.url,
          headers: req.headers,
          query: req.query,
          body: req.body,
        },
        res: {
          statusCode: res.statusCode,
          headers: res.headers,
        },
        responseTime: `${responseTime}ms`,
        userAgent: req.headers?.['user-agent'],
        ip: req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress,
      },
      `${req.method} ${req.url} ${res.statusCode} ${responseTime}ms`
    );
  }

  public logDatabaseQuery(
    query: string,
    params?: any[],
    duration?: number
  ): void {
    this.logger.debug(
      {
        query: query.substring(0, 1000), // Limit query length
        params: params?.length ? params : undefined,
        duration: duration ? `${duration}ms` : undefined,
        type: 'database',
      },
      'Database Query'
    );
  }

  public logBusinessEvent(event: string, data?: any): void {
    this.logger.info(
      {
        event,
        type: 'business',
        ...data,
      },
      `Business Event: ${event}`
    );
  }

  public logSecurityEvent(event: string, data?: any): void {
    this.logger.warn(
      {
        event,
        type: 'security',
        ...data,
      },
      `Security Event: ${event}`
    );
  }

  public logPerformance(operation: string, duration: number, meta?: any): void {
    const level = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug';

    this.logger[level](
      {
        operation,
        duration: `${duration}ms`,
        type: 'performance',
        ...meta,
      },
      `Performance: ${operation} took ${duration}ms`
    );
  }

  // Child logger for specific modules
  public child(bindings: Record<string, any>): PinoLogger {
    return this.logger.child(bindings);
  }

  // Get the raw Pino instance for advanced use cases
  public getRawLogger(): PinoLogger {
    return this.logger;
  }

  // Helper to format arguments
  private formatArgs(args: any[]): any {
    if (args.length === 0) return {};
    if (args.length === 1 && typeof args[0] === 'object') return args[0];
    return { data: args };
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export for Next.js API routes
export const pinoLogger = logger.getRawLogger();

// Export types
export type { Logger, PinoLogger };

// Default export
export default logger;

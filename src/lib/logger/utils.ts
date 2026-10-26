import { logger } from './index';
import { simpleLog } from './simple';

/**
 * Filter out sensitive or verbose data from logs
 */
function filterSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const filtered: any = {};
  const sensitiveFields = [
    'password',
    'token',
    'apiKey',
    'secret',
    'authorization',
    'cookie',
    'session',
    'key',
    'auth',
    'credential',
  ];

  // Fields that are usually too verbose for logs
  const verboseFields = [
    'createdAt',
    'updatedAt',
    'deletedAt',
    'createdBy',
    'updatedBy',
    'teamId',
    'version',
    'metadata',
    'userId', // user context is usually known
  ];

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    // Skip sensitive fields entirely
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      continue;
    }

    // Skip verbose fields in debug logs
    if (verboseFields.includes(key)) {
      continue;
    }

    // Handle different value types
    if (typeof value === 'string' && value.length > 100) {
      // Truncate long strings
      filtered[key] = `${value.substring(0, 100)}...`;
    } else if (Array.isArray(value) && value.length > 5) {
      // Truncate long arrays
      filtered[key] = `[${value.length} items]`;
    } else if (typeof value === 'object' && value !== null) {
      // Recursively filter nested objects
      const nestedFiltered = filterSensitiveData(value);

      if (nestedFiltered !== undefined) {
        filtered[key] = nestedFiltered;
      }
    } else {
      filtered[key] = value;
    }
  }

  return Object.keys(filtered).length > 0 ? filtered : undefined;
}

/**
 * Utility wrapper for logging
 * Uses simple logger for maximum Next.js compatibility
 */
export const log = {
  // Direct replacements for console methods with smart filtering
  log: (message: string, ...args: any[]) => {
    const data = args[0];
    const flattened = data?.input
      ? filterSensitiveData(data.input)
      : filterSensitiveData(data);
    simpleLog.info(message, flattened);
  },
  info: (message: string, ...args: any[]) => {
    const data = args[0];
    const flattened = data?.input
      ? filterSensitiveData(data.input)
      : filterSensitiveData(data);
    simpleLog.info(message, flattened);
  },
  warn: (message: string, ...args: any[]) => {
    const data = args[0];
    const flattened = data?.input
      ? filterSensitiveData(data.input)
      : filterSensitiveData(data);
    simpleLog.warn(message, flattened);
  },
  error: (message: string | Error, ...args: any[]) =>
    simpleLog.error(message, args[0]),
  debug: (message: string, ...args: any[]) => {
    const data = args[0];
    const flattened = data?.input
      ? filterSensitiveData(data.input)
      : filterSensitiveData(data);
    simpleLog.debug(message, flattened);
  },

  // Enhanced logging methods
  database: (query: string, params?: any[], duration?: number) => {
    logger.logDatabaseQuery(query, params, duration);
  },

  business: (event: string, data?: any) => {
    logger.logBusinessEvent(event, data);
  },

  security: (event: string, data?: any) => {
    logger.logSecurityEvent(event, data);
  },

  performance: (operation: string, duration: number, meta?: any) => {
    logger.logPerformance(operation, duration, meta);
  },

  request: (req: any, res: any, responseTime: number) => {
    logger.logRequest(req, res, responseTime);
  },

  // Service operation logging with smart data filtering
  service: {
    create: (service: string, data?: any) => {
      const filtered = filterSensitiveData(data);
      simpleLog.info(`${service}: Creating record`, filtered);
    },
    update: (service: string, id: string, data?: any) => {
      const filtered = filterSensitiveData(data);
      simpleLog.info(`${service}: Updating record`, { id, ...filtered });
    },
    delete: (service: string, id: string) => {
      simpleLog.info(`${service}: Deleting record`, { id });
    },
    get: (service: string, params?: any) => {
      const filtered = filterSensitiveData(params);
      simpleLog.debug(`${service}: Getting records`, filtered);
    },
  },
};

/**
 * Middleware for logging HTTP requests in Next.js API routes
 */
export function withLogging(handler: any) {
  return async (req: any, res: any) => {
    const start = Date.now();

    // Log incoming request
    logger.info(`Incoming ${req.method} ${req.url}`, {
      headers: req.headers,
      query: req.query,
      body: req.body,
    });

    try {
      // Execute the handler
      const result = await handler(req, res);

      // Log successful response
      const duration = Date.now() - start;
      logger.logRequest(req, res, duration);

      return result;
    } catch (error) {
      // Log error
      const duration = Date.now() - start;
      logger.logError(error as Error, `API Error: ${req.method} ${req.url}`);
      logger.logRequest(req, res, duration);

      throw error;
    }
  };
}

/**
 * Wrapper for async functions with automatic error logging
 */
export function withErrorLogging<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      logger.logError(error as Error, context || fn.name);
      throw error;
    }
  }) as T;
}

/**
 * Timer utility for measuring execution time
 */
export class Timer {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = Date.now();
    logger.debug(`Starting timer for: ${operation}`);
  }

  public end(meta?: any): void {
    const duration = Date.now() - this.startTime;
    logger.logPerformance(this.operation, duration, meta);
  }
}

/**
 * Structured logging helper for consistent log format
 */
export function createLogContext(module: string, action?: string) {
  return {
    module,
    action,
    environment: process.env.NODE_ENV,
  };
}

/**
 * Log with context
 */
export function logWithContext(
  level: 'info' | 'warn' | 'error' | 'debug',
  module: string,
  action: string,
  message: string,
  meta?: any
) {
  const context = createLogContext(module, action);
  const fullMeta = { ...context, ...meta };

  switch (level) {
    case 'error':
      logger.error(message, fullMeta);
      break;
    case 'warn':
      logger.warn(message, fullMeta);
      break;
    case 'info':
      logger.info(message, fullMeta);
      break;
    case 'debug':
      logger.debug(message, fullMeta);
      break;
  }
}

/**
 * Create a logger for a specific service
 * Usage: const serviceLogger = createServiceLogger('UserService');
 * Then: serviceLogger.update(id, data);
 */
export function createServiceLogger(serviceName: string) {
  return {
    create: (data?: any) => {
      const filtered = filterSensitiveData(data);
      simpleLog.info(`${serviceName}: Creating`, filtered);
    },
    update: (id: string, data?: any) => {
      const filtered = filterSensitiveData(data);
      simpleLog.info(`${serviceName}: Updating ${id}`, filtered);
    },
    delete: (id: string) => {
      simpleLog.info(`${serviceName}: Deleting ${id}`);
    },
    get: (params?: any) => {
      const filtered = filterSensitiveData(params);

      if (filtered && Object.keys(filtered).length > 0) {
        simpleLog.debug(`${serviceName}: Query`, filtered);
      } else {
        simpleLog.debug(`${serviceName}: Query`);
      }
    },
    error: (action: string, error: Error, context?: any) => {
      simpleLog.error(`${serviceName}: ${action} failed`, {
        error: error.message,
        ...filterSensitiveData(context),
      });
    },
    success: (action: string, result?: any) => {
      const filtered = filterSensitiveData(result);
      simpleLog.info(`${serviceName}: ${action} completed`, filtered);
    },
  };
}

export default log;

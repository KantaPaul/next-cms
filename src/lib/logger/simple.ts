/**
 * Simple Pino logger without transports - works everywhere in Next.js
 */
import pino from 'pino';

// Pretty console formatter for development
const prettyFormat = (level: string, msg: string, obj?: any) => {
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev) {
    // Production: use JSON format
    return { level, msg, ...obj };
  }

  // Development: pretty console format
  const colors = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m', // green
    warn: '\x1b[33m', // yellow
    error: '\x1b[31m', // red
    fatal: '\x1b[35m', // magenta
  };
  const reset = '\x1b[0m';
  const gray = '\x1b[90m';

  const color = colors[level as keyof typeof colors] || '\x1b[37m';
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });

  // Format the message
  let formatted = `${gray}[${time}]${reset} ${color}${level.toUpperCase()}${reset} ${msg}`;

  // Add object data in a readable format
  if (obj && Object.keys(obj).length > 0) {
    formatted += `\n${gray}├─${reset} ${JSON.stringify(obj, null, 2).replace(/\n/g, `\n${gray}│ ${reset}`)}`;
  }

  return formatted;
};

// Create a simple logger without any transports to avoid worker issues
const createSimpleLogger = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  if (isDevelopment) {
    // Custom pretty logger for development
    return {
      debug: (obj: any, msg: string) => {
        console.log(prettyFormat('debug', msg, obj));
      },
      info: (obj: any, msg: string) => {
        console.log(prettyFormat('info', msg, obj));
      },
      warn: (obj: any, msg: string) => {
        console.log(prettyFormat('warn', msg, obj));
      },
      error: (obj: any, msg: string) => {
        console.log(prettyFormat('error', msg, obj));
      },
      fatal: (obj: any, msg: string) => {
        console.log(prettyFormat('fatal', msg, obj));
      },
    };
  }

  // Production: use Pino
  return pino({
    level: process.env.LOG_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      env: process.env.NODE_ENV,
      service: process.env.LOG_SERVICE_NAME || 'proa-erp',
    },
    formatters: {
      level: label => ({ level: label }),
    },
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
    redact: {
      paths: [
        '*.password',
        '*.token',
        '*.apiKey',
        '*.secret',
        '*.authorization',
      ],
      remove: true,
    },
  });
};

// Create singleton instance
let loggerInstance: ReturnType<typeof createSimpleLogger> | null = null;

export const getSimpleLogger = () => {
  if (!loggerInstance) {
    loggerInstance = createSimpleLogger();
  }

  return loggerInstance;
};

// Export convenience wrapper
export const simpleLog = {
  debug: (msg: string, obj?: any) => getSimpleLogger().debug(obj || {}, msg),
  info: (msg: string, obj?: any) => getSimpleLogger().info(obj || {}, msg),
  warn: (msg: string, obj?: any) => getSimpleLogger().warn(obj || {}, msg),
  error: (msg: string | Error, obj?: any) => {
    const logger = getSimpleLogger();

    if (msg instanceof Error) {
      logger.error({ err: msg, ...obj }, msg.message);
    } else {
      logger.error(obj || {}, msg);
    }
  },

  fatal: (msg: string, obj?: any) => getSimpleLogger().fatal(obj || {}, msg),
};

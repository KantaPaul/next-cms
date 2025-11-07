import type { LoggerOptions } from 'pino';
import { hostname } from 'os';

// Get log level based on environment
export const getLogLevel = (): string => {
  const env = process.env.NODE_ENV || 'development';
  const customLevel = process.env.LOG_LEVEL;

  if (customLevel) {
    return customLevel;
  }

  switch (env) {
    case 'production':
      return 'info';
    case 'test':
      return 'warn';
    default:
      return 'debug';
  }
};

// External logging service configuration (optional)
export const getExternalLogConfig = () => {
  const apiEndpoint = process.env.LOG_API_ENDPOINT;
  const apiKey = process.env.LOG_API_KEY;

  // Only enable if both endpoint and key are provided
  const enabled = !!apiKey && !!apiEndpoint;

  return {
    service: process.env.LOG_SERVICE_NAME || 'next-cms',
    env: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
    apiEndpoint,
    apiKey,
    enabled,
  };
};

// Pino base configuration
export const getPinoConfig = (): LoggerOptions => {
  const config: LoggerOptions = {
    level: getLogLevel(),
    name: process.env.LOG_SERVICE_NAME || 'next-cms',
    timestamp: true,
    base: {
      pid: process.pid,
      hostname: hostname(),
      env: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
    },
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    serializers: {
      err: (err) => ({
        type: err.constructor.name,
        message: err.message,
        stack: err.stack,
        code: err.code,
        statusCode: err.statusCode,
      }),
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: req.query,
        params: req.params,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        headers: res.headers,
      }),
    },
  };

  // No transports to prevent Next.js worker issues
  // Raw JSON output works everywhere

  return config;
};

// Redaction paths for sensitive data
export const redactionPaths = [
  '*.password',
  '*.token',
  '*.apiKey',
  '*.secret',
  '*.authorization',
  '*.cookie',
  'req.headers.authorization',
  'req.headers.cookie',
];

// Custom log levels (optional, using Pino defaults)
export const customLevels = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
};

import pino from 'pino';

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
    : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const logger = {
  info: (message: string, data?: any) => {
    if (data) pinoLogger.info(data, message);
    else pinoLogger.info(message);
  },
  error: (message: string, error?: any) => {
    if (error) pinoLogger.error(error, message);
    else pinoLogger.error(message);
  },
  warn: (message: string, data?: any) => {
    if (data) pinoLogger.warn(data, message);
    else pinoLogger.warn(message);
  },
  debug: (message: string, data?: any) => {
    if (data) pinoLogger.debug(data, message);
    else pinoLogger.debug(message);
  },
  child: (bindings: Record<string, any>) => pinoLogger.child(bindings),
};

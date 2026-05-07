import pino from 'pino';

function buildLogger() {
  const level = process.env.LOG_LEVEL || 'info';
  const formatters = { level: (label: string) => ({ level: label }) };
  const timestamp = pino.stdTimeFunctions.isoTime;

  if (process.env.NODE_ENV !== 'production') {
    try {
      return pino({
        level,
        transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
        formatters,
        timestamp,
      });
    } catch {
      // Worker thread limit hit — fall back to plain JSON output
    }
  }

  return pino({ level, formatters, timestamp });
}

const pinoLogger = buildLogger();

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

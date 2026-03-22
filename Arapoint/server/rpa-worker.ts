import { rpaBot } from "./src/rpa/bot";
import { logger } from "./src/utils/logger";

const shutdown = async (signal: string) => {
  logger.info(`RPA Worker: received ${signal}, shutting down...`);
  await rpaBot.stop();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err: Error) => {
  logger.error('RPA Worker: uncaught exception', { error: err.message, stack: err.stack });
});
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('RPA Worker: unhandled rejection', { reason: String(reason) });
});

(async () => {
  logger.info('RPA Worker process starting...');
  try {
    await rpaBot.start();
    logger.info('RPA Worker is running and polling for jobs');
  } catch (err: any) {
    logger.error('RPA Worker failed to start', { error: err.message, stack: err.stack });
    process.exit(1);
  }
})();

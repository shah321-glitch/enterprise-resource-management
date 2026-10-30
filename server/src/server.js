import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { initScheduler } from './cron/scheduler.js';

const app = createApp();

const startServer = async () => {
  try {
    const server = app.listen(env.PORT, () => {
      logger.info(`ERSMS backend running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
      logger.info(`Swagger docs available at http://localhost:${env.PORT}/api/docs`);
    });

    // Connect to database without crashing process if DB is warming up or requires IP whitelist
    connectDatabase()
      .then(() => {
        initScheduler();
      })
      .catch((err) => {
        logger.error({ err }, 'Initial MongoDB connection failed. Server is active and serving /api/v1/health.');
      });

    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDatabase();
        logger.info('Server closed. Exiting process.');
        process.exit(0);
      });

      // Force shutdown after 10s timeout
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.fatal({ err }, 'Fatal error during server startup');
    process.exit(1);
  }
};

if (!process.env.VERCEL) {
  startServer();
} else {
  connectDatabase().catch((err) => {
    logger.warn({ err: err.message }, 'Initial DB connection attempt on Vercel cold start');
  });
}

export default app;


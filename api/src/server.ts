import http from 'node:http';

import app from './app';
import { env } from './utils/env';
import { logger } from './utils/logger';
import { prisma } from './utils/prisma';

async function startServer(): Promise<void> {
  const server = http.createServer(app);

  server.listen(env.PORT, env.HOST, () => {
    logger.info(`Server listening on http://${env.HOST}:${env.PORT}`);
  });

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close();

    try {
      await prisma.$disconnect();
    } catch (error) {
      logger.error({ error }, 'Error while disconnecting services');
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((error) => {
  logger.error({ error }, 'Fatal error during server startup');
  process.exit(1);
});

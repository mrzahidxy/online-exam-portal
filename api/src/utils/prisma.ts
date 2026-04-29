import { PrismaClient } from '@prisma/client';

import { env } from './env';
import { logger } from './logger';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

prisma
  .$connect()
  .then(() => logger.info('Database connection established'))
  .catch((error) => {
    logger.error({ error }, 'Unable to connect to the database');
    process.exit(1);
  });

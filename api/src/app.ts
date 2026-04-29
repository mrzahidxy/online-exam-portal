import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit, { Options as RateLimitOptions } from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { env } from './utils/env';
import { httpLogger, logger, loggerWithRequestContext } from './utils/logger';
import { prisma } from './utils/prisma';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { serve, setup, swaggerSpec, swaggerUiOptions } from './middleware/swagger.middleware';

const app = express();

const trustProxySetting = env.TRUST_PROXY ? 1 : false;
app.set('trust proxy', trustProxySetting);

// Request/response tracing
app.use(requestIdMiddleware);
app.use(loggerWithRequestContext);
app.use(httpLogger);
app.use(cookieParser());

// Security and performance middleware
const limiterOptions: Partial<RateLimitOptions> & { trustProxy?: boolean } = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: Boolean(trustProxySetting),
};

const limiter = rateLimit(limiterOptions);

app.use(limiter);
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map(origin => origin.trim()),
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.get('/health', async (_req, res) => {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();
  const services: { database: 'up' | 'down' } = { database: 'up' };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    services.database = 'down';
    return res.status(503).json({
      status: 'error',
      timestamp,
      uptime,
      services,
      error: 'Database connection failed',
    });
  }

  res.status(200).json({
    status: 'ok',
    timestamp,
    uptime,
    services,
  });
});

// Swagger documentation
app.use('/api-docs', serve, setup(swaggerSpec, swaggerUiOptions));

// API versioning
app.use('/api/v1', routes);
app.use('/api', routes); // Backward compatibility

app.use(notFoundHandler);
app.use(errorHandler);

process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
});

export default app;

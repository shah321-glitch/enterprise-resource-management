import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalRateLimiter } from './middleware/rateLimiter.js';
import { mongoSanitize } from './middleware/sanitize.js';
import { requestId } from './middleware/requestId.js';
import { NotFoundError } from './utils/errors.js';

// Feature Module Routers
import healthRoutes, { readyHandler } from './modules/health/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import auditLogRoutes from './modules/audit-logs/audit-log.routes.js';
import resourceRoutes from './modules/resources/resource.routes.js';
import subscriptionRoutes from './modules/subscriptions/subscription.routes.js';
import projectRoutes from './modules/projects/project.routes.js';
import allocationRoutes from './modules/allocations/allocation.routes.js';
import apiCreditRoutes from './modules/api-credits/api-credit.routes.js';
import expenseRoutes from './modules/expenses/expense.routes.js';
import reportRoutes from './modules/reports/report.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = () => {
  const app = express();

  // Trust proxy for secure cookies behind reverse proxy (Nginx / Docker)
  app.set('trust proxy', 1);

  // Request ID tracking middleware
  app.use(requestId);

  // Security HTTP Headers
  app.use(helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
  }));

  // CORS configuration
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
    })
  );

  // Global rate limiter
  app.use(globalRateLimiter);

  // Request parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // Input sanitization against NoSQL injection
  app.use(mongoSanitize);

  // Structured HTTP logging
  if (env.NODE_ENV !== 'test') {
    app.use(
      pinoHttp({
        logger,
        genReqId: (req) => req.id || req.headers['x-request-id'],
        autoLogging: {
          ignore: (req) =>
            req.url.startsWith('/api/v1/health') ||
            req.url.startsWith('/api/v1/ready') ||
            req.url.startsWith('/api/docs'),
        },
      })
    );
  }

  // Swagger Documentation
  try {
    const swaggerDocPath = path.join(__dirname, 'docs', 'swagger.json');
    if (fs.existsSync(swaggerDocPath)) {
      const swaggerDocument = JSON.parse(fs.readFileSync(swaggerDocPath, 'utf8'));
      app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    }
  } catch (err) {
    logger.warn('Failed to initialize Swagger UI documentation', err);
  }

  // Health and Readiness probes
  app.use('/api/v1/health', healthRoutes);
  app.get('/api/v1/ready', readyHandler);

  // Feature Module Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/audit-logs', auditLogRoutes);
  app.use('/api/v1/resources', resourceRoutes);
  app.use('/api/v1/subscriptions', subscriptionRoutes);
  app.use('/api/v1/projects', projectRoutes);
  app.use('/api/v1/allocations', allocationRoutes);
  app.use('/api/v1/api-credits', apiCreditRoutes);
  app.use('/api/v1/expenses', expenseRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/notifications', notificationRoutes);

  // 404 Catch-all for undefined routes
  app.use('*', (req, res, next) => {
    next(new NotFoundError(`API endpoint ${req.method} ${req.originalUrl} not found`));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};

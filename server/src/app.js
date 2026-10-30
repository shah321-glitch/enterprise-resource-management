import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase } from './config/db.js';
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
import departmentRoutes from './modules/departments/department.routes.js';

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
  const isOriginPermitted = (origin) => {
    if (!origin) return true;
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return true;
    if (origin.endsWith('.netlify.app') || origin.endsWith('.vercel.app')) return true;
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
    return true; // Permit cross-origin requests for preview environments
  };

  const corsOptions = {
    origin: (origin, callback) => {
      callback(null, isOriginPermitted(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // Serverless database auto-connect assurance middleware
  app.use(async (req, res, next) => {
    if (req.path === '/favicon.ico') {
      return res.status(204).end();
    }
    // Skip synchronous DB auto-connection on root status and basic health probes for instant readiness
    if (req.path === '/' || req.path === '/health' || req.path === '/api/v1/health' || req.path === '/ready' || req.path === '/api/v1/ready') {
      return next();
    }
    if (mongoose.connection.readyState !== 1) {
      try {
        await connectDatabase();
      } catch (err) {
        logger.warn({ err: err.message }, 'Database auto-connection attempt failed in middleware');
      }
    }
    next();
  });

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

  // Swagger Documentation - Serverless Compatible CDN & JSON endpoints
  const swaggerDocPath = path.join(__dirname, 'docs', 'swagger.json');
  let swaggerDocument = null;
  try {
    if (fs.existsSync(swaggerDocPath)) {
      swaggerDocument = JSON.parse(fs.readFileSync(swaggerDocPath, 'utf8'));
    }
  } catch (err) {
    logger.warn('Failed to parse Swagger JSON specification', err);
  }

  app.get('/api/docs/swagger.json', (req, res) => {
    if (swaggerDocument) {
      return res.status(200).json(swaggerDocument);
    }
    res.status(404).json({ success: false, error: 'Swagger specification not found' });
  });

  app.get('/api/docs', (req, res) => {
    if (req.accepts('json') && !req.accepts('html')) {
      return res.status(200).json(swaggerDocument || { status: 'documentation available' });
    }
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ERSMS API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css" />
  <style>body { margin: 0; background: #fafafa; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/docs/swagger.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
      });
    };
  </script>
</body>
</html>`);
  });

  // Health and Readiness probes
  app.use(['/api/v1/health', '/health'], healthRoutes);
  app.get(['/api/v1/ready', '/ready'], readyHandler);

  // Gateway status endpoint for all root and base variations
  app.get(['/', '/api', '/api/v1', '/api/index', '/api/index.js', '/index.js'], (req, res) => {
    res.status(200).json({
      name: 'Enterprise Resource & Subscription Management System (ERSMS) API',
      version: '1.0.0',
      status: 'online',
      endpoints: {
        health: '/api/v1/health',
        ready: '/api/v1/ready',
        docs: '/api/docs',
        api: '/api/v1',
      },
    });
  });

  // Database availability guard for transactional API routes
  const dbGuard = async (req, res, next) => {
    if (req.path === '/health' || req.path === '/ready') {
      return next();
    }
    if (mongoose.connection.readyState !== 1) {
      try {
        await connectDatabase();
      } catch (err) {
        // Will be checked below
      }
    }
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Database connection is temporarily unavailable. Please verify database connectivity.',
        },
      });
    }
    next();
  };

  app.use(['/api/v1', '/api'], dbGuard);

  // Mount Feature Module Routes for both /api/v1, /api, and unprefixed aliases
  const mountModuleRoutes = (prefix = '') => {
    app.use(`${prefix}/auth`, authRoutes);
    app.use(`${prefix}/users`, userRoutes);
    app.use(`${prefix}/audit-logs`, auditLogRoutes);
    app.use(`${prefix}/resources`, resourceRoutes);
    app.use(`${prefix}/subscriptions`, subscriptionRoutes);
    app.use(`${prefix}/projects`, projectRoutes);
    app.use(`${prefix}/allocations`, allocationRoutes);
    app.use(`${prefix}/api-credits`, apiCreditRoutes);
    app.use(`${prefix}/expenses`, expenseRoutes);
    app.use(`${prefix}/reports`, reportRoutes);
    app.use(`${prefix}/notifications`, notificationRoutes);
    app.use(`${prefix}/departments`, departmentRoutes);
  };

  mountModuleRoutes('/api/v1');
  mountModuleRoutes('/api');
  mountModuleRoutes('');

  // 404 Catch-all for undefined routes
  app.use('*', (req, res, next) => {
    next(new NotFoundError(`API endpoint ${req.method} ${req.originalUrl} not found`));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};

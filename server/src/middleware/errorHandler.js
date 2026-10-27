import { AppError } from '../utils/errors.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  // If headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle known AppError instances
  if (err instanceof AppError) {
    logger.warn({
      err: {
        name: err.name,
        message: err.message,
        errorCode: err.errorCode,
        statusCode: err.statusCode,
        details: err.details,
      },
      path: req.originalUrl,
      method: req.method,
    }, 'Operational error handled');

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        details: err.details || undefined,
      },
    });
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Schema validation failed',
        details,
      },
    });
  }

  // Handle Mongoose Duplicate Key (E11000)
  if (err.code === 11000) {
    const duplicateField = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_KEY',
        message: `A record with this ${duplicateField} already exists`,
      },
    });
  }

  // Handle JWT token errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token signature',
      },
    });
  }

  // Unhandled / Internal Server Error
  logger.error({
    err: {
      message: err.message,
      stack: err.stack,
    },
    path: req.originalUrl,
    method: req.method,
  }, 'Unhandled internal server error');

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'production' ? 'An internal server error occurred' : err.message,
    },
  });
};

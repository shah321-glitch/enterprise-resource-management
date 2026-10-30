import { AppError } from '../utils/errors.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  // If headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle known AppError instances and any operational errors with 4xx status codes
  const statusCode = err.statusCode || err.status;
  const isOperational =
    err instanceof AppError ||
    (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) ||
    ['UnauthorizedError', 'ForbiddenError', 'NotFoundError', 'BadRequestError', 'ConflictError', 'ValidationError'].includes(err.name);

  if (isOperational) {
    const finalStatus = statusCode || (err.name === 'UnauthorizedError' ? 401 : err.name === 'ForbiddenError' ? 403 : err.name === 'NotFoundError' ? 404 : 400);
    const errorCode =
      err.errorCode ||
      err.code ||
      (finalStatus === 401
        ? 'UNAUTHORIZED'
        : finalStatus === 403
        ? 'FORBIDDEN'
        : finalStatus === 404
        ? 'NOT_FOUND'
        : 'BAD_REQUEST');

    logger.warn(
      {
        err: {
          name: err.name,
          message: err.message,
          errorCode,
          statusCode: finalStatus,
          details: err.details,
        },
        path: req.originalUrl,
        method: req.method,
      },
      'Operational error handled'
    );

    return res.status(finalStatus).json({
      success: false,
      error: {
        code: errorCode,
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

  // Handle Mongoose / MongoDB Connection or Timeout Errors
  if (
    err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.message?.includes('buffering timed out')
  ) {
    logger.error({ err: err.message, path: req.originalUrl }, 'Database connection error in request');
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database connection failed or timed out. Please check MongoDB Atlas network access and configuration.',
      },
    });
  }

  // Unhandled / Internal Server Error
  logger.error({
    err: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    path: req.originalUrl,
    method: req.method,
  }, 'Unhandled internal server error');

  return res.status(500).json({
    success: false,
    error: {
      code: err.errorCode || 'INTERNAL_ERROR',
      message: err.message || 'An internal server error occurred',
    },
  });
};


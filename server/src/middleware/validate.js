import { ValidationError } from '../utils/errors.js';

/**
 * Validates request payload against Zod schemas for body, query, and params.
 * @param {Object} schemas - { body?: ZodSchema, query?: ZodSchema, params?: ZodSchema }
 */
export const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    if (schemas.query) {
      req.query = schemas.query.parse(req.query);
    }
    if (schemas.params) {
      req.params = schemas.params.parse(req.params);
    }
    next();
  } catch (error) {
    if (error.errors) {
      const details = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      next(new ValidationError('Request validation failed', details));
    } else {
      next(error);
    }
  }
};

import crypto from 'crypto';

/**
 * Request ID middleware
 * Attaches a unique request ID to req.id and sets the X-Request-Id response header.
 */
export const requestId = (req, res, next) => {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
};


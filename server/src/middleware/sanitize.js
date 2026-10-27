/**
 * Sanitizes input keys to protect against MongoDB NoSQL injection.
 * Strips properties starting with '$' or containing '.'
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      continue; // drop injected mongo operator
    }
    clean[key] = sanitizeObject(value);
  }
  return clean;
};

export const mongoSanitize = (req, res, next) => {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
};

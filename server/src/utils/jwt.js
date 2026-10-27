import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

export const signAccessToken = (payload) => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  });
};

export const signRefreshToken = (payload) => {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

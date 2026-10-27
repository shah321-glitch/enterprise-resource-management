import { AuditLog } from './audit-log.model.js';
import { logger } from '../../config/logger.js';

/**
 * Strips sensitive keys from audit log metadata.
 */
const sanitizeDetails = (details) => {
  if (!details || typeof details !== 'object') return details;
  const clone = JSON.parse(JSON.stringify(details));
  const sensitiveKeys = ['password', 'passwordHash', 'token', 'refreshToken', 'secret', 'authorization', 'apiKey'];
  
  const scrub = (obj) => {
    for (const key of Object.keys(obj)) {
      if (sensitiveKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        scrub(obj[key]);
      }
    }
  };

  scrub(clone);
  return clone;
};

export const createAuditLog = async ({
  actor,
  action,
  targetType,
  targetId = null,
  targetName = null,
  outcome = 'SUCCESS',
  details = {},
  req = null,
}) => {
  try {
    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || null;
    const userAgent = req?.headers?.['user-agent'] || null;

    const logEntry = new AuditLog({
      actorId: actor?._id || actor?.userId || null,
      actorEmail: actor?.email || null,
      actorRole: actor?.role || null,
      action,
      targetType,
      targetId: targetId ? String(targetId) : null,
      targetName,
      outcome,
      details: sanitizeDetails(details),
      ipAddress,
      userAgent,
    });

    await logEntry.save();
    return logEntry;
  } catch (error) {
    logger.error({ err: error }, 'Failed to record audit log');
    return null;
  }
};

export const getAuditLogs = async ({
  page = 1,
  limit = 20,
  action = null,
  targetType = null,
  actorEmail = null,
  startDate = null,
  endDate = null,
}) => {
  const query = {};
  if (action) query.action = action;
  if (targetType) query.targetType = targetType;
  if (actorEmail) query.actorEmail = { $regex: actorEmail, $options: 'i' };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

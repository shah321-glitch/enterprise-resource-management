import * as auditService from './audit-log.service.js';

export const listAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, action, targetType, actorEmail, startDate, endDate } = req.query;
    const result = await auditService.getAuditLogs({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      action,
      targetType,
      actorEmail,
      startDate,
      endDate,
    });
    return res.status(200).json({
      success: true,
      data: result.logs,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};


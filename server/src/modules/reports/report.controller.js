import * as reportService from './report.service.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await reportService.getDashboardStats(req.query);
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const exportReportCSV = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { csv, filename } = await reportService.exportReportCSV(type, req.query);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

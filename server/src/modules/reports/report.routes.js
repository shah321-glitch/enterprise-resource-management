import express from 'express';
import * as reportController from './report.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/dashboard-stats', reportController.getDashboardStats);
router.get('/export/:type', reportController.exportReportCSV);

export default router;

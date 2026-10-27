import express from 'express';
import { listAuditLogs } from './audit-log.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/', listAuditLogs);

export default router;

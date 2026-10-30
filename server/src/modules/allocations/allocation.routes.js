import express from 'express';
import * as allocationController from './allocation.controller.js';
import { validate } from '../../middleware/validate.js';
import { createAllocationSchema, reassignAllocationSchema } from './allocation.schema.js';
import { authenticate } from '../../middleware/auth.js';
import { requireProjectManagerOrAdmin } from '../../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/', allocationController.listAllocations);
router.get('/reports/by-project', allocationController.getProjectWiseReport);
router.get('/history', allocationController.getAllocationHistory);
router.get('/:id', allocationController.getAllocationById);
router.post('/', requireProjectManagerOrAdmin, validate({ body: createAllocationSchema }), allocationController.createAllocation);
router.patch('/:id/release', requireProjectManagerOrAdmin, allocationController.releaseAllocation);
router.post('/:id/reassign', requireProjectManagerOrAdmin, validate({ body: reassignAllocationSchema }), allocationController.reassignAllocation);
router.delete('/:id', requireProjectManagerOrAdmin, allocationController.terminateAllocation);

export default router;


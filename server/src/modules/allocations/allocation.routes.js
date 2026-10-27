import express from 'express';
import * as allocationController from './allocation.controller.js';
import { validate } from '../../middleware/validate.js';
import { createAllocationSchema } from './allocation.schema.js';
import { authenticate } from '../../middleware/auth.js';
import { requireProjectManagerOrAdmin } from '../../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/', allocationController.listAllocations);
router.post('/', requireProjectManagerOrAdmin, validate({ body: createAllocationSchema }), allocationController.createAllocation);
router.delete('/:id', requireProjectManagerOrAdmin, allocationController.terminateAllocation);

export default router;

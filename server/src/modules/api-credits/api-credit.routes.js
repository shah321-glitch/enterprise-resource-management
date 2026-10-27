import express from 'express';
import * as apiCreditController from './api-credit.controller.js';
import { validate } from '../../middleware/validate.js';
import { createApiCreditSchema, updateApiCreditSchema, recordUsageSchema } from './api-credit.schema.js';
import { authenticate } from '../../middleware/auth.js';
import { requireProjectManagerOrAdmin } from '../../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/', apiCreditController.listCreditAccounts);
router.get('/:id', apiCreditController.getCreditAccountById);
router.post('/', requireProjectManagerOrAdmin, validate({ body: createApiCreditSchema }), apiCreditController.createCreditAccount);
router.put('/:id', requireProjectManagerOrAdmin, validate({ body: updateApiCreditSchema }), apiCreditController.updateCreditAccount);
router.post('/:id/usage', requireProjectManagerOrAdmin, validate({ body: recordUsageSchema }), apiCreditController.recordUsage);
router.post('/:id/sync', requireProjectManagerOrAdmin, apiCreditController.syncCreditAccount);

export default router;


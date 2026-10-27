import express from 'express';
import * as subscriptionController from './subscription.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  renewSubscriptionSchema,
  cancelSubscriptionSchema,
  subscriptionQuerySchema,
} from './subscription.schema.js';
import { authenticate } from '../../middleware/auth.js';
import { requireAdmin, requireProjectManagerOrAdmin } from '../../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/', validate({ query: subscriptionQuerySchema }), subscriptionController.listSubscriptions);
router.get('/renewals/upcoming', subscriptionController.getUpcomingRenewals);
router.get('/:id', subscriptionController.getSubscriptionById);
router.post('/', requireProjectManagerOrAdmin, validate({ body: createSubscriptionSchema }), subscriptionController.createSubscription);
router.put('/:id', requireProjectManagerOrAdmin, validate({ body: updateSubscriptionSchema }), subscriptionController.updateSubscription);
router.post('/:id/renew', requireProjectManagerOrAdmin, validate({ body: renewSubscriptionSchema }), subscriptionController.renewSubscription);
router.post('/:id/cancel', requireAdmin, validate({ body: cancelSubscriptionSchema }), subscriptionController.cancelSubscription);

export default router;


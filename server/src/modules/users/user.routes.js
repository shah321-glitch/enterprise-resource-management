import express from 'express';
import * as userController from './user.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireAdmin, requireSuperAdmin } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import {
  createUserSchema,
  updateUserSchema,
  setUserStatusSchema,
  userQuerySchema,
} from './user.schema.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requireAdmin, validate({ query: userQuerySchema }), userController.listUsers);
router.post('/', requireAdmin, validate({ body: createUserSchema }), userController.createUser);
router.get('/:id', userController.getUserById);
router.put('/:id', requireAdmin, validate({ body: updateUserSchema }), userController.updateUser);
router.patch(
  '/:id/status',
  requireSuperAdmin,
  validate({ body: setUserStatusSchema }),
  userController.setUserStatus
);
router.post(
  '/:id/revoke-sessions',
  requireAdmin,
  userController.revokeUserSessions
);

export default router;

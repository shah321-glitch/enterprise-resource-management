import express from 'express';
import * as userController from './user.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireAdmin, requireSuperAdmin } from '../../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requireAdmin, userController.listUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', requireAdmin, userController.updateUser);
router.patch('/:id/status', requireSuperAdmin, userController.setUserStatus);

export default router;

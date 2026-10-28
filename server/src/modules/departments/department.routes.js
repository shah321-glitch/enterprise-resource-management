import express from 'express';
import * as departmentController from './department.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { createDepartmentSchema, updateDepartmentSchema } from './department.schema.js';

const router = express.Router();

router.use(authenticate);

router.get('/', departmentController.listDepartments);
router.get('/:id', departmentController.getDepartmentById);
router.post('/', requireAdmin, validate({ body: createDepartmentSchema }), departmentController.createDepartment);
router.put('/:id', requireAdmin, validate({ body: updateDepartmentSchema }), departmentController.updateDepartment);

export default router;


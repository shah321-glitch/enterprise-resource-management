import express from 'express';
import * as projectController from './project.controller.js';
import { validate } from '../../middleware/validate.js';
import { createProjectSchema, updateProjectSchema } from './project.schema.js';
import { authenticate } from '../../middleware/auth.js';
import { requireProjectManagerOrAdmin } from '../../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/', projectController.listProjects);
router.get('/:id', projectController.getProjectById);
router.get('/:id/resources', projectController.getProjectResources);
router.post('/', requireProjectManagerOrAdmin, validate({ body: createProjectSchema }), projectController.createProject);
router.put('/:id', requireProjectManagerOrAdmin, validate({ body: updateProjectSchema }), projectController.updateProject);

export default router;


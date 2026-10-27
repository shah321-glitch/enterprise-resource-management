import express from 'express';
import * as resourceController from './resource.controller.js';
import { validate } from '../../middleware/validate.js';
import { createResourceSchema, updateResourceSchema, resourceQuerySchema } from './resource.schema.js';
import { authenticate } from '../../middleware/auth.js';
import { requireAdmin, requireProjectManagerOrAdmin } from '../../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/', validate({ query: resourceQuerySchema }), resourceController.listResources);
router.get('/categories/summary', resourceController.getCategorySummary);
router.get('/:id', resourceController.getResourceById);
router.post('/', requireProjectManagerOrAdmin, validate({ body: createResourceSchema }), resourceController.createResource);
router.put('/:id', requireProjectManagerOrAdmin, validate({ body: updateResourceSchema }), resourceController.updateResource);
router.patch('/:id/archive', requireAdmin, resourceController.archiveResource);
router.delete('/:id', requireAdmin, resourceController.deleteResource);

export default router;


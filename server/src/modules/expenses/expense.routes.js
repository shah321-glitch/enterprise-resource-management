import express from 'express';
import * as expenseController from './expense.controller.js';
import { validate } from '../../middleware/validate.js';
import { createExpenseSchema, updateExpenseSchema, expenseQuerySchema } from './expense.schema.js';
import { authenticate } from '../../middleware/auth.js';
import { requireAdmin, requireProjectManagerOrAdmin } from '../../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/', validate({ query: expenseQuerySchema }), expenseController.listExpenses);
router.get('/summaries', expenseController.getExpenseSummaries);
router.get('/forecasts', expenseController.getRecurringForecasts);
router.get('/:id', expenseController.getExpenseById);
router.post('/', requireProjectManagerOrAdmin, validate({ body: createExpenseSchema }), expenseController.createExpense);
router.put('/:id', requireAdmin, validate({ body: updateExpenseSchema }), expenseController.updateExpense);
router.delete('/:id', requireAdmin, expenseController.deleteExpense);

export default router;


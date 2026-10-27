import * as expenseService from './expense.service.js';

export const listExpenses = async (req, res, next) => {
  try {
    const result = await expenseService.listExpenses(req.query);
    res.status(200).json({
      success: true,
      data: result.expenses,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getExpenseById = async (req, res, next) => {
  try {
    const expense = await expenseService.getExpenseById(req.params.id);
    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.createExpense(req.body, req.user, req);
    res.status(201).json({
      success: true,
      data: expense,
      message: 'Expense recorded successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const updateExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.updateExpense(req.params.id, req.body, req.user, req);
    res.status(200).json({
      success: true,
      data: expense,
      message: 'Expense updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    const result = await expenseService.deleteExpense(req.params.id, req.user, req);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const getExpenseSummaries = async (req, res, next) => {
  try {
    const summaries = await expenseService.getExpenseSummaries(req.query);
    res.status(200).json({
      success: true,
      data: summaries,
    });
  } catch (error) {
    next(error);
  }
};

export const getRecurringForecasts = async (req, res, next) => {
  try {
    const months = req.query.months ? parseInt(req.query.months, 10) : 6;
    const forecasts = await expenseService.getRecurringForecasts(months);
    res.status(200).json({
      success: true,
      data: forecasts,
    });
  } catch (error) {
    next(error);
  }
};

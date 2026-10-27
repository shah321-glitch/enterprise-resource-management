import * as apiCreditService from './api-credit.service.js';

export const listCreditAccounts = async (req, res, next) => {
  try {
    const result = await apiCreditService.listCreditAccounts(req.query);
    res.status(200).json({
      success: true,
      data: result.accounts,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getCreditAccountById = async (req, res, next) => {
  try {
    const account = await apiCreditService.getCreditAccountById(req.params.id);
    res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

export const createCreditAccount = async (req, res, next) => {
  try {
    const account = await apiCreditService.createCreditAccount(req.body, req.user, req);
    res.status(201).json({
      success: true,
      data: account,
      message: 'API credit account registered successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const updateCreditAccount = async (req, res, next) => {
  try {
    const account = await apiCreditService.updateCreditAccount(req.params.id, req.body, req.user, req);
    res.status(200).json({
      success: true,
      data: account,
      message: 'API credit account updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const recordUsage = async (req, res, next) => {
  try {
    const account = await apiCreditService.recordUsage(req.params.id, req.body, req.user, req);
    res.status(200).json({
      success: true,
      data: account,
      message: 'API usage recorded',
    });
  } catch (error) {
    next(error);
  }
};

export const syncCreditAccount = async (req, res, next) => {
  try {
    const account = await apiCreditService.syncCreditAccount(req.params.id, req.user, req);
    res.status(200).json({
      success: true,
      data: account,
      message: 'API balance synchronized with provider',
    });
  } catch (error) {
    next(error);
  }
};


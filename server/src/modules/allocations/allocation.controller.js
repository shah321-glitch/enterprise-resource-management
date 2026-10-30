import * as allocationService from './allocation.service.js';

export const listAllocations = async (req, res, next) => {
  try {
    const result = await allocationService.listAllocations(req.query);
    res.status(200).json({
      success: true,
      data: result.allocations,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const createAllocation = async (req, res, next) => {
  try {
    const allocation = await allocationService.createAllocation(req.body, req.user, req);
    res.status(201).json({
      success: true,
      data: allocation,
      message: 'Resource allocated to project successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const terminateAllocation = async (req, res, next) => {
  try {
    const allocation = await allocationService.terminateAllocation(req.params.id, req.user, req);
    res.status(200).json({
      success: true,
      data: allocation,
      message: 'Resource allocation terminated',
    });
  } catch (error) {
    next(error);
  }
};

export const getAllocationById = async (req, res, next) => {
  try {
    const allocation = await allocationService.getAllocationById(req.params.id);
    res.status(200).json({
      success: true,
      data: allocation,
    });
  } catch (error) {
    next(error);
  }
};

export const releaseAllocation = async (req, res, next) => {
  try {
    const allocation = await allocationService.releaseAllocation(req.params.id, req.user, req);
    res.status(200).json({
      success: true,
      data: allocation,
      message: 'Resource allocation released successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const reassignAllocation = async (req, res, next) => {
  try {
    const newAllocation = await allocationService.reassignAllocation(
      req.params.id,
      req.body,
      req.user,
      req
    );
    res.status(200).json({
      success: true,
      data: newAllocation,
      message: 'Resource reassigned successfully with history preserved',
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectWiseReport = async (req, res, next) => {
  try {
    const report = await allocationService.getProjectWiseReport();
    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllocationHistory = async (req, res, next) => {
  try {
    const history = await allocationService.getAllocationHistory(req.query);
    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};


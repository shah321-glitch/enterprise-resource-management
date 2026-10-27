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


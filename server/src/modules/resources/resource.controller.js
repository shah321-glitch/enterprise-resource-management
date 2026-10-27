import * as resourceService from './resource.service.js';

export const listResources = async (req, res, next) => {
  try {
    const result = await resourceService.listResources(req.query);
    res.status(200).json({
      success: true,
      data: result.resources,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getResourceById = async (req, res, next) => {
  try {
    const resource = await resourceService.getResourceById(req.params.id);
    res.status(200).json({
      success: true,
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

export const createResource = async (req, res, next) => {
  try {
    const resource = await resourceService.createResource(req.body, req.user, req);
    res.status(201).json({
      success: true,
      data: resource,
      message: 'Resource created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const updateResource = async (req, res, next) => {
  try {
    const resource = await resourceService.updateResource(req.params.id, req.body, req.user, req);
    res.status(200).json({
      success: true,
      data: resource,
      message: 'Resource updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const archiveResource = async (req, res, next) => {
  try {
    const resource = await resourceService.archiveResource(req.params.id, req.user, req);
    res.status(200).json({
      success: true,
      data: resource,
      message: 'Resource archived successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteResource = async (req, res, next) => {
  try {
    const result = await resourceService.deleteResource(req.params.id, req.user, req);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategorySummary = async (req, res, next) => {
  try {
    const summary = await resourceService.getCategorySummary();
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};


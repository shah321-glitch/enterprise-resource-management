import * as departmentService from './department.service.js';

export const listDepartments = async (req, res, next) => {
  try {
    const departments = await departmentService.listDepartments(req.query);
    res.status(200).json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
};

export const getDepartmentById = async (req, res, next) => {
  try {
    const department = await departmentService.getDepartmentById(req.params.id);
    res.status(200).json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    const department = await departmentService.createDepartment(req.body, req.user, req);
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const department = await departmentService.updateDepartment(req.params.id, req.body, req.user, req);
    res.status(200).json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
};


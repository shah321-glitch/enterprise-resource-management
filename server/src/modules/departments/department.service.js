import { Department } from './department.model.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';
import { createAuditLog } from '../audit-logs/audit-log.service.js';

export const listDepartments = async ({ isActive = null }) => {
  const query = {};
  if (isActive !== null && isActive !== undefined) {
    query.isActive = isActive === 'true' || isActive === true;
  }
  return Department.find(query).populate('managerId', 'name email role').sort({ name: 1 });
};

export const getDepartmentById = async (id) => {
  const department = await Department.findById(id).populate('managerId', 'name email role');
  if (!department) {
    throw new NotFoundError('Department not found');
  }
  return department;
};

export const createDepartment = async (departmentData, actorUser, req = null) => {
  const existing = await Department.findOne({
    $or: [{ code: departmentData.code }, { name: departmentData.name }],
  });

  if (existing) {
    throw new ConflictError('A department with this name or code already exists');
  }

  const department = new Department(departmentData);
  await department.save();

  await createAuditLog({
    actor: actorUser,
    action: 'DEPARTMENT_CREATED',
    targetType: 'Department',
    targetId: department._id,
    targetName: department.name,
    details: { code: department.code, name: department.name },
    req,
  });

  return department;
};

export const updateDepartment = async (id, updateData, actorUser, req = null) => {
  const department = await Department.findById(id);
  if (!department) {
    throw new NotFoundError('Department not found');
  }

  if (updateData.name || updateData.code) {
    const existing = await Department.findOne({
      _id: { $ne: id },
      $or: [
        ...(updateData.code ? [{ code: updateData.code }] : []),
        ...(updateData.name ? [{ name: updateData.name }] : []),
      ],
    });

    if (existing) {
      throw new ConflictError('A department with this name or code already exists');
    }
  }

  const previousState = { name: department.name, code: department.code, isActive: department.isActive };
  Object.assign(department, updateData);
  await department.save();

  await createAuditLog({
    actor: actorUser,
    action: 'DEPARTMENT_UPDATED',
    targetType: 'Department',
    targetId: department._id,
    targetName: department.name,
    details: { previous: previousState, updated: updateData },
    req,
  });

  return department;
};


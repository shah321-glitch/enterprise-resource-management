import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { ROLES } from './rbac.js';
import { Project } from '../modules/projects/project.model.js';
import { Resource } from '../modules/resources/resource.model.js';
import { ResourceAllocation } from '../modules/allocations/allocation.model.js';

/**
 * Checks whether a user has permission to access or modify a given project.
 * Super Admins and Admins have global access.
 * Project Managers have access to projects they lead or are assigned to.
 * Employees have read-only access to projects they are allocated to.
 */
export const checkProjectAccess = async (user, project, isWrite = false) => {
  if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(user.role)) {
    return true;
  }

  // Project Managers can manage projects where they are designated as lead
  if (user.role === ROLES.PROJECT_MANAGER) {
    if (project.leadId && project.leadId.toString() === user._id.toString()) {
      return true;
    }
  }

  // For write operations, employees and non-lead PMs cannot modify
  if (isWrite) {
    return false;
  }

  // For read operations, check if the user is assigned in an active allocation
  const allocation = await ResourceAllocation.findOne({
    projectId: project._id,
    assignedEmployeeId: user._id,
    status: 'ACTIVE',
  });

  return Boolean(allocation);
};

/**
 * Checks whether a user has permission to access a given digital resource.
 * Super Admins and Admins have global management access.
 * Project Managers and Employees have access if they own the resource or are assigned to an allocation.
 */
export const checkResourceAccess = async (user, resource, isWrite = false) => {
  if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(user.role)) {
    return true;
  }

  // Owners can view and manage their assigned resource
  if (resource.ownerId && resource.ownerId.toString() === user._id.toString()) {
    return true;
  }

  // For write operations, only Admins or Owners can modify
  if (isWrite) {
    return false;
  }

  // For read operations, check if user is allocated to this resource
  const allocation = await ResourceAllocation.findOne({
    resourceId: resource._id,
    assignedEmployeeId: user._id,
    status: 'ACTIVE',
  });

  return Boolean(allocation);
};

/**
 * Middleware: Enforces project access policy on :id route parameter
 */
export const requireProjectAccess = (isWrite = false) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.id || req.params.projectId;
      if (!projectId) {
        return next();
      }

      const project = await Project.findById(projectId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const hasAccess = await checkProjectAccess(req.user, project, isWrite);
      if (!hasAccess) {
        throw new ForbiddenError(
          isWrite
            ? 'You do not have administrative permission to modify this project'
            : 'You do not have permission to access this project'
        );
      }

      req.project = project;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Enforces resource access policy on :id route parameter
 */
export const requireResourceAccess = (isWrite = false) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id || req.params.resourceId;
      if (!resourceId) {
        return next();
      }

      const resource = await Resource.findById(resourceId);
      if (!resource) {
        throw new NotFoundError('Resource not found');
      }

      const hasAccess = await checkResourceAccess(req.user, resource, isWrite);
      if (!hasAccess) {
        throw new ForbiddenError(
          isWrite
            ? 'You do not have administrative permission to modify this resource'
            : 'You do not have permission to view this resource'
        );
      }

      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};


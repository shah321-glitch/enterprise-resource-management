import { ResourceAllocation } from './allocation.model.js';
import { Resource } from '../resources/resource.model.js';
import { Project } from '../projects/project.model.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { createAuditLog } from '../audit-logs/audit-log.service.js';

export const calculateCost = (method, value, resourceCostInCents) => {
  switch (method) {
    case 'PERCENTAGE':
      return Math.round((resourceCostInCents * value) / 100);
    case 'FIXED_AMOUNT':
      return Math.round(value);
    case 'EQUAL':
      return resourceCostInCents; // Default base equal, normalized across projects
    case 'USAGE_BASED':
      return Math.round((resourceCostInCents * value) / 100);
    default:
      return resourceCostInCents;
  }
};

export const listAllocations = async (filters = {}) => {
  const { page = 1, limit = 20, projectId, resourceId, status } = filters;
  const query = {};

  if (projectId) query.projectId = projectId;
  if (resourceId) query.resourceId = resourceId;
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const [allocations, total] = await Promise.all([
    ResourceAllocation.find(query)
      .populate('resourceId', 'name provider category costInCents currency status')
      .populate('projectId', 'name code status')
      .populate('assignedEmployeeId', 'name email department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ResourceAllocation.countDocuments(query),
  ]);

  return {
    allocations,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const createAllocation = async (data, actorUser, req = null) => {
  const resource = await Resource.findById(data.resourceId);
  if (!resource || resource.isArchived) {
    throw new NotFoundError('Resource not found or archived');
  }

  const project = await Project.findById(data.projectId);
  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Check if active allocation already exists for this resource & project
  const existingActive = await ResourceAllocation.findOne({
    resourceId: data.resourceId,
    projectId: data.projectId,
    status: 'ACTIVE',
  });
  if (existingActive) {
    throw new BadRequestError('This resource is already actively allocated to this project');
  }

  // Validate percentage total across projects
  if (data.allocationMethod === 'PERCENTAGE') {
    const activeAllocations = await ResourceAllocation.find({
      resourceId: data.resourceId,
      status: 'ACTIVE',
      allocationMethod: 'PERCENTAGE',
    });

    const currentTotalPercentage = activeAllocations.reduce((sum, a) => sum + a.allocationValue, 0);
    if (currentTotalPercentage + data.allocationValue > 100) {
      throw new BadRequestError(
        `Total allocation percentage cannot exceed 100%. Currently allocated: ${currentTotalPercentage}%, requested: ${data.allocationValue}%`
      );
    }
  }

  const calculatedCostInCents = calculateCost(
    data.allocationMethod,
    data.allocationValue,
    resource.costInCents
  );

  const allocation = new ResourceAllocation({
    ...data,
    calculatedCostInCents,
    currency: resource.currency,
    startDate: data.startDate || new Date(),
  });

  await allocation.save();

  await createAuditLog({
    actor: actorUser,
    action: 'RESOURCE_ALLOCATED',
    targetType: 'ResourceAllocation',
    targetId: allocation._id,
    targetName: `${resource.name} -> ${project.name}`,
    details: {
      resourceId: resource._id,
      projectId: project._id,
      method: data.allocationMethod,
      value: data.allocationValue,
      calculatedCostInCents,
    },
    req,
  });

  return allocation;
};

export const terminateAllocation = async (id, actorUser, req = null) => {
  const allocation = await ResourceAllocation.findById(id);
  if (!allocation) {
    throw new NotFoundError('Allocation not found');
  }

  allocation.status = 'TERMINATED';
  allocation.endDate = new Date();
  await allocation.save();

  await createAuditLog({
    actor: actorUser,
    action: 'RESOURCE_DEALLOCATED',
    targetType: 'ResourceAllocation',
    targetId: allocation._id,
    details: { status: 'TERMINATED', endDate: allocation.endDate },
    req,
  });

  return allocation;
};


import { ResourceAllocation } from './allocation.model.js';
import { Resource } from '../resources/resource.model.js';
import { Project } from '../projects/project.model.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { createAuditLog } from '../audit-logs/audit-log.service.js';

export const calculateCost = (method, value, resourceCostInCents, activeEqualCount = 1) => {
  switch (method) {
    case 'PERCENTAGE':
      return Math.round((resourceCostInCents * Math.min(100, Math.max(0, value))) / 100);
    case 'FIXED_AMOUNT':
      return Math.min(resourceCostInCents, Math.round(Math.max(0, value)));
    case 'EQUAL':
      return Math.round(resourceCostInCents / Math.max(1, activeEqualCount));
    case 'USAGE_BASED':
      return Math.round((resourceCostInCents * Math.min(100, Math.max(0, value))) / 100);
    default:
      return resourceCostInCents;
  }
};

export const listAllocations = async (filters = {}) => {
  const {
    page = 1,
    limit = 20,
    projectId,
    resourceId,
    status,
    assignedEmployeeId,
    search,
  } = filters;

  const query = {};

  if (projectId) query.projectId = projectId;
  if (resourceId) query.resourceId = resourceId;
  if (status) query.status = status;
  if (assignedEmployeeId) query.assignedEmployeeId = assignedEmployeeId;

  const skip = (page - 1) * limit;

  const [allocations, total] = await Promise.all([
    ResourceAllocation.find(query)
      .populate('resourceId', 'name provider category costInCents currency status isArchived')
      .populate('projectId', 'name code status department budgetInCents')
      .populate('assignedEmployeeId', 'name email department role')
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

export const getAllocationById = async (id) => {
  const allocation = await ResourceAllocation.findById(id)
    .populate('resourceId', 'name provider category costInCents currency status notes')
    .populate('projectId', 'name code status department budgetInCents')
    .populate('assignedEmployeeId', 'name email department role')
    .populate('reassignedToId')
    .populate('reassignedFromId')
    .lean();

  if (!allocation) {
    throw new NotFoundError('Allocation not found');
  }
  return allocation;
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

  // Validate fixed amount does not exceed resource cost
  if (data.allocationMethod === 'FIXED_AMOUNT') {
    if (data.allocationValue > resource.costInCents) {
      throw new BadRequestError(
        `Fixed allocation amount cannot exceed total resource cost of ${resource.costInCents / 100} ${resource.currency}`
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
    startDate: data.startDate ? new Date(data.startDate) : new Date(),
    endDate: data.endDate ? new Date(data.endDate) : undefined,
    assignedEmployeeId: data.assignedEmployeeId || undefined,
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

export const releaseAllocation = async (id, actorUser, req = null) => {
  const allocation = await ResourceAllocation.findById(id);
  if (!allocation) {
    throw new NotFoundError('Allocation not found');
  }

  if (allocation.status !== 'ACTIVE') {
    throw new BadRequestError('Only active allocations can be released');
  }

  const now = new Date();
  allocation.status = 'TERMINATED';
  allocation.endDate = now;
  allocation.releasedAt = now;
  await allocation.save();

  await createAuditLog({
    actor: actorUser,
    action: 'RESOURCE_RELEASED',
    targetType: 'ResourceAllocation',
    targetId: allocation._id,
    details: { status: 'TERMINATED', releasedAt: now },
    req,
  });

  return allocation;
};

export const reassignAllocation = async (id, reassignData, actorUser, req = null) => {
  const oldAllocation = await ResourceAllocation.findById(id);
  if (!oldAllocation) {
    throw new NotFoundError('Original allocation not found');
  }

  if (oldAllocation.status !== 'ACTIVE') {
    throw new BadRequestError('Only active allocations can be reassigned');
  }

  // 1. Terminate old allocation
  const now = new Date();
  oldAllocation.status = 'TERMINATED';
  oldAllocation.endDate = now;
  oldAllocation.releasedAt = now;

  // 2. Prepare new allocation
  const newAllocationData = {
    resourceId: oldAllocation.resourceId,
    projectId: reassignData.newProjectId,
    assignedEmployeeId: reassignData.newAssignedEmployeeId || oldAllocation.assignedEmployeeId,
    allocationMethod: reassignData.allocationMethod || oldAllocation.allocationMethod,
    allocationValue: reassignData.allocationValue ?? oldAllocation.allocationValue,
    notes: reassignData.notes || `Reassigned from allocation #${oldAllocation._id}`,
    startDate: now,
    reassignedFromId: oldAllocation._id,
  };

  const newAllocation = await createAllocation(newAllocationData, actorUser, req);

  // 3. Link back old to new
  oldAllocation.reassignedToId = newAllocation._id;
  await oldAllocation.save();

  await createAuditLog({
    actor: actorUser,
    action: 'RESOURCE_REASSIGNED',
    targetType: 'ResourceAllocation',
    targetId: newAllocation._id,
    details: {
      fromAllocationId: oldAllocation._id,
      toAllocationId: newAllocation._id,
      newProjectId: reassignData.newProjectId,
    },
    req,
  });

  return newAllocation;
};

export const terminateAllocation = releaseAllocation;

export const getProjectWiseReport = async () => {
  const projects = await Project.find().lean();
  const activeAllocations = await ResourceAllocation.find({ status: 'ACTIVE' })
    .populate('resourceId', 'name provider category costInCents currency status')
    .populate('assignedEmployeeId', 'name email department')
    .lean();

  const report = projects.map((p) => {
    const projectAllocations = activeAllocations.filter(
      (a) => a.projectId.toString() === p._id.toString()
    );

    const totalAllocatedCostInCents = projectAllocations.reduce(
      (sum, a) => sum + (a.calculatedCostInCents || 0),
      0
    );

    return {
      projectId: p._id,
      projectName: p.name,
      projectCode: p.code,
      department: p.department,
      status: p.status,
      budgetInCents: p.budgetInCents || 0,
      currency: p.currency || 'USD',
      allocatedCostInCents: totalAllocatedCostInCents,
      remainingBudgetCents: Math.max(0, (p.budgetInCents || 0) - totalAllocatedCostInCents),
      activeResourcesCount: projectAllocations.length,
      allocations: projectAllocations,
    };
  });

  return report;
};

export const getAllocationHistory = async (filters = {}) => {
  const query = {};
  if (filters.resourceId) query.resourceId = filters.resourceId;
  if (filters.projectId) query.projectId = filters.projectId;

  return ResourceAllocation.find(query)
    .populate('resourceId', 'name provider category')
    .populate('projectId', 'name code')
    .populate('assignedEmployeeId', 'name email department')
    .populate('reassignedToId', 'projectId assignedEmployeeId createdAt')
    .populate('reassignedFromId', 'projectId assignedEmployeeId createdAt')
    .sort({ createdAt: -1 })
    .lean();
};


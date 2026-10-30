import { Resource } from './resource.model.js';
import { ResourceAllocation } from '../allocations/allocation.model.js';
import { NotFoundError } from '../../utils/errors.js';
import { createAuditLog } from '../audit-logs/audit-log.service.js';

export const listResources = async (filters = {}) => {
  const {
    page = 1,
    limit = 20,
    search,
    provider,
    category,
    status,
    department,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = false,
  } = filters;

  const query = {};

  if (!includeArchived) {
    query.isArchived = false;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { provider: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  if (provider) query.provider = provider;
  if (category) query.category = category;
  if (status) query.status = status;
  if (department) query.department = department;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [resources, total] = await Promise.all([
    Resource.find(query)
      .populate('ownerId', 'name email department')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Resource.countDocuments(query),
  ]);

  return {
    resources,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getResourceById = async (id) => {
  const resource = await Resource.findById(id)
    .populate('ownerId', 'name email department role')
    .populate('subscriptionId', 'name provider billingCycle costInCents status')
    .lean();
  if (!resource) {
    throw new NotFoundError('Resource not found');
  }

  // Fetch active allocations across projects for this resource
  const allocations = await ResourceAllocation.find({ resourceId: id })
    .populate('projectId', 'name code status department')
    .populate('assignedEmployeeId', 'name email department role')
    .sort({ status: 1, createdAt: -1 })
    .lean();

  const activeAllocations = allocations.filter((a) => a.status === 'ACTIVE');
  const totalAllocatedPercentage = activeAllocations
    .filter((a) => a.allocationMethod === 'PERCENTAGE')
    .reduce((sum, a) => sum + (a.allocationValue || 0), 0);

  const totalAllocatedCostInCents = activeAllocations.reduce(
    (sum, a) => sum + (a.calculatedCostInCents || 0),
    0
  );

  return {
    ...resource,
    allocations,
    activeAllocationsCount: activeAllocations.length,
    totalAllocatedPercentage,
    totalAllocatedCostInCents,
    unallocatedCostInCents: Math.max(0, resource.costInCents - totalAllocatedCostInCents),
  };
};

export const createResource = async (data, actorUser, req = null) => {
  const resource = new Resource({
    ...data,
    ownerId: data.ownerId || actorUser?._id,
  });

  await resource.save();

  await createAuditLog({
    actor: actorUser,
    action: 'RESOURCE_CREATED',
    targetType: 'Resource',
    targetId: resource._id,
    targetName: resource.name,
    details: { provider: resource.provider, category: resource.category, costInCents: resource.costInCents },
    req,
  });

  return resource;
};

export const updateResource = async (id, data, actorUser, req = null) => {
  const resource = await Resource.findById(id);
  if (!resource) {
    throw new NotFoundError('Resource not found');
  }

  const previous = {
    name: resource.name,
    costInCents: resource.costInCents,
    status: resource.status,
  };

  Object.assign(resource, data);
  await resource.save();

  await createAuditLog({
    actor: actorUser,
    action: 'RESOURCE_UPDATED',
    targetType: 'Resource',
    targetId: resource._id,
    targetName: resource.name,
    details: { previous, updated: data },
    req,
  });

  return resource;
};

export const archiveResource = async (id, actorUser, req = null) => {
  const resource = await Resource.findById(id);
  if (!resource) {
    throw new NotFoundError('Resource not found');
  }

  resource.isArchived = true;
  resource.status = 'ARCHIVED';
  await resource.save();

  await createAuditLog({
    actor: actorUser,
    action: 'RESOURCE_ARCHIVED',
    targetType: 'Resource',
    targetId: resource._id,
    targetName: resource.name,
    details: { isArchived: true },
    req,
  });

  return resource;
};

export const deleteResource = async (id, actorUser, req = null) => {
  const resource = await Resource.findById(id);
  if (!resource) {
    throw new NotFoundError('Resource not found');
  }

  await Resource.findByIdAndDelete(id);

  await createAuditLog({
    actor: actorUser,
    action: 'RESOURCE_DELETED',
    targetType: 'Resource',
    targetId: id,
    targetName: resource.name,
    details: { deleted: true },
    req,
  });

  return { message: 'Resource permanently deleted' };
};

export const getCategorySummary = async () => {
  return Resource.aggregate([
    { $match: { isArchived: false } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalCostInCents: { $sum: '$costInCents' },
      },
    },
    { $sort: { totalCostInCents: -1 } },
  ]);
};


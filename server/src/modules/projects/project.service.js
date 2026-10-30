import { Project } from './project.model.js';
import { ResourceAllocation } from '../allocations/allocation.model.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';
import { createAuditLog } from '../audit-logs/audit-log.service.js';

export const listProjects = async (filters = {}) => {
  const { page = 1, limit = 20, search, status, department } = filters;
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }
  if (status) query.status = status;
  if (department) query.department = department;

  const skip = (page - 1) * limit;

  const [projects, total] = await Promise.all([
    Project.find(query)
      .populate('leadId', 'name email department role')
      .populate('projectManagerId', 'name email department role')
      .populate('teamMemberIds', 'name email department role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Project.countDocuments(query),
  ]);

  // Aggregate active allocations and total allocated cost per project
  const projectIds = projects.map((p) => p._id);
  const costAggregates = await ResourceAllocation.aggregate([
    { $match: { projectId: { $in: projectIds }, status: 'ACTIVE' } },
    {
      $group: {
        _id: '$projectId',
        allocatedCostInCents: { $sum: '$calculatedCostInCents' },
        activeResourcesCount: { $sum: 1 },
      },
    },
  ]);

  const costMap = new Map();
  costAggregates.forEach((item) => {
    costMap.set(item._id.toString(), item);
  });

  const enrichedProjects = projects.map((p) => {
    const stats = costMap.get(p._id.toString()) || { allocatedCostInCents: 0, activeResourcesCount: 0 };
    return {
      ...p,
      allocatedCostInCents: stats.allocatedCostInCents,
      activeResourcesCount: stats.activeResourcesCount,
    };
  });

  return {
    projects: enrichedProjects,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getProjectById = async (id) => {
  const project = await Project.findById(id)
    .populate('leadId', 'name email department role')
    .populate('projectManagerId', 'name email department role')
    .populate('teamMemberIds', 'name email department role')
    .lean();
  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Fetch active and past allocations for this project
  const allocations = await ResourceAllocation.find({ projectId: id })
    .populate('resourceId', 'name provider category costInCents currency status')
    .populate('assignedEmployeeId', 'name email department role')
    .sort({ createdAt: -1 })
    .lean();

  const totalAllocatedCostInCents = allocations
    .filter((a) => a.status === 'ACTIVE')
    .reduce((sum, a) => sum + (a.calculatedCostInCents || 0), 0);

  return {
    ...project,
    manager: project.projectManagerId || project.leadId,
    allocations,
    totalAllocatedCostInCents,
  };
};

export const getProjectResources = async (projectId) => {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new NotFoundError('Project not found');
  }

  const allocations = await ResourceAllocation.find({ projectId })
    .populate('resourceId', 'name provider category resourceType costInCents currency status notes')
    .populate('assignedEmployeeId', 'name email department role')
    .sort({ status: 1, createdAt: -1 })
    .lean();

  return {
    projectId,
    projectName: project.name,
    resources: allocations.map((a) => ({
      allocationId: a._id,
      resource: a.resourceId,
      assignedEmployee: a.assignedEmployeeId,
      allocationMethod: a.allocationMethod,
      allocationValue: a.allocationValue,
      calculatedCostInCents: a.calculatedCostInCents,
      currency: a.currency,
      status: a.status,
      startDate: a.startDate,
      endDate: a.endDate,
      usageLimit: a.usageLimit,
      notes: a.notes,
    })),
  };
};

export const createProject = async (data, actorUser, req = null) => {
  const existingCode = await Project.findOne({ code: data.code.toUpperCase() });
  if (existingCode) {
    throw new ConflictError(`Project code '${data.code}' is already taken`);
  }

  const managerId = data.projectManagerId || data.leadId || actorUser?._id;

  const project = new Project({
    ...data,
    code: data.code.toUpperCase(),
    leadId: managerId,
    projectManagerId: managerId,
  });

  await project.save();

  await createAuditLog({
    actor: actorUser,
    action: 'PROJECT_CREATED',
    targetType: 'Project',
    targetId: project._id,
    targetName: project.name,
    details: { code: project.code, budgetInCents: project.budgetInCents },
    req,
  });

  return project;
};

export const updateProject = async (id, data, actorUser, req = null) => {
  const project = await Project.findById(id);
  if (!project) {
    throw new NotFoundError('Project not found');
  }

  if (data.code && data.code.toUpperCase() !== project.code) {
    const existing = await Project.findOne({ code: data.code.toUpperCase() });
    if (existing) {
      throw new ConflictError(`Project code '${data.code}' is already in use`);
    }
    data.code = data.code.toUpperCase();
  }

  if (data.projectManagerId) {
    data.leadId = data.projectManagerId;
  } else if (data.leadId) {
    data.projectManagerId = data.leadId;
  }

  Object.assign(project, data);
  await project.save();

  await createAuditLog({
    actor: actorUser,
    action: 'PROJECT_UPDATED',
    targetType: 'Project',
    targetId: project._id,
    targetName: project.name,
    details: data,
    req,
  });

  return project;
};


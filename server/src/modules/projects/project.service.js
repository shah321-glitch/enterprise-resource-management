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
      .populate('leadId', 'name email department')
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
  const project = await Project.findById(id).populate('leadId', 'name email department').lean();
  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Fetch active and past allocations for this project
  const allocations = await ResourceAllocation.find({ projectId: id })
    .populate('resourceId', 'name provider category costInCents status')
    .populate('assignedEmployeeId', 'name email department')
    .sort({ createdAt: -1 })
    .lean();

  const totalAllocatedCostInCents = allocations
    .filter((a) => a.status === 'ACTIVE')
    .reduce((sum, a) => sum + (a.calculatedCostInCents || 0), 0);

  return {
    ...project,
    allocations,
    totalAllocatedCostInCents,
  };
};

export const createProject = async (data, actorUser, req = null) => {
  const existingCode = await Project.findOne({ code: data.code.toUpperCase() });
  if (existingCode) {
    throw new ConflictError(`Project code '${data.code}' is already taken`);
  }

  const project = new Project({
    ...data,
    code: data.code.toUpperCase(),
    leadId: data.leadId || actorUser?._id,
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


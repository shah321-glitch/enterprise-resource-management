import { User } from './user.model.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { createAuditLog } from '../audit-logs/audit-log.service.js';

export const listUsers = async ({ page = 1, limit = 20, search = '', role = '', department = '', isActive = null }) => {
  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (role) query.role = role;
  if (department) query.department = department;
  if (isActive !== null && isActive !== undefined && isActive !== '') {
    query.isActive = isActive === 'true' || isActive === true;
  }

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);

  return {
    users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
};

export const updateUser = async (id, updateData, actorUser, req = null) => {
  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const allowedUpdates = ['name', 'department'];
  // Only Super Admin can change roles
  if (updateData.role && actorUser.role === 'SUPER_ADMIN') {
    allowedUpdates.push('role');
  }

  const previousState = { name: user.name, department: user.department, role: user.role };

  for (const field of allowedUpdates) {
    if (updateData[field] !== undefined) {
      user[field] = updateData[field];
    }
  }

  await user.save();

  await createAuditLog({
    actor: actorUser,
    action: 'USER_UPDATED',
    targetType: 'User',
    targetId: user._id,
    targetName: user.name,
    details: { previous: previousState, updated: { name: user.name, department: user.department, role: user.role } },
    req,
  });

  return user;
};

export const setUserStatus = async (id, isActive, actorUser, req = null) => {
  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Prevent super admin from deactivating themselves
  if (actorUser._id.toString() === id.toString() && !isActive) {
    throw new BadRequestError('You cannot deactivate your own account');
  }

  user.isActive = Boolean(isActive);
  if (!isActive) {
    // Clear all refresh tokens to terminate active sessions immediately
    user.refreshTokens = [];
  }
  await user.save();

  await createAuditLog({
    actor: actorUser,
    action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    targetType: 'User',
    targetId: user._id,
    targetName: user.name,
    details: { isActive: user.isActive },
    req,
  });

  return user;
};

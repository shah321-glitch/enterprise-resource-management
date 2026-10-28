import { User } from './user.model.js';
import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from '../../utils/errors.js';
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

export const createUser = async ({ name, email, password, role, department, isActive = true }, actorUser, req = null) => {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new ConflictError('A user with this email address already exists');
  }

  // Only SUPER_ADMIN can create another SUPER_ADMIN
  if (role === 'SUPER_ADMIN' && actorUser?.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('Only Super Administrators can create accounts with the Super Admin role');
  }

  const passwordHash = await User.hashPassword(password);
  const user = new User({
    name,
    email,
    passwordHash,
    role: role || 'EMPLOYEE',
    department: department || 'General',
    isActive: Boolean(isActive),
  });

  await user.save();

  await createAuditLog({
    actor: actorUser,
    action: 'USER_CREATED',
    targetType: 'User',
    targetId: user._id,
    targetName: user.name,
    details: { email: user.email, role: user.role, department: user.department },
    req,
  });

  return user;
};

export const updateUser = async (id, updateData, actorUser, req = null) => {
  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Role elevation / modification security check
  if (updateData.role !== undefined && updateData.role !== user.role) {
    if (actorUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Only Super Administrators can modify user roles. Users cannot elevate their own roles.');
    }

    // Prevent last active super admin from demoting themselves
    if (actorUser._id.toString() === id.toString() && updateData.role !== 'SUPER_ADMIN') {
      const activeSuperAdmins = await User.countDocuments({ role: 'SUPER_ADMIN', isActive: true });
      if (activeSuperAdmins <= 1) {
        throw new BadRequestError('Cannot demote the sole active Super Administrator');
      }
    }
  }

  const allowedUpdates = ['name', 'department'];
  if (actorUser.role === 'SUPER_ADMIN') {
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
    user.revokeAllSessions();
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

export const revokeUserSessions = async (id, actorUser, req = null) => {
  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  user.revokeAllSessions();
  await user.save();

  await createAuditLog({
    actor: actorUser,
    action: 'USER_SESSIONS_REVOKED_BY_ADMIN',
    targetType: 'User',
    targetId: user._id,
    targetName: user.name,
    details: { targetEmail: user.email },
    req,
  });

  return {
    message: `All active sessions for ${user.email} have been revoked`,
  };
};

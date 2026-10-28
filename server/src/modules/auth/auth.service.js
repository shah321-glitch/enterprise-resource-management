import crypto from 'crypto';
import { User } from '../users/user.model.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from '../../utils/jwt.js';
import { ConflictError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError } from '../../utils/errors.js';
import { createAuditLog } from '../audit-logs/audit-log.service.js';
import { env } from '../../config/env.js';

export const register = async ({ name, email, password, role, department }, actorUser = null, req = null) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError('A user with this email address already exists');
  }

  // Enterprise onboarding policy check:
  // Public registration is disabled unless:
  // 1. Initial bootstrap: zero users exist in the database (provisions first SUPER_ADMIN)
  // 2. Explicitly allowed in development/testing via ALLOW_PUBLIC_REGISTRATION=true
  // 3. Provisioned by an authenticated Admin or Super Admin
  const totalUsers = await User.countDocuments();
  const isInitialBootstrap = totalUsers === 0;
  const isActorAdmin = actorUser && ['SUPER_ADMIN', 'ADMIN'].includes(actorUser.role);
  const isExplicitlyAllowed = process.env.ALLOW_PUBLIC_REGISTRATION === 'true';

  if (!isInitialBootstrap && !isActorAdmin && !isExplicitlyAllowed) {
    throw new ForbiddenError('Public registration is disabled. Contact your enterprise system administrator for account provisioning.');
  }

  // Initial user is automatically promoted to SUPER_ADMIN
  let assignedRole = role || 'EMPLOYEE';
  if (isInitialBootstrap) {
    assignedRole = 'SUPER_ADMIN';
  } else if (!isActorAdmin || actorUser.role !== 'SUPER_ADMIN') {
    // Non-super admins cannot create Super Admin accounts
    if (assignedRole === 'SUPER_ADMIN') {
      assignedRole = 'EMPLOYEE';
    }
  }

  const passwordHash = await User.hashPassword(password);
  const user = new User({
    name,
    email,
    passwordHash,
    role: assignedRole,
    department: department || 'General',
    isActive: true,
  });

  await user.save();

  await createAuditLog({
    actor: actorUser ? { _id: actorUser._id, email: actorUser.email, role: actorUser.role } : { _id: user._id, email: user.email, role: user.role },
    action: isInitialBootstrap ? 'INITIAL_SUPERADMIN_BOOTSTRAP' : 'USER_REGISTERED',
    targetType: 'User',
    targetId: user._id,
    targetName: user.name,
    details: { email: user.email, role: user.role, department: user.department, isInitialBootstrap },
    req,
  });

  return user;
};

export const login = async ({ email, password, ipAddress, userAgent }, req = null) => {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    await createAuditLog({
      actor: null,
      action: 'LOGIN_FAILED',
      targetType: 'User',
      outcome: 'FAILURE',
      details: { email, reason: 'User not found' },
      req,
    });
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.isActive) {
    await createAuditLog({
      actor: { _id: user._id, email: user.email, role: user.role },
      action: 'LOGIN_BLOCKED',
      targetType: 'User',
      outcome: 'FAILURE',
      details: { email, reason: 'Account deactivated' },
      req,
    });
    throw new ForbiddenError('Account is deactivated. Contact an administrator.');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    await createAuditLog({
      actor: { _id: user._id, email: user.email, role: user.role },
      action: 'LOGIN_FAILED',
      targetType: 'User',
      outcome: 'FAILURE',
      details: { email, reason: 'Incorrect password' },
      req,
    });
    throw new UnauthorizedError('Invalid email or password');
  }

  // Generate tokens
  const payload = { userId: user._id.toString(), role: user.role, email: user.email };
  const accessToken = signAccessToken(payload);
  const rawRefreshToken = signRefreshToken(payload);
  const tokenHash = hashToken(rawRefreshToken);

  // Expire in 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Limit stored refresh tokens per user to 10
  if (user.refreshTokens.length >= 10) {
    user.refreshTokens.shift();
  }

  user.refreshTokens.push({
    tokenHash,
    expiresAt,
    ipAddress,
    userAgent,
  });

  await user.save();

  await createAuditLog({
    actor: { _id: user._id, email: user.email, role: user.role },
    action: 'LOGIN_SUCCESS',
    targetType: 'User',
    targetId: user._id,
    targetName: user.name,
    details: { email: user.email, role: user.role },
    req,
  });

  return {
    user: user.toJSON(),
    accessToken,
    refreshToken: rawRefreshToken,
  };
};

export const rotateRefreshToken = async (oldRefreshToken, { ipAddress, userAgent }, req = null) => {
  if (!oldRefreshToken) {
    throw new UnauthorizedError('No refresh token provided');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(oldRefreshToken);
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive) {
    throw new UnauthorizedError('User account not found or inactive');
  }

  const presentedHash = hashToken(oldRefreshToken);
  const tokenIndex = user.refreshTokens.findIndex((t) => t.tokenHash === presentedHash);

  // Reuse detection: If presented refresh token was already revoked/rotated, potential breach!
  if (tokenIndex === -1) {
    // Invalidate ALL tokens for this user as safety measure
    user.refreshTokens = [];
    await user.save();

    await createAuditLog({
      actor: { _id: user._id, email: user.email, role: user.role },
      action: 'REFRESH_TOKEN_REUSE_DETECTED',
      targetType: 'User',
      targetId: user._id,
      outcome: 'FAILURE',
      details: { warning: 'All sessions revoked due to refresh token reuse attempt' },
      req,
    });

    throw new UnauthorizedError('Security alert: Refresh token reuse detected. Please log in again.');
  }

  // Remove old token
  user.refreshTokens.splice(tokenIndex, 1);

  // Generate new pair
  const payload = { userId: user._id.toString(), role: user.role, email: user.email };
  const newAccessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);
  const newTokenHash = hashToken(newRefreshToken);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  user.refreshTokens.push({
    tokenHash: newTokenHash,
    expiresAt,
    ipAddress,
    userAgent,
  });

  await user.save();

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: user.toJSON(),
  };
};

export const logout = async (userId, refreshToken, req = null) => {
  const user = await User.findById(userId);
  if (user) {
    if (refreshToken) {
      const presentedHash = hashToken(refreshToken);
      user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== presentedHash);
    } else {
      user.refreshTokens = [];
    }
    await user.save();

    await createAuditLog({
      actor: { _id: user._id, email: user.email, role: user.role },
      action: 'LOGOUT',
      targetType: 'User',
      targetId: user._id,
      targetName: user.name,
      details: { email: user.email },
      req,
    });
  }
};

export const requestPasswordReset = async (email, req = null) => {
  const user = await User.findOne({ email });
  if (!user || !user.isActive) {
    // To prevent email enumeration attacks, always return the same generic message
    return {
      message: 'If an account exists with that email address, a password reset link has been dispatched.',
    };
  }

  const rawToken = user.createPasswordResetToken();
  await user.save();

  await createAuditLog({
    actor: { _id: user._id, email: user.email, role: user.role },
    action: 'PASSWORD_RESET_REQUESTED',
    targetType: 'User',
    targetId: user._id,
    targetName: user.name,
    details: { email: user.email },
    req,
  });

  return {
    message: 'If an account exists with that email address, a password reset link has been dispatched.',
    // Return token in test/development environments to allow verification flows
    resetToken: process.env.NODE_ENV !== 'production' ? rawToken : undefined,
  };
};

export const resetPassword = async ({ token, newPassword }, req = null) => {
  if (!token) {
    throw new BadRequestError('Password reset token is required');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetTokenHash: hashedToken,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpiresAt');

  if (!user) {
    await createAuditLog({
      actor: null,
      action: 'PASSWORD_RESET_FAILED',
      targetType: 'User',
      outcome: 'FAILURE',
      details: { reason: 'Invalid or expired token' },
      req,
    });
    throw new BadRequestError('Password reset token is invalid or has expired');
  }

  user.passwordHash = await User.hashPassword(newPassword);
  user.clearPasswordResetToken();
  user.revokeAllSessions(); // Invalidate all active sessions for security
  await user.save();

  await createAuditLog({
    actor: { _id: user._id, email: user.email, role: user.role },
    action: 'PASSWORD_RESET_SUCCESS',
    targetType: 'User',
    targetId: user._id,
    targetName: user.name,
    details: { email: user.email },
    req,
  });

  return {
    message: 'Password has been reset successfully. Please log in with your new credentials.',
  };
};

export const changePassword = async (userId, { currentPassword, newPassword }, req = null) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    await createAuditLog({
      actor: { _id: user._id, email: user.email, role: user.role },
      action: 'PASSWORD_CHANGE_FAILED',
      targetType: 'User',
      targetId: user._id,
      outcome: 'FAILURE',
      details: { reason: 'Incorrect current password' },
      req,
    });
    throw new BadRequestError('Current password is incorrect');
  }

  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();

  await createAuditLog({
    actor: { _id: user._id, email: user.email, role: user.role },
    action: 'PASSWORD_CHANGED',
    targetType: 'User',
    targetId: user._id,
    targetName: user.name,
    details: { email: user.email },
    req,
  });

  return {
    message: 'Password changed successfully',
  };
};

export const updateProfile = async (userId, { name, department }, req = null) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const previous = { name: user.name, department: user.department };
  if (name) user.name = name;
  if (department) user.department = department;

  await user.save();

  await createAuditLog({
    actor: { _id: user._id, email: user.email, role: user.role },
    action: 'PROFILE_UPDATED',
    targetType: 'User',
    targetId: user._id,
    targetName: user.name,
    details: { previous, updated: { name: user.name, department: user.department } },
    req,
  });

  return user;
};

export const revokeUserSessions = async (userId, keepCurrentRefreshToken = null, req = null) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (keepCurrentRefreshToken) {
    const keepHash = hashToken(keepCurrentRefreshToken);
    user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash === keepHash);
  } else {
    user.revokeAllSessions();
  }

  await user.save();

  await createAuditLog({
    actor: { _id: user._id, email: user.email, role: user.role },
    action: 'SESSIONS_REVOKED',
    targetType: 'User',
    targetId: user._id,
    targetName: user.name,
    details: { keepCurrent: Boolean(keepCurrentRefreshToken) },
    req,
  });

  return {
    message: 'Active sessions revoked successfully',
    activeSessionsRemaining: user.refreshTokens.length,
  };
};

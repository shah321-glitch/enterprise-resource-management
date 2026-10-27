import { User } from '../users/user.model.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from '../../utils/jwt.js';
import { ConflictError, UnauthorizedError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { createAuditLog } from '../audit-logs/audit-log.service.js';

export const register = async ({ name, email, password, role, department }, req = null) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError('A user with this email address already exists');
  }

  const passwordHash = await User.hashPassword(password);
  const user = new User({
    name,
    email,
    passwordHash,
    role: role || 'EMPLOYEE',
    department: department || 'General',
  });

  await user.save();

  await createAuditLog({
    actor: { _id: user._id, email: user.email, role: user.role },
    action: 'USER_REGISTERED',
    targetType: 'User',
    targetId: user._id,
    targetName: user.name,
    details: { email: user.email, role: user.role, department: user.department },
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

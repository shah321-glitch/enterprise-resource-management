import { ForbiddenError } from '../utils/errors.js';

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  EMPLOYEE: 'EMPLOYEE',
};

const ROLE_RANKS = {
  [ROLES.SUPER_ADMIN]: 4,
  [ROLES.ADMIN]: 3,
  [ROLES.PROJECT_MANAGER]: 2,
  [ROLES.EMPLOYEE]: 1,
};

/**
 * Ensures user has at least one of the required roles.
 * @param {string[]} roles
 */
export const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('User context required for authorization'));
    }

    if (roles.includes(req.user.role) || req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    return next(new ForbiddenError(`Access denied: Requires one of [${roles.join(', ')}] role`));
  };
};

/**
 * Ensures user has minimum role rank.
 */
export const requireMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('User context required'));
    }

    const userRank = ROLE_RANKS[req.user.role] || 0;
    const requiredRank = ROLE_RANKS[minRole] || 999;

    if (userRank >= requiredRank) {
      return next();
    }

    return next(new ForbiddenError(`Access denied: Insufficient permissions (Minimum required: ${minRole})`));
  };
};

export const requireAdmin = requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]);
export const requireSuperAdmin = requireRole([ROLES.SUPER_ADMIN]);
export const requireProjectManagerOrAdmin = requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PROJECT_MANAGER]);


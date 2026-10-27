import { verifyAccessToken } from '../utils/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { User } from '../modules/users/user.model.js';

export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required: No token provided');
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      throw new UnauthorizedError(err.name === 'TokenExpiredError' ? 'Access token has expired' : 'Invalid access token');
    }

    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    if (!user.isActive) {
      throw new ForbiddenError('User account is deactivated. Contact an administrator.');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

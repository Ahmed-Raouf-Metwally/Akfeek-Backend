const jwt = require('jsonwebtoken');
const { AppError } = require('./error.middleware');
const prisma = require('../../utils/database/prisma');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(
        'Authentication required',
        401,
        'UNAUTHORIZED'
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError(
          'Token expired',
          401,
          'INVALID_TOKEN'
        );
      }
      throw new AppError(
        'Invalid token',
        401,
        'INVALID_TOKEN'
      );
    }

    // Get user from database
    // Support both old format (id) and new format (userId)
    const userId = decoded.userId || decoded.id;
    
    if (!userId) {
      throw new AppError(
        'Invalid token format',
        401,
        'INVALID_TOKEN'
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        preferredLanguage: true,
        emailVerified: true,
        phoneVerified: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    if (!user) {
      throw new AppError(
        'User not found',
        401,
        'UNAUTHORIZED'
      );
    }

    // Check if user is active or pending verification
    if (user.status !== 'ACTIVE' && user.status !== 'PENDING_VERIFICATION') {
      throw new AppError(
        'Account is not active',
        403,
        'FORBIDDEN'
      );
    }

    // Attach user to request
    req.user = user;
    
    // Attach language preference to request
    req.language = user.preferredLanguage || 'AR';

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't throw error if not
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token, continue without user
      req.language = req.headers['accept-language']?.startsWith('ar') ? 'AR' : 'EN';
      return next();
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Support both old format (id) and new format (userId)
    const userId = decoded.userId || decoded.id;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        preferredLanguage: true,
        profile: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (user && user.status === 'ACTIVE') {
      req.user = user;
      req.language = user.preferredLanguage;
    }

    next();
  } catch (error) {
    // Token invalid, continue without user
    next();
  }
};

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuth;

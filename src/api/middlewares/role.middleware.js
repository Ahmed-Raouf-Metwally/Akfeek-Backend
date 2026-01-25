const { AppError } = require('./error.middleware');

/**
 * Role-based access control middleware factory
 * @param {Array<string>} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware
 */
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user exists (should be set by auth middleware)
      if (!req.user) {
        throw new AppError(
          'Authentication required',
          401,
          'UNAUTHORIZED'
        );
      }

      // Check if user role is allowed
      if (!allowedRoles.includes(req.user.role)) {
        throw new AppError(
          'Access denied. Insufficient permissions.',
          403,
          'FORBIDDEN'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = roleMiddleware;

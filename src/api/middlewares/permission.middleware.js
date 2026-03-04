const { AppError } = require('./error.middleware');
const { isValidPermissionKey } = require('../../constants/permissions');
const prisma = require('../../utils/database/prisma');

/**
 * يسمح للأدمن دائماً، وللموظف فقط إذا كانت له الصلاحية المطلوبة.
 * @param {string} permissionKey - مفتاح الصلاحية (مثل: bookings, vendors, invoices)
 * @returns {Function} Express middleware
 */
function requireAdminOrPermission(permissionKey) {
  if (!isValidPermissionKey(permissionKey)) {
    throw new Error(`Invalid permission key: ${permissionKey}`);
  }

  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      if (req.user.role === 'ADMIN') {
        return next();
      }

      if (req.user.role === 'EMPLOYEE') {
        const has = await prisma.employeePermission.findUnique({
          where: {
            userId_permissionKey: {
              userId: req.user.id,
              permissionKey,
            },
          },
        });
        if (has) {
          return next();
        }
      }

      throw new AppError('Access denied. Insufficient permissions.', 403, 'FORBIDDEN');
    } catch (error) {
      next(error);
    }
  };
}

/**
 * يسمح فقط للأدمن (لأمور مثل إضافة موظفين وتحديد صلاحياتهم).
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }
  if (req.user.role !== 'ADMIN') {
    return next(new AppError('Admin only.', 403, 'FORBIDDEN'));
  }
  next();
}

/**
 * للاستخدام داخل الـ controllers: هل هذا المستخدم (أدمن أو موظف له الصلاحية) يملك صلاحية معيّنة؟
 * @param {string} userId
 * @param {string} permissionKey
 * @returns {Promise<boolean>}
 */
async function hasPermission(userId, permissionKey) {
  if (!userId || !isValidPermissionKey(permissionKey)) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role !== 'EMPLOYEE') return false;
  const perm = await prisma.employeePermission.findUnique({
    where: {
      userId_permissionKey: { userId, permissionKey },
    },
  });
  return !!perm;
}

module.exports = {
  requireAdminOrPermission,
  requireAdmin,
  hasPermission,
};

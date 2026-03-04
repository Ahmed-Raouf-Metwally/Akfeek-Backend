const bcrypt = require('bcrypt');
const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');
const { PERMISSION_KEYS, PERMISSION_LABELS, isValidPermissionKey } = require('../../constants/permissions');
const logger = require('../../utils/logger/logger');

/**
 * قائمة موظفي أكفيك (أدمن فقط).
 * GET /api/admin/employees
 */
async function listEmployees(req, res, next) {
  try {
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = req.query.search != null ? String(req.query.search).trim() : '';

    const where = { role: 'EMPLOYEE' };
    if (search) {
      where.email = { contains: search };
    }

    const skip = (pageNum - 1) * limitNum;

    let users = [];
    let total = 0;
    try {
      [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
          },
        }),
        prisma.user.count({ where }),
      ]);
    } catch (dbErr) {
      if (dbErr.code === 'P2001' || (dbErr.message && /enum|EMPLOYEE|unknown column/i.test(dbErr.message))) {
        logger.warn('listEmployees: DB may need migration for EMPLOYEE role', dbErr.message);
        return res.json({
          success: true,
          data: [],
          pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 1 },
        });
      }
      throw dbErr;
    }

    const userIds = users.map((u) => u.id);
    let profileMap = {};
    let permissionsMap = {};
    if (userIds.length > 0) {
      try {
        const profiles = await prisma.profile.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, firstName: true, lastName: true, avatar: true },
        });
        profiles.forEach((p) => { profileMap[p.userId] = p; });
      } catch (e) {
        logger.warn('listEmployees: profiles', e.message);
      }
      try {
        const perms = await prisma.employeePermission.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, permissionKey: true },
        });
        perms.forEach((p) => {
          if (!permissionsMap[p.userId]) permissionsMap[p.userId] = [];
          permissionsMap[p.userId].push(p.permissionKey);
        });
      } catch (e) {
        logger.warn('listEmployees: employeePermissions', e.message);
      }
    }

    const data = users.map((u) => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      status: u.status,
      createdAt: u.createdAt,
      profile: profileMap[u.id] || null,
      permissions: permissionsMap[u.id] || [],
    }));

    res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    logger.error('listEmployees error:', { message: error.message, stack: error.stack, code: error.code });
    next(error);
  }
}

/**
 * إضافة موظف أكفيك (أدمن فقط).
 * POST /api/admin/employees
 * Body: email, password, firstName, lastName, phone?
 */
async function createEmployee(req, res, next) {
  try {
    const email = req.body.email != null ? String(req.body.email).trim().toLowerCase() : '';
    const password = req.body.password != null ? String(req.body.password) : '';
    const firstName = req.body.firstName != null ? String(req.body.firstName).trim() : '';
    const lastName = req.body.lastName != null ? String(req.body.lastName).trim() : '';
    const phoneRaw = req.body.phone;
    const phone = phoneRaw != null && String(phoneRaw).trim() !== '' ? String(phoneRaw).trim() : null;

    if (!email || !password || !firstName || !lastName) {
      throw new AppError('email, password, firstName, lastName are required', 400, 'VALIDATION_ERROR');
    }
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400, 'VALIDATION_ERROR');
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('البريد الإلكتروني مسجل مسبقاً', 409, 'CONFLICT');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // إنشاء المستخدم ثم البروفايل على مرحلتين لتفادي مشاكل nested create مع MySQL
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        preferredLanguage: 'AR',
        phone,
      },
      select: { id: true, email: true, phone: true, status: true, createdAt: true },
    });

    await prisma.profile.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
      },
    });

    const userWithProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        profile: { select: { firstName: true, lastName: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة الموظف',
      messageAr: 'تم إضافة الموظف بنجاح',
      data: userWithProfile || user,
    });
  } catch (error) {
    logger.error('createEmployee error:', { message: error.message, stack: error.stack, code: error.code });
    next(error);
  }
}

/**
 * صلاحيات موظف معيّن (أدمن فقط).
 * GET /api/admin/employees/:id/permissions
 */
async function getEmployeePermissions(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        role: true,
        profile: { select: { firstName: true, lastName: true } },
        employeePermissions: { select: { permissionKey: true } },
      },
    });
    if (!user || user.role !== 'EMPLOYEE') {
      throw new AppError('Employee not found', 404, 'NOT_FOUND');
    }
    const permissions = (user.employeePermissions || []).map((p) => p.permissionKey);
    res.json({
      success: true,
      data: {
        ...user,
        permissions,
        allKeys: PERMISSION_KEYS,
        labels: PERMISSION_LABELS,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * تحديث صلاحيات موظف (أدمن فقط).
 * PUT /api/admin/employees/:id/permissions
 * Body: { permissions: ["bookings", "vendors", ...] }
 */
async function updateEmployeePermissions(req, res, next) {
  try {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      throw new AppError('permissions must be an array', 400, 'VALIDATION_ERROR');
    }
    const valid = permissions.filter((k) => isValidPermissionKey(k));
    const invalid = permissions.filter((k) => !isValidPermissionKey(k));
    if (invalid.length > 0) {
      throw new AppError(`Invalid permission keys: ${invalid.join(', ')}`, 400, 'VALIDATION_ERROR');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });
    if (!user || user.role !== 'EMPLOYEE') {
      throw new AppError('Employee not found', 404, 'NOT_FOUND');
    }

    await prisma.$transaction([
      prisma.employeePermission.deleteMany({ where: { userId: user.id } }),
      ...valid.map((permissionKey) =>
        prisma.employeePermission.create({
          data: { userId: user.id, permissionKey },
        })
      ),
    ]);

    res.json({
      success: true,
      message: 'تم تحديث صلاحيات الموظف',
      messageAr: 'تم تحديث صلاحيات الموظف بنجاح',
      data: { permissions: valid },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * قائمة مفاتيح الصلاحيات المتاحة (للأدمن عند إعداد واجهة الصلاحيات).
 * GET /api/admin/employees/permission-keys
 */
async function getPermissionKeys(req, res, next) {
  try {
    res.json({
      success: true,
      data: {
        keys: PERMISSION_KEYS,
        labels: PERMISSION_LABELS,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listEmployees,
  createEmployee,
  getEmployeePermissions,
  updateEmployeePermissions,
  getPermissionKeys,
};

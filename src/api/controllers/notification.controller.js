const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Notification Controller
 * Handles user notifications - list, read, mark as read
 */
class NotificationController {
  /**
   * Get current user's notifications (paginated)
   * GET /api/notifications?page=1&limit=20&unreadOnly=false
   */
  async getMyNotifications(req, res, next) {
    try {
      const userId = req.user.id;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
      const unreadOnly = req.query.unreadOnly === 'true';
      const skip = (page - 1) * limit;

      const where = { userId };
      if (unreadOnly) where.isRead = false;

      const [items, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.notification.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit) || 1;

      res.json({
        success: true,
        data: items,
        pagination: { page, limit, total, totalPages },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get ALL notifications in the system (Admin only)
   * GET /api/admin/notifications?page=1&limit=20&userId=xxx
   */
  async getAllNotifications(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
      const userId = req.query.userId;
      const skip = (page - 1) * limit;

      const where = {};
      if (userId) where.userId = userId;

      const [items, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        }),
        prisma.notification.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit) || 1;

      res.json({
        success: true,
        data: items,
        pagination: { page, limit, total, totalPages },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single notification by id (must belong to user or be admin)
   * GET /api/notifications/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'ADMIN';

      const where = isAdmin ? { id } : { id, userId };

      const notification = await prisma.notification.findFirst({
        where,
        include: {
          booking: { select: { id: true, bookingNumber: true, status: true } },
          user: isAdmin ? { select: { email: true, profile: { select: { firstName: true, lastName: true } } } } : false
        },
      });

      if (!notification) {
        throw new AppError('Notification not found', 404, 'NOT_FOUND');
      }

      res.json({ success: true, message: '', data: notification });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark notification as read
   * PATCH /api/notifications/:id/read
   */
  async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'ADMIN';

      const where = isAdmin ? { id } : { id, userId };

      const notification = await prisma.notification.findFirst({
        where,
      });

      if (!notification) {
        throw new AppError('Notification not found', 404, 'NOT_FOUND');
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: { isRead: true, readAt: new Date() },
      });

      res.json({
        success: true,
        message: 'Notification marked as read',
        messageAr: 'تم تعليم الإشعار كمقروء',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark all notifications as read
   * PATCH /api/notifications/read-all
   */
  async markAllAsRead(req, res, next) {
    try {
      const userId = req.user.id;

      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });

      res.json({
        success: true,
        message: 'All notifications marked as read',
        messageAr: 'تم تعليم كل الإشعارات كمقروءة',
        data: {},
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();

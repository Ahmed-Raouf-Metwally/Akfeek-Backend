const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Activity Controller
 * Manages system activity logs
 */
class ActivityController {
    /**
     * Get all activity logs (Admin only)
     * GET /api/activity
     */
    async getAllLogs(req, res, next) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
            const action = req.query.action || null;
            const userId = req.query.userId || null;

            const skip = (page - 1) * limit;

            const where = {};
            if (action) where.action = { contains: action };
            if (userId) where.userId = userId;

            const [items, total] = await Promise.all([
                prisma.activityLog.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                role: true,
                                profile: { select: { firstName: true, lastName: true } }
                            }
                        }
                    }
                }),
                prisma.activityLog.count({ where }),
            ]);

            const totalPages = Math.ceil(total / limit) || 1;

            res.json({
                success: true,
                message: '',
                data: items,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create a new activity log (Internal use mainly, but exposed for specific frontend tracking)
     * POST /api/activity
     */
    async createLog(req, res, next) {
        try {
            const { action, entity, entityId, details } = req.body;
            const userId = req.user?.id; // Optional if system action

            const log = await prisma.activityLog.create({
                data: {
                    action,
                    entity,
                    entityId,
                    details,
                    userId,
                    ipAddress: req.ip
                }
            });

            res.status(201).json({
                success: true,
                data: log
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ActivityController();

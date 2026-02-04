const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Supply Controller
 * Manages Supply Requests
 */
class SupplyController {
    /**
     * List supply requests (Admin)
     * GET /api/supplies
     */
    async list(req, res, next) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
            const status = req.query.status || null;
            const skip = (page - 1) * limit;

            const where = status ? { status } : {};

            const [items, total] = await Promise.all([
                prisma.supplyRequest.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        technician: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
                        supplier: { select: { email: true, profile: { select: { businessName: true } } } },
                        items: true
                    }
                }),
                prisma.supplyRequest.count({ where }),
            ]);

            res.json({
                success: true,
                data: items,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get supply request by ID
     * GET /api/supplies/:id
     */
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const request = await prisma.supplyRequest.findUnique({
                where: { id },
                include: {
                    items: { include: { part: true } },
                    technician: { include: { profile: true } },
                    supplier: { include: { profile: true } }
                }
            });

            if (!request) throw new AppError('Supply request not found', 404, 'NOT_FOUND');

            res.json({ success: true, data: request });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SupplyController();

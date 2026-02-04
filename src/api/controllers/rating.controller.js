const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Rating Controller
 * Manages Ratings & Reviews
 */
class RatingController {
    /**
     * List ratings (Admin)
     * GET /api/ratings
     */
    async list(req, res, next) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
            const skip = (page - 1) * limit;

            const [items, total] = await Promise.all([
                prisma.rating.findMany({
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        booking: { select: { bookingNumber: true } },
                        rater: { select: { id: true, role: true, profile: { select: { firstName: true, lastName: true } } } },
                        ratee: { select: { id: true, role: true, profile: { select: { firstName: true, lastName: true } } } }
                    }
                }),
                prisma.rating.count(),
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
}

module.exports = new RatingController();

const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Inspection Controller
 * Manages Inspection Reports and Items
 */
class InspectionController {
    /**
     * Get all inspections (Admin)
     * GET /api/inspections
     */
    async list(req, res, next) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
            const status = req.query.status || null;
            const skip = (page - 1) * limit;

            const where = status ? { status } : {};

            const [items, total] = await Promise.all([
                prisma.inspectionReport.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        booking: { select: { bookingNumber: true, vehicle: { include: { vehicleModel: true } } } },
                        technician: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } }
                    }
                }),
                prisma.inspectionReport.count({ where }),
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
     * Get inspection by ID
     * GET /api/inspections/:id
     */
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const report = await prisma.inspectionReport.findUnique({
                where: { id },
                include: {
                    items: true,
                    booking: { include: { customer: { include: { profile: true } }, vehicle: true } },
                    technician: { include: { profile: true } }
                }
            });

            if (!report) throw new AppError('Inspection report not found', 404, 'NOT_FOUND');

            res.json({ success: true, data: report });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new InspectionController();

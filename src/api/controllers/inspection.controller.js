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
     * Create inspection report (Technician)
     * POST /api/inspections
     */
    async create(req, res, next) {
        try {
            const { bookingId, mileage, overallCondition, notes, images, videos, estimatedCost, estimatedDuration, items } = req.body;
            const technicianId = req.user.id;

            // Verify booking exists and assigned to this technician
            const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
            if (!booking) throw new AppError('Booking not found', 404, 'NOT_FOUND');
            if (booking.technicianId !== technicianId && req.user.role !== 'ADMIN') {
                throw new AppError('You are not assigned to this booking', 403, 'FORBIDDEN');
            }

            const report = await prisma.inspectionReport.create({
                data: {
                    bookingId,
                    technicianId,
                    mileage,
                    overallCondition,
                    notes,
                    images: images ? images : undefined,
                    videos: videos ? videos : undefined,
                    estimatedCost: estimatedCost || 0,
                    estimatedDuration,
                    status: 'COMPLETED', // Or PENDING if awaiting approval
                    items: {
                        create: items ? items.map(item => ({
                            category: item.category,
                            issue: item.issue,
                            issueAr: item.issueAr,
                            severity: item.severity,
                            recommendedAction: item.recommendedAction,
                            estimatedCost: item.estimatedCost || 0,
                            requiresPart: item.requiresPart || false,
                            partName: item.partName,
                            partSku: item.partSku,
                            priority: item.priority || 1
                        })) : []
                    }
                },
                include: { items: true }
            });

            res.status(201).json({ success: true, message: 'Inspection report created', data: report });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update inspection report (Technician/Admin)
     * PUT /api/inspections/:id
     */
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { status, customerResponse, customerComment, mileage, overallCondition, notes, estimatedCost, estimatedDuration } = req.body;

            const existing = await prisma.inspectionReport.findUnique({ where: { id } });
            if (!existing) throw new AppError('Report not found', 404, 'NOT_FOUND');

            const report = await prisma.inspectionReport.update({
                where: { id },
                data: {
                    status,
                    customerResponse,
                    customerComment,
                    mileage,
                    overallCondition,
                    notes,
                    estimatedCost,
                    estimatedDuration,
                    respondedAt: customerResponse ? new Date() : undefined
                },
                include: { items: true }
            });

            res.json({ success: true, message: 'Inspection report updated', data: report });
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
                    items: { orderBy: { priority: 'asc' } },
                    booking: {
                        include: {
                            customer: { include: { profile: true } },
                            vehicle: { include: { vehicleModel: { include: { brand: true } } } }
                        }
                    },
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

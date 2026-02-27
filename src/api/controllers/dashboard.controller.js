const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Dashboard Controller
 * Aggregates statistics for the dashboard overview
 */
class DashboardController {
    /**
     * Get dashboard statistics (Admin)
     * GET /api/dashboard/stats
     */
    async getStats(req, res, next) {
        try {
            const [
                totalUsers,
                totalBookings,
                activeSppliers,
                totalRevenue
            ] = await Promise.all([
                prisma.user.count(),
                prisma.booking.count(),
                prisma.user.count({ where: { role: 'SUPPLIER', status: 'ACTIVE' } }),
                prisma.invoice.aggregate({
                    _sum: { totalAmount: true },
                    where: { status: 'PAID' }
                })
            ]);

            // Recent Activity (Last 5 logs) – ActivityLog only, not WorkshopReview
            const recentActivity = await prisma.activityLog.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    action: true,
                    entity: true,
                    entityId: true,
                    createdAt: true,
                    user: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } }
                }
            });

            // Recent Bookings (Last 5)
            const recentBookings = await prisma.booking.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    bookingNumber: true,
                    status: true,
                    createdAt: true,
                    customer: { select: { profile: { select: { firstName: true, lastName: true } } } },
                    vehicle: { select: { vehicleModel: { select: { name: true } } } }
                }
            });

            res.json({
                success: true,
                data: {
                    stats: {
                        totalUsers,
                        totalBookings,
                        activeSppliers,
                        revenue: totalRevenue._sum.totalAmount || 0
                    },
                    recentActivity,
                    recentBookings
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new DashboardController();

const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Get all job broadcasts (Admin). Paginated list with customer/booking/offers summary.
 * GET /api/broadcasts
 */
async function getAllBroadcasts(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const status = req.query.status || null;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.jobBroadcast.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          bookingId: true,
          customerId: true,
          latitude: true,
          longitude: true,
          locationAddress: true,
          radiusKm: true,
          broadcastUntil: true,
          description: true,
          urgency: true,
          estimatedBudget: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              status: true,
              totalPrice: true,
            },
          },
          customer: {
            select: {
              id: true,
              email: true,
              phone: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
          offers: {
            select: {
              id: true,
              technicianId: true,
              bidAmount: true,
              estimatedArrival: true,
              isSelected: true,
              createdAt: true,
              technician: {
                select: {
                  id: true,
                  email: true,
                  profile: { select: { firstName: true, lastName: true } },
                },
              },
            },
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              offers: true,
            },
          },
        },
      }),
      prisma.jobBroadcast.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      success: true,
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
 * Get single broadcast by id (Admin).
 * GET /api/broadcasts/:id
 */
async function getBroadcastById(req, res, next) {
  try {
    const { id } = req.params;
    const broadcast = await prisma.jobBroadcast.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            customer: {
              select: {
                id: true,
                email: true,
                phone: true,
                profile: { select: { firstName: true, lastName: true } },
              },
            },
            vehicle: {
              select: {
                id: true,
                plateNumber: true,
                vehicleModel: {
                  select: {
                    name: true,
                    year: true,
                    brand: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
        offers: {
          include: {
            technician: {
              select: {
                id: true,
                email: true,
                profile: { select: { firstName: true, lastName: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!broadcast) {
      throw new AppError('Broadcast not found', 404, 'NOT_FOUND');
    }
    res.json({ success: true, message: '', data: broadcast });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllBroadcasts, getBroadcastById };

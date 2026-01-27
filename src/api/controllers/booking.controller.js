const prisma = require('../../utils/database/prisma');

/**
 * Get all bookings (Admin). Paginated list with customer/vehicle summary.
 * GET /api/bookings
 */
async function getAllBookings(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const status = req.query.status || null;
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          bookingNumber: true,
          customerId: true,
          technicianId: true,
          vehicleId: true,
          scheduledDate: true,
          scheduledTime: true,
          status: true,
          totalPrice: true,
          createdAt: true,
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
      }),
      prisma.booking.count({ where }),
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
 * Get single booking by id (Admin).
 * GET /api/bookings/:id
 */
async function getBookingById(req, res, next) {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: { select: { firstName: true, lastName: true, phoneNumber: true } },
          },
        },
        vehicle: {
          include: {
            vehicleModel: {
              include: { brand: { select: { name: true, nameAr: true } } },
            },
          },
        },
        technician: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllBookings, getBookingById };

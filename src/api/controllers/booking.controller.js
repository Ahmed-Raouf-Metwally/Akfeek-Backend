const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

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
          technician: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } },
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
 * Get single booking by id (Admin: any; Customer: own only).
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
            profile: { select: { firstName: true, lastName: true } },
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
        statusHistory: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
        jobBroadcast: {
          select: {
            id: true,
            status: true,
            description: true,
            urgency: true,
            estimatedBudget: true,
            createdAt: true,
          },
        },
        inspectionReport: {
          select: {
            id: true,
            status: true,
            overallCondition: true,
            estimatedCost: true,
            customerResponse: true,
            createdAt: true,
          },
        },
        supplyRequests: {
          select: {
            id: true,
            requestNumber: true,
            status: true,
            totalCost: true,
            createdAt: true,
          },
          take: 10,
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
            paidAmount: true,
          },
        },
        rating: {
          select: {
            id: true,
            score: true,
            review: true,
            createdAt: true,
          },
        },
        services: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                nameAr: true,
              },
            },
          },
        },
        address: {
          select: {
            id: true,
            label: true,
            labelAr: true,
            street: true,
            city: true,
            latitude: true,
            longitude: true,
          },
        },
        bookingAutoParts: {
          include: {
            autoPart: {
              select: {
                id: true,
                sku: true,
                name: true,
                nameAr: true,
                price: true,
              },
            },
          },
        },
      },
    });
    if (!booking) {
      throw new AppError('Booking not found', 404, 'NOT_FOUND');
    }
    if (req.user.role !== 'ADMIN' && booking.customerId !== req.user.id) {
      throw new AppError('Not allowed to view this booking', 403, 'FORBIDDEN');
    }
    res.json({ success: true, message: '', data: booking });
  } catch (error) {
    next(error);
  }
}

/**
 * Create new booking (customer books appointment; admin can create for any customer)
 * POST /api/bookings
 * Body: vehicleId, scheduledDate, scheduledTime, serviceIds (array), addressId?, workshopId?, deliveryMethod?, notes?
 */
async function createBooking(req, res, next) {
  try {
    const {
      customerId: bodyCustomerId,
      vehicleId,
      scheduledDate,
      scheduledTime,
      workType: bodyWorkType,
      workshopId,
      deliveryMethod,
      serviceIds,
      services: servicesLegacy,
      addressId,
      notes
    } = req.body;

    const workType = bodyWorkType === 'REWORK' ? 'REWORK' : 'WORK';

    const isAdmin = req.user.role === 'ADMIN';
    const customerId = isAdmin && bodyCustomerId ? bodyCustomerId : req.user.id;

    if (!vehicleId || !scheduledDate) {
      throw new AppError('vehicleId and scheduledDate are required', 400, 'VALIDATION_ERROR');
    }

    const ids = serviceIds || (Array.isArray(servicesLegacy) ? servicesLegacy : []);
    if (!ids.length) {
      throw new AppError('At least one service is required (serviceIds)', 400, 'VALIDATION_ERROR');
    }

    const scheduledDateObj = new Date(scheduledDate);
    const dayStart = new Date(scheduledDateObj);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(scheduledDateObj);
    dayEnd.setUTCHours(23, 59, 59, 999);
    if (scheduledTime) {
      const conflicting = await prisma.booking.findFirst({
        where: {
          scheduledDate: { gte: dayStart, lte: dayEnd },
          scheduledTime,
          status: { notIn: ['CANCELLED', 'REJECTED', 'NO_SHOW'] },
          services: { some: { serviceId: { in: ids } } }
        }
      });
      if (conflicting) {
        throw new AppError('This time slot is already booked for one of the selected services', 400, 'SLOT_NOT_AVAILABLE');
      }
    }

    const vehicle = await prisma.userVehicle.findUnique({
      where: { id: vehicleId },
      include: { vehicleModel: { select: { type: true } } }
    });
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
    }
    if (vehicle.userId !== customerId) {
      throw new AppError('Vehicle does not belong to customer', 403, 'FORBIDDEN');
    }

    const vehicleType = vehicle.vehicleModel?.type || 'SEDAN';

    let flatbedFee = 0;
    if (workshopId) {
      const workshop = await prisma.certifiedWorkshop.findUnique({ where: { id: workshopId } });
      if (!workshop) throw new AppError('Workshop not found', 404, 'NOT_FOUND');
      if (!workshop.isActive || !workshop.isVerified) {
        throw new AppError('Workshop is not available', 400, 'WORKSHOP_NOT_AVAILABLE');
      }
      if (deliveryMethod === 'FLATBED') flatbedFee = 150;
    }

    const bookingNumber = `BKG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const bookingServiceData = [];
    let subtotal = 0;

    for (const serviceId of ids) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId, isActive: true },
        include: {
          pricing: {
            where: { isActive: true },
            take: 1,
            orderBy: { vehicleType: 'asc' }
          }
        }
      });
      if (!service) {
        throw new AppError(`Service not found or inactive: ${serviceId}`, 404, 'NOT_FOUND');
      }

      let unitPrice = 0;
      const forType = await prisma.servicePricing.findFirst({
        where: { serviceId, vehicleType, isActive: true }
      });
      if (forType) {
        unitPrice = Number(forType.discountedPrice ?? forType.basePrice);
      } else {
        const fallback = await prisma.servicePricing.findFirst({
          where: { serviceId, isActive: true }
        });
        unitPrice = fallback ? Number(fallback.discountedPrice ?? fallback.basePrice) : 0;
      }
      const quantity = 1;
      const totalPrice = unitPrice * quantity;
      subtotal += totalPrice;
      const estimatedMinutes = service.estimatedDuration != null ? Number(service.estimatedDuration) : null;
      bookingServiceData.push({ serviceId, quantity, unitPrice, totalPrice, estimatedMinutes });
    }

    const totalEstimatedMinutes = bookingServiceData.reduce((sum, s) => sum + (s.estimatedMinutes ?? 0), 0);

    const tax = Math.round(subtotal * 0.15 * 100) / 100;
    const totalPrice = subtotal + flatbedFee + tax;

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        customerId,
        vehicleId,
        addressId: addressId || null,
        scheduledDate: new Date(scheduledDate),
        scheduledTime: scheduledTime || null,
        workType,
        estimatedDuration: totalEstimatedMinutes || null,
        workshopId: workshopId || null,
        deliveryMethod: deliveryMethod || null,
        flatbedFee,
        status: 'PENDING',
        subtotal,
        laborFee: 0,
        deliveryFee: flatbedFee,
        partsTotal: 0,
        discount: 0,
        tax,
        totalPrice,
        notes: notes || null,
        services: {
          create: bookingServiceData.map(({ serviceId, quantity, unitPrice, totalPrice: tp, estimatedMinutes: em }) => ({
            serviceId,
            quantity,
            unitPrice,
            totalPrice: tp,
            estimatedMinutes: em ?? undefined
          }))
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true } }
          }
        },
        vehicle: {
          include: {
            vehicleModel: { include: { brand: true } }
          }
        },
        workshop: workshopId ? {
          select: { id: true, name: true, nameAr: true, city: true, phone: true }
        } : false,
        services: {
          include: {
            service: { select: { id: true, name: true, nameAr: true } }
          }
        }
      }
    });

    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: null,
        toStatus: 'PENDING',
        changedBy: customerId,
        reason: 'Booking created'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      messageAr: 'تم إنشاء الحجز بنجاح',
      data: booking
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user's bookings (customer: my appointments; admin: all)
 * GET /api/bookings/my or GET /api/bookings?my=1
 */
async function getMyBookings(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const status = req.query.status || null;
    const skip = (page - 1) * limit;

    const where = { customerId: req.user.id };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ scheduledDate: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          bookingNumber: true,
          scheduledDate: true,
          scheduledTime: true,
          status: true,
          totalPrice: true,
          createdAt: true,
          vehicle: {
            select: {
              id: true,
              plateNumber: true,
              vehicleModel: {
                select: {
                  name: true,
                  year: true,
                  brand: { select: { name: true } }
                }
              }
            }
          },
          services: {
            include: {
              service: { select: { id: true, name: true, nameAr: true } }
            }
          }
        }
      }),
      prisma.booking.count({ where })
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllBookings, getBookingById, createBooking, getMyBookings };

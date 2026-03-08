const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Get all job broadcasts (Admin). Paginated list: بث السحب (JobBroadcast) + طلبات الورش المتنقلة (MobileWorkshopRequest).
 * GET /api/broadcasts?type=towing|mobile-workshop|all & page= & limit=
 * - type=towing: بث السحب فقط
 * - type=mobile-workshop: طلبات الورش المتنقلة فقط
 * - type=all أو بدون type: الاثنان معًا (مدمجين حسب التاريخ)
 */
async function getAllBroadcasts(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const status = req.query.status || null;
    const typeFilter = (req.query.type || 'all').toLowerCase(); // towing | mobile-workshop | all
    const skip = (page - 1) * limit;

    const towingWhere = {};
    if (status) towingWhere.status = status;

    const mwWhere = {};
    if (status) {
      if (status === 'BROADCASTING') mwWhere.status = 'BROADCASTING';
      else if (status === 'OFFERS_RECEIVED') mwWhere.status = 'OFFERS_RECEIVED';
      else if (status === 'ASSIGNED') mwWhere.status = 'ASSIGNED';
    }

    let data = [];
    let total = 0;

    if (typeFilter === 'towing' || typeFilter === 'all') {
      const [towingItems, towingTotal] = await Promise.all([
        prisma.jobBroadcast.findMany({
          where: towingWhere,
          orderBy: [{ createdAt: 'desc' }],
          take: typeFilter === 'towing' ? limit : 500,
          skip: typeFilter === 'towing' ? skip : 0,
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
            _count: { select: { offers: true } },
          },
        }),
        prisma.jobBroadcast.count({ where: towingWhere }),
      ]);
      const towingNormalized = towingItems.map((b) => ({
        type: 'towing',
        id: b.id,
        bookingId: b.bookingId,
        customerId: b.customerId,
        latitude: b.latitude,
        longitude: b.longitude,
        locationAddress: b.locationAddress,
        description: b.description,
        urgency: b.urgency,
        status: b.status,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        booking: b.booking,
        customer: b.customer,
        offersCount: b._count?.offers ?? 0,
      }));
      if (typeFilter === 'towing') {
        data = towingNormalized;
        total = towingTotal;
      } else {
        data = towingNormalized;
        total = towingTotal;
      }
    }

    if (typeFilter === 'mobile-workshop' || typeFilter === 'all') {
      const [mwItems, mwTotal] = await Promise.all([
        prisma.mobileWorkshopRequest.findMany({
          where: mwWhere,
          orderBy: [{ createdAt: 'desc' }],
          take: typeFilter === 'mobile-workshop' ? limit : 500,
          skip: typeFilter === 'mobile-workshop' ? skip : 0,
          select: {
            id: true,
            requestNumber: true,
            customerId: true,
            latitude: true,
            longitude: true,
            addressText: true,
            city: true,
            status: true,
            expiresAt: true,
            createdAt: true,
            updatedAt: true,
            workshopType: { select: { id: true, name: true, nameAr: true } },
            workshopTypeService: { select: { id: true, name: true, nameAr: true } },
            customer: {
              select: {
                id: true,
                email: true,
                phone: true,
                profile: { select: { firstName: true, lastName: true } },
              },
            },
            _count: { select: { offers: true } },
          },
        }),
        prisma.mobileWorkshopRequest.count({ where: mwWhere }),
      ]);
      const mwNormalized = mwItems.map((r) => ({
        type: 'mobile_workshop',
        id: r.id,
        requestNumber: r.requestNumber,
        customerId: r.customerId,
        latitude: r.latitude,
        longitude: r.longitude,
        locationAddress: r.addressText,
        description: (r.workshopTypeService?.nameAr || r.workshopTypeService?.name) || (r.workshopType?.nameAr || r.workshopType?.name) || 'طلب ورشة متنقلة',
        city: r.city,
        status: r.status,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        workshopType: r.workshopType,
        workshopTypeService: r.workshopTypeService,
        customer: r.customer,
        offersCount: r._count?.offers ?? 0,
      }));
      if (typeFilter === 'mobile-workshop') {
        data = mwNormalized;
        total = mwTotal;
      } else {
        data = [...data, ...mwNormalized].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        total = total + mwTotal;
        data = data.slice(skip, skip + limit);
      }
    }

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      success: true,
      data,
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
 * Get single broadcast by id (Admin). يدعم بث السحب (JobBroadcast) أو طلب ورشة متنقلة (MobileWorkshopRequest).
 * GET /api/broadcasts/:id
 */
async function getBroadcastById(req, res, next) {
  try {
    const { id } = req.params;
    const [jobBroadcast, mwRequest] = await Promise.all([
      prisma.jobBroadcast.findUnique({
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
      }),
      prisma.mobileWorkshopRequest.findUnique({
        where: { id },
        include: {
          workshopType: { select: { id: true, name: true, nameAr: true } },
          workshopTypeService: { select: { id: true, name: true, nameAr: true } },
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
              mobileWorkshop: {
                select: {
                  id: true,
                  name: true,
                  nameAr: true,
                  vendor: {
                    select: {
                      id: true,
                      businessName: true,
                      businessNameAr: true,
                      contactPhone: true,
                      user: { select: { email: true } },
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);
    if (jobBroadcast) {
      return res.json({ success: true, message: '', data: { type: 'towing', ...jobBroadcast } });
    }
    if (mwRequest) {
      return res.json({ success: true, message: '', data: { type: 'mobile_workshop', ...mwRequest } });
    }
    throw new AppError('Broadcast not found', 404, 'NOT_FOUND');
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllBroadcasts, getBroadcastById };

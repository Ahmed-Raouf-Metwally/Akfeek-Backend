const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');
const workshopService = require('../../services/workshop.service');
const workshopInspectionService = require('../../services/workshopInspection.service');
const { getPlatformCommissionPercent } = require('../../utils/pricing');
const { buildStatusWhere, getDisplayStatus } = require('../../constants/bookingStatus');
const { emitBookingStatusChange } = require('../../socket');

const MOBILE_WORKSHOP_VENDOR_TRANSITIONS = {
  TECHNICIAN_ASSIGNED: ['TECHNICIAN_EN_ROUTE'],
  TECHNICIAN_EN_ROUTE: ['ARRIVED'],
  ARRIVED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
};

const STATUS_AR_LABEL = {
  TECHNICIAN_ASSIGNED: 'تم تعيين الفني',
  TECHNICIAN_EN_ROUTE: 'الفني في الطريق',
  ARRIVED: 'تم الوصول',
  IN_PROGRESS: 'جاري التنفيذ',
  COMPLETED: 'تم الإنجاز',
};

/**
 * Get all bookings (Admin). Paginated list with customer/vehicle summary.
 * GET /api/bookings
 * Query status: PENDING | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED (مبسّطة) أو أي قيمة من الـ enum
 */
async function getAllBookings(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const status = req.query.status || null;
    const skip = (page - 1) * limit;

    const where = status ? { ...buildStatusWhere(status) } : {};

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
          subtotal: true,
          laborFee: true,
          deliveryFee: true,
          partsTotal: true,
          discount: true,
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
              plateDigits: true,
              plateLettersEn: true,
              plateLettersAr: true,
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
          workshop: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              city: true,
              phone: true,
              email: true,
              address: true,
              vendor: {
                select: {
                  id: true,
                  businessName: true,
                  businessNameAr: true,
                  contactPhone: true,
                  contactEmail: true,
                  address: true,
                  city: true,
                  logo: true,
                },
              },
            },
          },
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
                },
              },
            },
          },
          jobBroadcast: {
            select: {
              id: true,
              offers: {
                where: { isSelected: true },
                take: 1,
                select: {
                  winch: {
                    select: {
                      vendor: {
                        select: {
                          id: true,
                          businessName: true,
                          businessNameAr: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          services: {
            take: 3,
            select: {
              service: {
                select: {
                  vendor: {
                    select: {
                      id: true,
                      businessName: true,
                      businessNameAr: true,
                    },
                  },
                },
              },
            },
          },
          invoice: {
            select: {
              id: true,
              lineItems: { select: { totalPrice: true } },
            },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    // إثراء كل حجز بمقدم الخدمة/الفيندور (للعرض) + الحالة المبسطة + التاريخ والوقت
    const data = items.map((b) => {
      const vendor =
        b.workshop?.vendor
          ? { name: b.workshop.vendor.businessName, nameAr: b.workshop.vendor.businessNameAr, source: 'workshop' }
          : b.mobileWorkshop?.vendor
            ? { name: b.mobileWorkshop.vendor.businessName, nameAr: b.mobileWorkshop.vendor.businessNameAr, source: 'mobileWorkshop' }
            : b.jobBroadcast?.offers?.[0]?.winch?.vendor
              ? { name: b.jobBroadcast.offers[0].winch.vendor.businessName, nameAr: b.jobBroadcast.offers[0].winch.vendor.businessNameAr, source: 'winch' }
              : b.services?.[0]?.service?.vendor
                ? { name: b.services[0].service.vendor.businessName, nameAr: b.services[0].service.vendor.businessNameAr, source: 'service' }
                : null;
      const providerDisplay = vendor?.nameAr || vendor?.name || (b.mobileWorkshop?.nameAr || b.mobileWorkshop?.name) || (b.workshop?.nameAr || b.workshop?.name) || '—';
      const providerDisplayEn = vendor?.name || b.mobileWorkshop?.name || b.workshop?.name || '—';
      const dateDisplay = b.scheduledDate ? new Date(b.scheduledDate).toLocaleDateString('ar-SA', { dateStyle: 'short' }) : (b.createdAt ? new Date(b.createdAt).toLocaleDateString('ar-SA', { dateStyle: 'short' }) : null);
      const timeDisplay = b.scheduledTime || (b.createdAt ? new Date(b.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : null);
      return {
        ...b,
        displayStatus: getDisplayStatus(b.status),
        providerDisplay,
        providerDisplayEn,
        providerVendor: vendor,
        dateDisplay,
        timeDisplay,
      };
    });

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
            offers: {
              where: { isSelected: true },
              take: 1,
              select: {
                winch: {
                  select: {
                    vendor: {
                      select: {
                        id: true,
                        businessName: true,
                        businessNameAr: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        workshop: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            city: true,
            phone: true,
            email: true,
            address: true,
            vendor: {
              select: {
                id: true,
                businessName: true,
                businessNameAr: true,
                contactPhone: true,
                contactEmail: true,
                address: true,
                city: true,
                logo: true,
              },
            },
          },
        },
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
                contactEmail: true,
                address: true,
                city: true,
                logo: true,
              },
            },
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
                vendorId: true,
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
    const isAdmin = req.user.role === 'ADMIN';
    const isCustomer = booking.customerId === req.user.id;
    if (!isAdmin && !isCustomer) {
      const vendorProfile = await prisma.vendorProfile.findFirst({
        where: { userId: req.user.id },
      });
      const isVendorOwner =
        vendorProfile &&
        ((booking.workshop?.vendor?.id === vendorProfile.id) ||
          (booking.mobileWorkshop?.vendor?.id === vendorProfile.id) ||
          (booking.services?.some((s) => s.service?.vendorId === vendorProfile.id)) ||
          (booking.jobBroadcast?.offers?.some((o) => o.winch?.vendor?.id === vendorProfile.id)));
      if (!isVendorOwner) {
        throw new AppError('Not allowed to view this booking', 403, 'FORBIDDEN');
      }
    }
    const b = booking;
    const vendor =
      b.workshop?.vendor
        ? { name: b.workshop.vendor.businessName, nameAr: b.workshop.vendor.businessNameAr, source: 'workshop' }
        : b.mobileWorkshop?.vendor
          ? { name: b.mobileWorkshop.vendor.businessName, nameAr: b.mobileWorkshop.vendor.businessNameAr, source: 'mobileWorkshop' }
          : b.jobBroadcast?.offers?.[0]?.winch?.vendor
            ? { name: b.jobBroadcast.offers[0].winch.vendor.businessName, nameAr: b.jobBroadcast.offers[0].winch.vendor.businessNameAr, source: 'winch' }
            : b.services?.[0]?.service?.vendor
              ? { name: b.services[0].service.vendor.businessName, nameAr: b.services[0].service.vendor.businessNameAr, source: 'service' }
              : null;
    const providerDisplay = vendor?.nameAr || vendor?.name || (b.mobileWorkshop?.nameAr || b.mobileWorkshop?.name) || (b.workshop?.nameAr || b.workshop?.name) || '—';
    const providerDisplayEn = vendor?.name || b.mobileWorkshop?.name || b.workshop?.name || '—';
    const dateDisplay = b.scheduledDate ? new Date(b.scheduledDate).toLocaleDateString('ar-SA', { dateStyle: 'short' }) : (b.createdAt ? new Date(b.createdAt).toLocaleDateString('ar-SA', { dateStyle: 'short' }) : null);
    const timeDisplay = b.scheduledTime || (b.createdAt ? new Date(b.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : null);
    res.json({
      success: true,
      message: '',
      data: {
        ...booking,
        providerDisplay,
        providerDisplayEn,
        providerVendor: vendor,
        dateDisplay,
        timeDisplay,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create new booking (customer books appointment; admin can create for any customer)
 * POST /api/bookings
 * Body: vehicleId, scheduledDate, scheduledTime, serviceIds (array) OR workshopServiceIds (array when workshopId), addressId?, workshopId?, deliveryMethod?, notes?
 */
async function createBooking(req, res, next) {
  try {
    const {
      customerId: bodyCustomerId,
      vehicleId,
      scheduledDate,
      scheduledTime,
      workType: bodyWorkType,
      workshopId: bodyWorkshopId,
      deliveryMethod: bodyDeliveryMethod,
      serviceIds,
      workshopServiceIds,
      services: servicesLegacy,
      addressId,
      notes
    } = req.body;

    const workType = bodyWorkType === 'REWORK' ? 'REWORK' : 'WORK';

    const isAdmin = req.user.role === 'ADMIN';
    const customerId = isAdmin && bodyCustomerId ? bodyCustomerId : req.user.id;

    if (!scheduledDate) {
      throw new AppError('scheduledDate is required', 400, 'VALIDATION_ERROR');
    }

    const ids = serviceIds || (Array.isArray(servicesLegacy) ? servicesLegacy : []);
    let normalizedWorkshopServiceIds = Array.isArray(workshopServiceIds) ? workshopServiceIds.filter(Boolean) : [];
    let useWorkshopServices = normalizedWorkshopServiceIds.length > 0;

    // If booking is created by serviceIds only, we can infer workshopId for CERTIFIED_WORKSHOP services (vendor-linked)
    // and decide whether vehicleId is actually required based on service.requiresVehicle.
    let inferredWorkshopId = null;
    let workshopId = bodyWorkshopId || null;
    let deliveryMethod = bodyDeliveryMethod || null;

    // If workshopServiceIds are provided without workshopId, infer workshopId (all must belong to same workshop)
    if (useWorkshopServices && !workshopId) {
      const wss = await prisma.certifiedWorkshopService.findMany({
        where: { id: { in: normalizedWorkshopServiceIds }, isActive: true },
        select: { id: true, workshopId: true },
      });
      if (wss.length !== normalizedWorkshopServiceIds.length) {
        const found = new Set(wss.map((s) => s.id));
        const missing = normalizedWorkshopServiceIds.filter((id) => !found.has(id));
        throw new AppError(`Workshop service not found or inactive: ${missing[0]}`, 404, 'NOT_FOUND');
      }
      const wsIds = [...new Set(wss.map((s) => s.workshopId).filter(Boolean))];
      if (wsIds.length !== 1) {
        throw new AppError('workshopServiceIds must belong to the same workshop', 400, 'VALIDATION_ERROR');
      }
      inferredWorkshopId = wsIds[0];
      workshopId = wsIds[0];
      deliveryMethod = deliveryMethod || 'SELF_DELIVERY';
    }

    let resolvedServicesForIds = [];
    if (!useWorkshopServices && ids.length) {
      resolvedServicesForIds = await prisma.service.findMany({
        where: { id: { in: ids }, isActive: true },
        select: { id: true, category: true, vendorId: true, requiresVehicle: true },
      });
      if (resolvedServicesForIds.length !== ids.length) {
        const found = new Set(resolvedServicesForIds.map((s) => s.id));
        const missing = ids.filter((id) => !found.has(id));
        throw new AppError(`Service not found or inactive: ${missing[0]}`, 404, 'NOT_FOUND');
      }

      const requiresVehicleAny = resolvedServicesForIds.some((s) => s.requiresVehicle === true);
      if (requiresVehicleAny && !vehicleId) {
        throw new AppError('vehicleId is required for the selected service(s)', 400, 'VALIDATION_ERROR');
      }

      if (!workshopId) {
        const allCertifiedWorkshop = resolvedServicesForIds.every((s) => s.category === 'CERTIFIED_WORKSHOP');
        const vendorIds = [...new Set(resolvedServicesForIds.map((s) => s.vendorId).filter(Boolean))];
        if (allCertifiedWorkshop && vendorIds.length === 1) {
          const vendorId = vendorIds[0];
          const ws = await prisma.certifiedWorkshop.findFirst({
            where: { vendorId, isActive: true, isVerified: true },
            select: { id: true },
          });
          if (ws?.id) {
            inferredWorkshopId = ws.id;
            workshopId = ws.id;
            // deliveryMethod is only meaningful for certified workshop bookings; default to SELF_DELIVERY
            deliveryMethod = deliveryMethod || 'SELF_DELIVERY';
          }
        }
      }
    }

    // Default behavior: if user books a certified workshop without specifying any services,
    // auto-add the workshop inspection service (serviceType = INSPECTION) if available.
    if (!useWorkshopServices && !ids.length && workshopId) {
      // Prefer inspection-like service; fallback to the first active workshop service.
      const inspectionLike = await prisma.certifiedWorkshopService.findFirst({
        where: {
          workshopId,
          isActive: true,
          OR: [
            { serviceType: 'INSPECTION' },
            { serviceType: 'DIAGNOSIS' },
            { serviceType: 'GENERAL_INSPECTION' },
            { name: { contains: 'Inspection' } },
            { nameAr: { contains: 'فحص' } },
          ],
        },
        orderBy: [{ createdAt: 'asc' }],
        select: { id: true },
      });
      const fallbackAny = inspectionLike
        ? null
        : await prisma.certifiedWorkshopService.findFirst({
            where: { workshopId, isActive: true },
            orderBy: [{ createdAt: 'asc' }],
            select: { id: true },
          });

      const chosen = inspectionLike || fallbackAny;
      if (!chosen) {
        throw new AppError(
          'No services found for this workshop. Please add workshop services first.',
          400,
          'VALIDATION_ERROR'
        );
      }

      normalizedWorkshopServiceIds = [chosen.id];
      useWorkshopServices = true;
      deliveryMethod = deliveryMethod || 'SELF_DELIVERY';
    }

    // If this is a certified workshop booking AND services were provided (either catalog serviceIds or workshopServiceIds),
    // also include the inspection-like workshop service by default (if available) unless already included.
    let extraWorkshopInspectionServiceId = null;
    if (workshopId && (useWorkshopServices || ids.length)) {
      const alreadyHasInspectionLike =
        (useWorkshopServices && normalizedWorkshopServiceIds.length > 0) &&
        (await prisma.certifiedWorkshopService.count({
          where: {
            id: { in: normalizedWorkshopServiceIds },
            workshopId,
            isActive: true,
            OR: [
              { serviceType: 'INSPECTION' },
              { serviceType: 'DIAGNOSIS' },
              { serviceType: 'GENERAL_INSPECTION' },
              { name: { contains: 'Inspection' } },
              { nameAr: { contains: 'فحص' } },
            ],
          },
        })) > 0;

      if (!alreadyHasInspectionLike) {
        const inspectionLike = await prisma.certifiedWorkshopService.findFirst({
          where: {
            workshopId,
            isActive: true,
            OR: [
              { serviceType: 'INSPECTION' },
              { serviceType: 'DIAGNOSIS' },
              { serviceType: 'GENERAL_INSPECTION' },
              { name: { contains: 'Inspection' } },
              { nameAr: { contains: 'فحص' } },
            ],
          },
          orderBy: [{ createdAt: 'asc' }],
          select: { id: true },
        });
        if (inspectionLike?.id) {
          if (useWorkshopServices) {
            // Prepend inspection for workshop-service-based bookings
            normalizedWorkshopServiceIds = [
              inspectionLike.id,
              ...normalizedWorkshopServiceIds.filter((x) => x !== inspectionLike.id),
            ];
          } else {
            // For catalog serviceIds bookings, add an extra workshop service line
            extraWorkshopInspectionServiceId = inspectionLike.id;
          }
          deliveryMethod = deliveryMethod || 'SELF_DELIVERY';
        }
      }
    }

    if (!useWorkshopServices && !ids.length) {
      throw new AppError(
        'At least one service is required (serviceIds or workshopServiceIds) unless booking a workshop with a default inspection service available',
        400,
        'VALIDATION_ERROR'
      );
    }

    const scheduledDateObj = new Date(scheduledDate);
    const dayStart = new Date(scheduledDateObj);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(scheduledDateObj);
    dayEnd.setUTCHours(23, 59, 59, 999);
    if (scheduledTime && !useWorkshopServices && ids.length && !workshopId) {
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
    if (scheduledTime && workshopId) {
      const conflicting = await prisma.booking.findFirst({
        where: {
          workshopId,
          scheduledDate: { gte: dayStart, lte: dayEnd },
          scheduledTime,
          status: { notIn: ['CANCELLED', 'REJECTED', 'NO_SHOW'] },
        }
      });
      if (conflicting) {
        throw new AppError('This time slot is already booked for this workshop', 400, 'SLOT_NOT_AVAILABLE');
      }
    }

    let vehicle = null;
    let vehicleType = 'all';
    if (vehicleId) {
      vehicle = await prisma.userVehicle.findUnique({
        where: { id: vehicleId },
        include: { vehicleModel: { select: { type: true } } }
      });
      if (!vehicle) {
        throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
      }
      if (vehicle.userId !== customerId) {
        throw new AppError('Vehicle does not belong to customer', 403, 'FORBIDDEN');
      }
      vehicleType = vehicle.vehicleModel?.type || 'SEDAN';
    }

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

    if (useWorkshopServices) {
      for (const wsId of normalizedWorkshopServiceIds) {
        const ws = await prisma.certifiedWorkshopService.findFirst({
          where: { id: wsId, workshopId, isActive: true }
        });
        if (!ws) {
          throw new AppError(`Workshop service not found or inactive: ${wsId}`, 404, 'NOT_FOUND');
        }
        const quantity = 1;
        const unitPrice = Number(ws.price);
        const totalPrice = unitPrice * quantity;
        subtotal += totalPrice;
        const estimatedMinutes = ws.estimatedDuration != null ? Number(ws.estimatedDuration) : null;
        bookingServiceData.push({
          serviceId: null,
          workshopServiceId: ws.id,
          quantity,
          unitPrice,
          totalPrice,
          estimatedMinutes,
          vendorId: null,
        });
      }
    } else {
      // Add default inspection workshop service line (if detected) for catalog-service bookings
      if (extraWorkshopInspectionServiceId) {
        const ws = await prisma.certifiedWorkshopService.findFirst({
          where: { id: extraWorkshopInspectionServiceId, workshopId, isActive: true }
        });
        if (ws) {
          const quantity = 1;
          const unitPrice = Number(ws.price);
          const totalPrice = unitPrice * quantity;
          subtotal += totalPrice;
          const estimatedMinutes = ws.estimatedDuration != null ? Number(ws.estimatedDuration) : null;
          bookingServiceData.push({
            serviceId: null,
            workshopServiceId: ws.id,
            quantity,
            unitPrice,
            totalPrice,
            estimatedMinutes,
            vendorId: null,
          });
        }
      }
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
        const vendorId = service.vendorId || null;
        bookingServiceData.push({ serviceId, workshopServiceId: null, quantity, unitPrice, totalPrice, estimatedMinutes, vendorId });
      }
    }

    const totalEstimatedMinutes = bookingServiceData.reduce((sum, s) => sum + (s.estimatedMinutes ?? 0), 0);

    // لا نضيف ضريبة قيمة مضافة على الحجوزات — الإجمالي = المجموع الجزئي + الرسوم فقط
    const tax = 0;
    const totalPrice = Math.round((subtotal + flatbedFee) * 100) / 100;

    // نسبة عمولة المنصة: من الفيندور (ورشة أو خدمة) إن وُجدت، وإلا الافتراضية — تُخزّن في الحجز لعدم تأثر الحجوزات القديمة بتغيير النسبة لاحقاً
    let effectiveCommissionPercent = await getPlatformCommissionPercent();
    if (workshopId) {
      const workshop = await prisma.certifiedWorkshop.findUnique({
        where: { id: workshopId },
        select: { vendor: { select: { commissionPercent: true } } },
      });
      if (workshop?.vendor?.commissionPercent != null) {
        effectiveCommissionPercent = Number(workshop.vendor.commissionPercent);
      }
    } else {
      const vendorIdsInBooking = [...new Set(bookingServiceData.map(s => s.vendorId).filter(Boolean))];
      if (vendorIdsInBooking.length > 0) {
        const vendorProfile = await prisma.vendorProfile.findFirst({
          where: { id: vendorIdsInBooking[0] },
          select: { commissionPercent: true },
        });
        if (vendorProfile?.commissionPercent != null) {
          effectiveCommissionPercent = vendorProfile.commissionPercent;
        }
      }
    }
    const platformCommission = Math.round(subtotal * effectiveCommissionPercent / 100 * 100) / 100;
    const vendorEarnings = Math.round((subtotal - platformCommission) * 100) / 100;

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        customer: { connect: { id: customerId } },
        ...(vehicleId ? { vehicle: { connect: { id: vehicleId } } } : {}),
        ...(addressId ? { address: { connect: { id: addressId } } } : {}),
        scheduledDate: new Date(scheduledDate),
        scheduledTime: scheduledTime || null,
        workType,
        estimatedDuration: totalEstimatedMinutes || null,
        ...(workshopId ? { workshop: { connect: { id: workshopId } } } : {}),
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
        platformCommissionPercent: effectiveCommissionPercent,
        notes: notes || null,
        metadata: {
          commissionPercent: effectiveCommissionPercent,
          platformCommission,
          vendorEarnings,
        },
        services: {
          create: bookingServiceData.map(({ serviceId, workshopServiceId, quantity, unitPrice, totalPrice: tp, estimatedMinutes: em }) => ({
            ...(serviceId ? { service: { connect: { id: serviceId } } } : {}),
            ...(workshopServiceId ? { workshopService: { connect: { id: workshopServiceId } } } : {}),
            quantity,
            unitPrice,
            totalPrice: tp,
            ...(em != null ? { estimatedMinutes: em } : {})
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
          select: {
            id: true,
            name: true,
            nameAr: true,
            city: true,
            phone: true,
            email: true,
            address: true,
            vendor: {
              select: {
                id: true,
                businessName: true,
                businessNameAr: true,
                contactPhone: true,
                contactEmail: true,
                address: true,
                city: true,
                logo: true,
              },
            },
          },
        } : false,
        services: {
          include: {
            service: { select: { id: true, name: true, nameAr: true } },
            workshopService: { select: { id: true, name: true, nameAr: true } }
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

    // إشعار للعميل: تم إنشاء الحجز
    try {
      await prisma.notification.create({
        data: {
          userId: customerId,
          type: 'BOOKING_CREATED',
          title: 'Booking created',
          titleAr: 'تم إنشاء الحجز',
          message: `Your booking ${booking.bookingNumber} has been created successfully.`,
          messageAr: `تم إنشاء حجزك رقم ${booking.bookingNumber} بنجاح.`,
          bookingId: booking.id,
          metadata: {
            bookingNumber: booking.bookingNumber,
            status: booking.status,
            totalPrice: booking.totalPrice,
          },
        },
      });
    } catch (_) { /* notification is non-blocking */ }

    // إنشاء فاتورة تلقائياً لتمكين الدفع: العناية الشاملة، ورش الغسيل، والورش المعتمدة
    if (booking.id) {
      try {
        const invNum = `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const invoice = await prisma.invoice.create({
          data: {
            invoiceNumber: invNum,
            bookingId: booking.id,
            customerId: booking.customerId,
            subtotal: Number(booking.subtotal) || 0,
            tax: 0,
            discount: 0,
            totalAmount: Number(booking.totalPrice) || 0,
            paidAmount: 0,
            status: 'PENDING',
          },
        });
        const items = await prisma.bookingService.findMany({
          where: { bookingId: booking.id },
          include: { service: { select: { name: true, nameAr: true } }, workshopService: { select: { name: true, nameAr: true } } },
        });
        for (const item of items) {
          const desc = item.workshopService?.name || item.service?.name || 'Service';
          const descAr = item.workshopService?.nameAr || item.service?.nameAr || 'خدمة';
          await prisma.invoiceLineItem.create({
            data: {
              invoiceId: invoice.id,
              description: desc,
              descriptionAr: descAr,
              itemType: 'SERVICE',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            },
          });
        }
      } catch (e) { /* ignore if duplicate or error */ }
    }

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

    // Customer intent: towing/mobile "request" phase shouldn't appear as a real booking
    // in "My bookings" UI. Job broadcast uses a Booking row with status BROADCASTING/OFFERS_RECEIVED.
    const where = { customerId: req.user.id };
    if (status) {
      Object.assign(where, buildStatusWhere(status));
    } else {
      where.status = { notIn: ['BROADCASTING', 'OFFERS_RECEIVED'] };
    }

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
          customerId: true,
          vehicle: {
            select: {
              id: true,
              plateDigits: true,
              plateLettersEn: true,
              plateLettersAr: true,
              vehicleModel: {
                select: {
                  name: true,
                  year: true,
                  brand: { select: { name: true } }
                }
              }
            }
          },
          customer: {
            select: {
              id: true,
              email: true,
              phone: true,
              profile: { select: { firstName: true, lastName: true } }
            }
          },
          workshop: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              city: true,
              phone: true,
              vendor: {
                select: {
                  id: true,
                  businessName: true,
                  businessNameAr: true,
                  contactPhone: true,
                  contactEmail: true,
                  address: true,
                  city: true,
                  logo: true,
                },
              },
            },
          },
          mobileWorkshop: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              vendor: {
                select: {
                  id: true,
                  businessName: true,
                  businessNameAr: true
                }
              }
            }
          },
          jobBroadcast: {
            select: {
              id: true,
              offers: {
                where: { isSelected: true },
                take: 1,
                select: {
                  winch: {
                    select: {
                      vendor: {
                        select: {
                          id: true,
                          businessName: true,
                          businessNameAr: true
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          services: {
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                  nameAr: true,
                  vendor: {
                    select: {
                      id: true,
                      businessName: true,
                      businessNameAr: true
                    }
                  }
                }
              }
            }
          },
          invoice: {
            select: {
              id: true,
              lineItems: { select: { totalPrice: true } },
            },
          },
        }
      }),
      prisma.booking.count({ where })
    ]);

    const data = items.map((b) => {
      const vendor =
        b.workshop?.vendor
          ? { name: b.workshop.vendor.businessName, nameAr: b.workshop.vendor.businessNameAr, source: 'workshop' }
          : b.mobileWorkshop?.vendor
            ? { name: b.mobileWorkshop.vendor.businessName, nameAr: b.mobileWorkshop.vendor.businessNameAr, source: 'mobileWorkshop' }
            : b.jobBroadcast?.offers?.[0]?.winch?.vendor
              ? { name: b.jobBroadcast.offers[0].winch.vendor.businessName, nameAr: b.jobBroadcast.offers[0].winch.vendor.businessNameAr, source: 'winch' }
              : b.services?.[0]?.service?.vendor
                ? { name: b.services[0].service.vendor.businessName, nameAr: b.services[0].service.vendor.businessNameAr, source: 'service' }
                : null;
      const providerDisplay = vendor?.nameAr || vendor?.name || (b.mobileWorkshop?.nameAr || b.mobileWorkshop?.name) || (b.workshop?.nameAr || b.workshop?.name) || '—';
      const providerDisplayEn = vendor?.name || b.mobileWorkshop?.name || b.workshop?.name || '—';
      const dateDisplay = b.scheduledDate ? new Date(b.scheduledDate).toLocaleDateString('ar-SA', { dateStyle: 'short' }) : (b.createdAt ? new Date(b.createdAt).toLocaleDateString('ar-SA', { dateStyle: 'short' }) : null);
      const timeDisplay = b.scheduledTime || (b.createdAt ? new Date(b.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : null);
      return {
        ...b,
        displayStatus: getDisplayStatus(b.status),
        providerDisplay,
        providerDisplayEn,
        providerVendor: vendor,
        dateDisplay,
        timeDisplay,
      };
    });

    res.json({
      success: true,
      data,
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

/**
 * Update booking status (Admin).
 * PATCH /api/bookings/:id/status
 * Body: { status, reason? }
 */
async function updateBookingStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, bookingNumber: true, status: true, customerId: true },
    });
    if (!booking) throw new AppError('Booking not found', 404, 'NOT_FOUND');

    const oldStatus = booking.status;

    const updated = await prisma.booking.update({
      where: { id },
      data: { status },
    });

    // Record history
    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: id,
        fromStatus: oldStatus,
        toStatus: status,
        reason: reason || null,
        changedBy: req.user?.id || null,
        timestamp: new Date(),
      },
    }).catch(() => null); // ignore if model doesn't exist

    // إشعار للعميل: تغيير حالة الحجز (Admin)
    try {
      const statusAr =
        status === 'PENDING' ? 'قيد الانتظار' :
        status === 'CONFIRMED' ? 'مؤكد' :
        status === 'IN_PROGRESS' ? 'قيد التنفيذ' :
        status === 'COMPLETED' ? 'مكتمل' :
        status === 'CANCELLED' ? 'ملغي' :
        status;
      await prisma.notification.create({
        data: {
          userId: booking.customerId,
          type: 'STATUS_UPDATE',
          title: 'Booking status updated',
          titleAr: 'تم تحديث حالة الحجز',
          message: `Booking ${booking.bookingNumber} status changed from ${oldStatus} to ${status}.`,
          messageAr: `تم تحديث حالة الحجز رقم ${booking.bookingNumber} إلى ${statusAr}.`,
          bookingId: booking.id,
          metadata: { fromStatus: oldStatus, toStatus: status, reason: reason || null },
        },
      });
    } catch (_) { /* non-blocking */ }

    res.json({ success: true, message: 'تم تحديث الحالة', data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * Vendor: confirm booking (تأكيد الحجز من قبل الورشة).
 * PATCH /api/bookings/:id/confirm
 * الفيندور صاحب الورشة فقط يمكنه تأكيد الحجز.
 */
async function confirmBookingAsVendor(req, res, next) {
  try {
    const { id } = req.params;
    const vendorProfile = await prisma.vendorProfile.findFirst({
      where: { userId: req.user.id },
    });
    if (!vendorProfile) throw new AppError('Vendor profile not found', 403, 'FORBIDDEN');

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        services: { include: { service: { select: { vendorId: true } } } },
        workshop: { select: { vendorId: true } },
      },
    });
    if (!booking) throw new AppError('Booking not found', 404, 'NOT_FOUND');

    const byServiceVendor = booking.services?.some((bs) => bs.service && bs.service.vendorId === vendorProfile.id);
    const byWorkshopVendor = booking.workshopId && booking.workshop?.vendorId === vendorProfile.id;
    const belongsToVendor = byServiceVendor || byWorkshopVendor;
    if (!belongsToVendor) {
      throw new AppError('Not allowed to confirm this booking', 403, 'FORBIDDEN');
    }

    if (booking.status !== 'PENDING') {
      throw new AppError('Only pending bookings can be confirmed', 400, 'INVALID_STATUS');
    }

    const oldStatus = booking.status;
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });

    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: id,
        fromStatus: oldStatus,
        toStatus: 'CONFIRMED',
        reason: 'Confirmed by workshop vendor',
        changedBy: req.user.id,
      },
    }).catch(() => null);

    // إشعار للعميل: الحجز تم تأكيده
    try {
      await prisma.notification.create({
        data: {
          userId: booking.customerId,
          type: 'BOOKING_CONFIRMED',
          title: 'Booking confirmed',
          titleAr: 'تم تأكيد الحجز',
          message: `Your booking has been confirmed.`,
          messageAr: 'تم تأكيد حجزك.',
          bookingId: booking.id,
          metadata: { fromStatus: oldStatus, toStatus: 'CONFIRMED' },
        },
      });
    } catch (_) { /* non-blocking */ }

    res.json({
      success: true,
      message: 'Booking confirmed',
      messageAr: 'تم تأكيد الحجز',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Vendor: start booking (بدء تنفيذ الحجز — CONFIRMED → IN_PROGRESS).
 * PATCH /api/bookings/:id/start
 */
async function startBookingAsVendor(req, res, next) {
  try {
    const { id } = req.params;
    const vendorProfile = await prisma.vendorProfile.findFirst({
      where: { userId: req.user.id },
    });
    if (!vendorProfile) throw new AppError('Vendor profile not found', 403, 'FORBIDDEN');

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        services: { include: { service: { select: { vendorId: true } } } },
        workshop: { select: { vendorId: true } },
      },
    });
    if (!booking) throw new AppError('Booking not found', 404, 'NOT_FOUND');

    const byServiceVendor = booking.services?.some((bs) => bs.service && bs.service.vendorId === vendorProfile.id);
    const byWorkshopVendor = booking.workshopId && booking.workshop?.vendorId === vendorProfile.id;
    const belongsToVendor = byServiceVendor || byWorkshopVendor;
    if (!belongsToVendor) {
      throw new AppError('Not allowed to start this booking', 403, 'FORBIDDEN');
    }

    if (booking.status !== 'CONFIRMED') {
      throw new AppError('Only confirmed bookings can be started', 400, 'INVALID_STATUS');
    }

    const oldStatus = booking.status;
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });

    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: id,
        fromStatus: oldStatus,
        toStatus: 'IN_PROGRESS',
        reason: 'Work started by workshop vendor',
        changedBy: req.user.id,
      },
    }).catch(() => null);

    // إشعار للعميل: بدء تنفيذ الحجز
    try {
      await prisma.notification.create({
        data: {
          userId: booking.customerId,
          type: 'STATUS_UPDATE',
          title: 'Booking started',
          titleAr: 'تم بدء تنفيذ الحجز',
          message: 'Your booking is now in progress.',
          messageAr: 'حجزك الآن قيد التنفيذ.',
          bookingId: booking.id,
          metadata: { fromStatus: oldStatus, toStatus: 'IN_PROGRESS' },
        },
      });
    } catch (_) { /* non-blocking */ }

    res.json({
      success: true,
      message: 'Booking started',
      messageAr: 'تم بدء تنفيذ الحجز',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Vendor: mark booking as completed (عند اكتمال الخدمة في الورشة).
 * PATCH /api/bookings/:id/complete
 * الفيندور صاحب الخدمة فقط يمكنه استدعاء هذا.
 */
async function completeBookingAsVendor(req, res, next) {
  try {
    const { id } = req.params;
    const vendorProfile = await prisma.vendorProfile.findFirst({
      where: { userId: req.user.id },
    });
    if (!vendorProfile) throw new AppError('Vendor profile not found', 403, 'FORBIDDEN');

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        services: {
          include: { service: { select: { vendorId: true } } },
        },
        workshop: { select: { vendorId: true } },
      },
    });
    if (!booking) throw new AppError('Booking not found', 404, 'NOT_FOUND');

    const byServiceVendor = booking.services?.some(
      (bs) => bs.service && bs.service.vendorId === vendorProfile.id
    );
    const byWorkshopVendor = booking.workshopId && booking.workshop?.vendorId === vendorProfile.id;
    const belongsToVendor = byServiceVendor || byWorkshopVendor;
    if (!belongsToVendor) {
      throw new AppError('Not allowed to complete this booking', 403, 'FORBIDDEN');
    }

    const oldStatus = booking.status;
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: id,
        fromStatus: oldStatus,
        toStatus: 'COMPLETED',
        reason: 'Service completed at venue',
        changedBy: req.user.id,
      },
    }).catch(() => null);

    // إشعار للعميل: اكتمال الحجز
    try {
      await prisma.notification.create({
        data: {
          userId: booking.customerId,
          type: 'STATUS_UPDATE',
          title: 'Booking completed',
          titleAr: 'اكتمل الحجز',
          message: 'Your booking has been completed.',
          messageAr: 'تم اكتمال حجزك.',
          bookingId: booking.id,
          metadata: { fromStatus: oldStatus, toStatus: 'COMPLETED' },
        },
      });
    } catch (_) { /* non-blocking */ }

    res.json({
      success: true,
      message: 'تم تحديث الحجز إلى مكتمل',
      messageAr: 'تم تحديث الحجز إلى مكتمل',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Vendor (Mobile Workshop): update booking execution status
 * PATCH /api/bookings/:id/mobile-workshop-status
 * Allowed transitions:
 * TECHNICIAN_ASSIGNED -> TECHNICIAN_EN_ROUTE -> ARRIVED -> IN_PROGRESS -> COMPLETED
 */
async function updateMobileWorkshopBookingStatusAsVendor(req, res, next) {
  try {
    const { id } = req.params;
    const { status, reason } = req.body || {};
    const nextStatus = String(status || '').toUpperCase();
    if (!nextStatus) throw new AppError('status is required', 400, 'VALIDATION_ERROR');

    const vendorProfile = await prisma.vendorProfile.findFirst({
      where: { userId: req.user.id, vendorType: 'MOBILE_WORKSHOP' },
      select: { id: true },
    });
    if (!vendorProfile) throw new AppError('Mobile workshop vendor profile not found', 403, 'FORBIDDEN');

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        customerId: true,
        mobileWorkshop: { select: { id: true, vendorId: true } },
      },
    });
    if (!booking) throw new AppError('Booking not found', 404, 'NOT_FOUND');
    if (!booking.mobileWorkshop) {
      throw new AppError('This booking is not a mobile workshop booking', 400, 'INVALID_BOOKING_TYPE');
    }
    if (booking.mobileWorkshop.vendorId !== vendorProfile.id) {
      throw new AppError('Not allowed to update this booking', 403, 'FORBIDDEN');
    }

    const allowedNext = MOBILE_WORKSHOP_VENDOR_TRANSITIONS[booking.status] || [];
    if (!allowedNext.includes(nextStatus)) {
      throw new AppError(
        `Invalid transition from ${booking.status} to ${nextStatus}. Allowed: ${allowedNext.join(', ') || 'none'}`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: nextStatus },
    });

    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: nextStatus,
        reason: reason || `Updated by mobile workshop vendor (${req.user.id})`,
        changedBy: req.user.id,
      },
    }).catch(() => null);

    try {
      emitBookingStatusChange(booking.id, {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        fromStatus: booking.status,
        toStatus: nextStatus,
        updatedBy: req.user.id,
        reason: reason || null,
      });
    } catch (_) { /* non-blocking */ }

    try {
      await prisma.notification.create({
        data: {
          userId: booking.customerId,
          type: 'STATUS_UPDATE',
          title: 'Booking status updated',
          titleAr: 'تم تحديث حالة الحجز',
          message: `Booking ${booking.bookingNumber} updated to ${nextStatus}.`,
          messageAr: `تم تحديث حالة الحجز ${booking.bookingNumber} إلى ${STATUS_AR_LABEL[nextStatus] || nextStatus}.`,
          bookingId: booking.id,
          metadata: { fromStatus: booking.status, toStatus: nextStatus, reason: reason || null },
        },
      });
    } catch (_) { /* non-blocking */ }

    res.json({
      success: true,
      message: 'Booking status updated',
      messageAr: 'تم تحديث حالة الحجز',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Inspection report for certified-workshop booking (customer, workshop vendor, admin).
 * GET /api/bookings/:id/inspection-report
 */
async function getBookingInspectionReport(req, res, next) {
  try {
    const { id: bookingId } = req.params;
    const user = req.user;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, customerId: true, workshopId: true },
    });
    if (!booking) throw new AppError('Booking not found', 404, 'NOT_FOUND');

    let allowed = false;
    if (user.role === 'ADMIN') {
      allowed = true;
    } else if (user.role === 'CUSTOMER' && booking.customerId === user.id) {
      allowed = true;
    } else if (user.role === 'VENDOR' && booking.workshopId) {
      try {
        const workshop = await workshopService.getWorkshopByVendorUserId(user.id);
        if (workshop && workshop.id === booking.workshopId) allowed = true;
      } catch (_) {
        /* not certified workshop vendor */
      }
    }

    if (!allowed) {
      throw new AppError('Not authorized to view this inspection', 403, 'FORBIDDEN');
    }

    const report = await workshopInspectionService.getByBookingId(bookingId);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}

/**
 * Customer approves supplemental repair lines after paying the initial workshop invoice.
 * PATCH /api/bookings/:id/inspection-supplement/approve
 */
async function approveInspectionSupplement(req, res, next) {
  try {
    if (req.user.role !== 'CUSTOMER') {
      throw new AppError('Customers only', 403, 'FORBIDDEN');
    }
    const { id: bookingId } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, customerId: true },
    });
    if (!booking) throw new AppError('Booking not found', 404, 'NOT_FOUND');
    if (booking.customerId !== req.user.id) {
      throw new AppError('Not authorized', 403, 'FORBIDDEN');
    }

    const result = await workshopInspectionService.approveSupplementalForCustomer(req.user.id, bookingId);
    res.json({ success: true, message: 'تمت الموافقة على البنود الإضافية', data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * Customer declines supplemental charges (report was PENDING_CUSTOMER).
 * PATCH /api/bookings/:id/inspection-supplement/reject
 * Body: { comment?: string, customerComment?: string }
 */
async function rejectInspectionSupplement(req, res, next) {
  try {
    if (req.user.role !== 'CUSTOMER') {
      throw new AppError('Customers only', 403, 'FORBIDDEN');
    }
    const { id: bookingId } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, customerId: true },
    });
    if (!booking) throw new AppError('Booking not found', 404, 'NOT_FOUND');
    if (booking.customerId !== req.user.id) {
      throw new AppError('Not authorized', 403, 'FORBIDDEN');
    }

    const result = await workshopInspectionService.rejectSupplementalForCustomer(
      req.user.id,
      bookingId,
      req.body || {}
    );
    res.json({ success: true, message: 'تم رفض التقدير الإضافي', data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllBookings,
  getBookingById,
  createBooking,
  getMyBookings,
  updateBookingStatus,
  confirmBookingAsVendor,
  startBookingAsVendor,
  completeBookingAsVendor,
  updateMobileWorkshopBookingStatusAsVendor,
  getBookingInspectionReport,
  approveInspectionSupplement,
  rejectInspectionSupplement,
};

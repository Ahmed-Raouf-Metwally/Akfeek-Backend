const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');
const { getPlatformCommissionPercent } = require('../utils/pricing');
const { emitNotification } = require('../socket');

const REQUEST_EXPIRY_MINUTES = 30;

/**
 * Generate unique request number for mobile workshop requests
 */
async function generateRequestNumber() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  const count = await prisma.mobileWorkshopRequest.count({
    where: { createdAt: { gte: new Date(today.setHours(0, 0, 0, 0)) } },
  });
  return `MW-REQ-${dateStr}-${String(count + 1).padStart(3, '0')}`;
}

async function generateBookingNumber() {
  const count = await prisma.booking.count({
    where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
  });
  return `BKG-${Date.now()}-${String(count + 1).padStart(4, '0')}`;
}

/**
 * Customer: create request → find all available workshops of this type with this service → notify them
 * Body: vehicleId, addressId?, latitude?, longitude?, addressText?, city?, workshopTypeId, workshopTypeServiceId (الخدمة من النوع)
 */
async function createRequest(customerId, data) {
  const { vehicleId, addressId, latitude, longitude, addressText, city, workshopTypeId, workshopTypeServiceId, serviceType } = data;
  if (!workshopTypeId) {
    throw new AppError('workshopTypeId is required', 400, 'VALIDATION_ERROR');
  }
  if (!vehicleId) {
    throw new AppError('vehicleId is required for mobile workshop request', 400, 'VALIDATION_ERROR');
  }
  const workshopType = await prisma.mobileWorkshopType.findUnique({
    where: { id: workshopTypeId },
    include: { typeServices: { where: { isActive: true } } },
  });
  if (!workshopType || !workshopType.isActive) {
    throw new AppError('Workshop type not found or inactive', 404, 'NOT_FOUND');
  }

  let effectiveServiceType = 'GENERAL';
  let finalWorkshopTypeServiceId = workshopTypeServiceId || null;
  if (workshopTypeServiceId) {
    const typeSvc = await prisma.mobileWorkshopTypeService.findFirst({
      where: { id: workshopTypeServiceId, workshopTypeId, isActive: true },
    });
    if (!typeSvc) throw new AppError('Service not found for this workshop type', 404, 'NOT_FOUND');
    finalWorkshopTypeServiceId = typeSvc.id;
  }
  if (serviceType) effectiveServiceType = String(serviceType).toUpperCase();

  if (vehicleId) {
    const vehicle = await prisma.userVehicle.findFirst({ where: { id: vehicleId, userId: customerId } });
    if (!vehicle) throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
  }
  if (addressId) {
    const addr = await prisma.address.findFirst({ where: { id: addressId, userId: customerId } });
    if (!addr) throw new AppError('Address not found', 404, 'NOT_FOUND');
  }

  const expiresAt = new Date(Date.now() + REQUEST_EXPIRY_MINUTES * 60 * 1000);
  const requestNumber = await generateRequestNumber();

  const request = await prisma.mobileWorkshopRequest.create({
    data: {
      requestNumber,
      customerId,
      vehicleId: vehicleId || null,
      addressId: addressId || null,
      latitude: latitude != null ? Number(latitude) : null,
      longitude: longitude != null ? Number(longitude) : null,
      addressText: addressText || null,
      city: city || null,
      workshopTypeId,
      workshopTypeServiceId: finalWorkshopTypeServiceId,
      serviceType: effectiveServiceType,
      status: 'BROADCASTING',
      expiresAt,
    },
    include: {
      customer: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
      vehicle: { select: { id: true, plateDigits: true, plateLettersEn: true } },
      workshopType: { select: { id: true, name: true, nameAr: true } },
      workshopTypeService: { select: { id: true, name: true, nameAr: true } },
    },
  });

  // Find workshops: same type + have this service (by workshopTypeServiceId or by serviceType)
  const whereClause = {
    workshopTypeId,
    isActive: true,
    isAvailable: true,
  };
  if (finalWorkshopTypeServiceId) {
    whereClause.services = { some: { workshopTypeServiceId: finalWorkshopTypeServiceId, isActive: true } };
  } else {
    whereClause.services = { some: { serviceType: effectiveServiceType, isActive: true } };
  }

  const workshops = await prisma.mobileWorkshop.findMany({
    where: whereClause,
    include: {
      vendor: { select: { userId: true } },
      services: {
        where: finalWorkshopTypeServiceId
          ? { workshopTypeServiceId: finalWorkshopTypeServiceId, isActive: true }
          : { serviceType: effectiveServiceType, isActive: true },
      },
    },
  });

  const serviceLabel = request.workshopTypeService?.nameAr || request.workshopTypeService?.name || request.serviceType;
  for (const w of workshops) {
    if (w.vendor?.userId) {
      try {
        emitNotification(w.vendor.userId, {
          type: 'MOBILE_WORKSHOP_REQUEST',
          title: 'طلب ورشة متنقلة جديد',
          titleAr: 'طلب ورشة متنقلة جديد',
          message: `طلب خدمة ${serviceLabel} في موقعك`,
          requestId: request.id,
          workshopTypeId,
          workshopTypeServiceId: finalWorkshopTypeServiceId,
          serviceType: request.serviceType,
        });
      } catch (_) {}
    }
  }

  return {
    request: {
      id: request.id,
      requestNumber: request.requestNumber,
      status: request.status,
      workshopType: request.workshopType,
      workshopTypeService: request.workshopTypeService,
      serviceType: request.serviceType,
      addressText: request.addressText,
      city: request.city,
      latitude: request.latitude,
      longitude: request.longitude,
      expiresAt: request.expiresAt,
      createdAt: request.createdAt,
    },
    workshopsNotified: workshops.length,
  };
}

/**
 * Customer: get my requests (list)
 */
async function getMyRequests(customerId, query = {}) {
  const { status, page = 1, limit = 20 } = query;
  const skip = (Math.max(1, page) - 1) * Math.min(50, Math.max(1, limit));
  const take = Math.min(50, Math.max(1, limit));
  const where = { customerId };
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.mobileWorkshopRequest.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
include: {
      workshopType: { select: { id: true, name: true, nameAr: true } },
      workshopTypeService: { select: { id: true, name: true, nameAr: true } },
      offers: {
          include: {
            mobileWorkshop: {
              select: {
                id: true,
                name: true,
                nameAr: true,
                imageUrl: true,
                city: true,
                averageRating: true,
                totalJobs: true,
                vendor: { select: { businessName: true, businessNameAr: true } },
              },
            },
          },
          orderBy: { price: 'asc' },
        },
      },
    }),
    prisma.mobileWorkshopRequest.count({ where }),
  ]);

  const data = items.map((r) => ({
    ...r,
    offers: (r.offers || []).map((o) => ({
      id: o.id,
      price: Number(o.price),
      currency: o.currency,
      message: o.message,
      estimatedMinutes: o.estimatedMinutes,
      status: o.status,
      mobileWorkshop: o.mobileWorkshop,
      createdAt: o.createdAt,
    })),
  }));

  return {
    data,
    pagination: { page: Math.max(1, page), limit: take, total, totalPages: Math.ceil(total / take) || 1 },
  };
}

/**
 * Customer: get single request with offers
 */
async function getRequestById(requestId, customerId) {
  const request = await prisma.mobileWorkshopRequest.findFirst({
    where: { id: requestId, customerId },
    include: {
      workshopType: { select: { id: true, name: true, nameAr: true } },
      workshopTypeService: { select: { id: true, name: true, nameAr: true } },
      vehicle: { select: { id: true, plateDigits: true, plateLettersEn: true, vehicleModel: { select: { name: true, brand: { select: { name: true } } } } } },
      address: { select: { id: true, label: true, street: true, city: true, latitude: true, longitude: true } },
      offers: {
        include: {
          mobileWorkshop: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              imageUrl: true,
              vehicleImageUrl: true,
              city: true,
              averageRating: true,
              totalJobs: true,
              totalReviews: true,
              vendor: { select: { businessName: true, businessNameAr: true, user: { select: { phone: true } } } },
            },
          },
          mobileWorkshopService: { select: { id: true, name: true, nameAr: true, price: true, estimatedDuration: true } },
        },
        orderBy: { price: 'asc' },
      },
    },
  });
  if (!request) throw new AppError('Request not found', 404, 'NOT_FOUND');
  return request;
}

/**
 * Vendor: get pending requests that match my workshop (same type + have the requested service)
 */
async function getRequestsForMyWorkshop(vendorUserId) {
  const vendor = await prisma.vendorProfile.findFirst({
    where: { userId: vendorUserId, vendorType: 'MOBILE_WORKSHOP' },
    include: { mobileWorkshop: { select: { id: true, workshopTypeId: true, services: { where: { isActive: true }, select: { workshopTypeServiceId: true, serviceType: true } } } } },
  });
  if (!vendor?.mobileWorkshop) {
    return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }
  const mw = vendor.mobileWorkshop;
  if (!mw.workshopTypeId) {
    return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }

  const myTypeServiceIds = (mw.services || []).map((s) => s.workshopTypeServiceId).filter(Boolean);

  const where = {
    workshopTypeId: mw.workshopTypeId,
    status: 'BROADCASTING',
    expiresAt: { gt: new Date() },
    offers: { none: { mobileWorkshopId: mw.id } },
  };
  // إما الطلب بخدمة (workshopTypeServiceId) والورشة لديها هذه الخدمة، أو الطلب بدون خدمة محددة (نعرضه ونعتمد serviceType)
  if (myTypeServiceIds.length > 0) {
    where.OR = [
      { workshopTypeServiceId: { in: myTypeServiceIds } },
      { workshopTypeServiceId: null },
    ];
  }

  const requests = await prisma.mobileWorkshopRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      workshopType: { select: { id: true, name: true, nameAr: true } },
      workshopTypeService: { select: { id: true, name: true, nameAr: true } },
      customer: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } },
    },
  });

  return { data: requests, pagination: { page: 1, limit: 50, total: requests.length, totalPages: 1 } };
}

/**
 * Vendor: submit offer (accept request with price)
 */
async function submitOffer(mobileWorkshopId, requestId, vendorUserId, data) {
  const { price, message, mobileWorkshopServiceId } = data;
  const workshop = await prisma.mobileWorkshop.findFirst({
    where: { id: mobileWorkshopId },
    include: { vendor: true, services: { where: { isActive: true } } },
  });
  if (!workshop || workshop.vendor?.userId !== vendorUserId) {
    throw new AppError('Mobile workshop not found or not yours', 404, 'NOT_FOUND');
  }

  const request = await prisma.mobileWorkshopRequest.findUnique({
    where: { id: requestId },
    include: { offers: { where: { mobileWorkshopId } } },
  });
  if (!request) throw new AppError('Request not found', 404, 'NOT_FOUND');
  if (request.status !== 'BROADCASTING') {
    throw new AppError('Request is no longer accepting offers', 400, 'INVALID_STATUS');
  }
  if (request.expiresAt && new Date() > request.expiresAt) {
    throw new AppError('Request has expired', 400, 'EXPIRED');
  }
  if (request.workshopTypeId !== workshop.workshopTypeId) {
    throw new AppError('Your workshop type does not match this request', 400, 'INVALID_TYPE');
  }
  const workshopService = request.workshopTypeServiceId
    ? workshop.services.find((s) => s.workshopTypeServiceId === request.workshopTypeServiceId)
    : workshop.services.find((s) => s.serviceType === request.serviceType);
  if (!workshopService) throw new AppError('Your workshop does not offer this service', 400, 'INVALID_SERVICE');

  const existingOffer = request.offers && request.offers[0];
  if (existingOffer) throw new AppError('You already submitted an offer for this request', 400, 'DUPLICATE_OFFER');

  let finalPrice = price != null ? Number(price) : null;
  let finalServiceId = mobileWorkshopServiceId || workshopService.id;
  const estimatedMinutes = workshopService.estimatedDuration;
  if (finalPrice == null) finalPrice = Number(workshopService.price);
  if (finalPrice < 0) throw new AppError('Valid price is required', 400, 'VALIDATION_ERROR');

  const offer = await prisma.mobileWorkshopOffer.create({
    data: {
      requestId,
      mobileWorkshopId,
      mobileWorkshopServiceId: finalServiceId,
      price: finalPrice,
      currency: workshop.currency || 'SAR',
      message: message || null,
      estimatedMinutes,
      status: 'PENDING',
    },
    include: {
      mobileWorkshop: {
        select: {
          id: true,
          name: true,
          nameAr: true,
          imageUrl: true,
          city: true,
          vendor: { select: { businessName: true, businessNameAr: true } },
        },
      },
    },
  });

  // Update request status if we have offers
  await prisma.mobileWorkshopRequest.update({
    where: { id: requestId },
    data: { status: 'OFFERS_RECEIVED' },
  });

  // Notify customer
  try {
    emitNotification(request.customerId, {
      type: 'MOBILE_WORKSHOP_OFFER',
      title: 'عرض جديد من ورشة متنقلة',
      titleAr: 'عرض جديد من ورشة متنقلة',
      message: `${workshop.name} عرضت سعر ${finalPrice} ${workshop.currency || 'SAR'}`,
      requestId,
      offerId: offer.id,
    });
  } catch (_) {}

  return { offer: { ...offer, price: Number(offer.price) } };
}

/**
 * Customer: select an offer → create Booking, Invoice, ChatRoom; reject other offers
 */
async function selectOffer(requestId, offerId, customerId) {
  const request = await prisma.mobileWorkshopRequest.findFirst({
    where: { id: requestId, customerId },
    include: {
      offers: {
        include: {
          mobileWorkshop: {
            include: {
              vendor: { select: { userId: true, commissionPercent: true } },
              services: { where: { isActive: true } },
            },
          },
          mobileWorkshopService: true,
        },
      },
    },
  });
  if (!request) throw new AppError('Request not found', 404, 'NOT_FOUND');
  if (request.status === 'ASSIGNED') throw new AppError('You already selected an offer for this request', 400, 'ALREADY_ASSIGNED');
  if (request.status === 'CANCELLED' || request.status === 'EXPIRED') {
    throw new AppError('Request is no longer active', 400, 'INVALID_STATUS');
  }

  const offer = request.offers.find((o) => o.id === offerId);
  if (!offer || offer.status !== 'PENDING') {
    throw new AppError('Offer not found or no longer available', 404, 'NOT_FOUND');
  }

  const workshop = offer.mobileWorkshop;
  if (!workshop || !workshop.vendor) throw new AppError('Workshop data invalid', 400, 'INVALID_OFFER');

  const commissionPercent = await getPlatformCommissionPercent();
  const vendorCommission = (workshop.vendor.commissionPercent != null) ? Number(workshop.vendor.commissionPercent) : commissionPercent;
  const agreedPrice = Number(offer.price);
  const bookingNumber = await generateBookingNumber();

  const result = await prisma.$transaction(async (tx) => {
    await tx.mobileWorkshopOffer.updateMany({
      where: { requestId },
      data: { status: offerId === offer.id ? 'ACCEPTED' : 'REJECTED' },
    });
    await tx.mobileWorkshopRequest.update({
      where: { id: requestId },
      data: { status: 'ASSIGNED' },
    });

    if (!request.vehicleId) throw new AppError('Request has no vehicle; cannot create booking', 400, 'VALIDATION_ERROR');

    const booking = await tx.booking.create({
      data: {
        bookingNumber,
        customerId: request.customerId,
        vehicleId: request.vehicleId,
        addressId: request.addressId || undefined,
        pickupLat: request.latitude ?? undefined,
        pickupLng: request.longitude ?? undefined,
        pickupAddress: request.addressText ?? undefined,
        mobileWorkshopId: workshop.id,
        mobileWorkshopRequestId: request.id,
        mobileWorkshopOfferId: offer.id,
        technicianId: workshop.vendor.userId,
        status: 'TECHNICIAN_ASSIGNED', // العميل اختار العرض = تم تعيين الورشة (بانتظار الدفع)
        subtotal: agreedPrice,
        laborFee: 0,
        deliveryFee: 0,
        partsTotal: 0,
        discount: 0,
        tax: 0,
        totalPrice: agreedPrice,
        platformCommissionPercent: vendorCommission,
        metadata: { fromMobileWorkshopRequest: true, offerId: offer.id },
        services: {
          create: {
            mobileWorkshopServiceId: offer.mobileWorkshopServiceId || undefined,
            quantity: 1,
            unitPrice: agreedPrice,
            totalPrice: agreedPrice,
            estimatedMinutes: offer.estimatedMinutes ?? undefined,
          },
        },
      },
      include: {
        mobileWorkshop: { select: { id: true, name: true, nameAr: true, vendor: { select: { businessName: true, businessNameAr: true } } } },
        services: true,
      },
    });

    const invNum = `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber: invNum,
        bookingId: booking.id,
        customerId: booking.customerId,
        subtotal: agreedPrice,
        tax: 0,
        discount: 0,
        totalAmount: agreedPrice,
        paidAmount: 0,
        status: 'PENDING',
      },
    });
    await tx.invoiceLineItem.create({
      data: {
        invoiceId: invoice.id,
        description: offer.mobileWorkshopService?.name || `Mobile workshop - ${request.serviceType}`,
        descriptionAr: offer.mobileWorkshopService?.nameAr || `ورشة متنقلة - ${request.serviceType}`,
        itemType: 'SERVICE',
        quantity: 1,
        unitPrice: agreedPrice,
        totalPrice: agreedPrice,
      },
    });

    await tx.chatRoom.create({
      data: { bookingId: booking.id },
    });

    await tx.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: null,
        toStatus: 'TECHNICIAN_ASSIGNED',
        changedBy: customerId,
        reason: 'Customer selected mobile workshop offer',
      },
    });

    return { booking, invoice };
  });

  const { emitBookingReady } = require('../socket');
  try {
    emitBookingReady(result.booking.id, {
      customerId: result.booking.customerId,
      driverId: workshop.vendor.userId,
    });
  } catch (_) {}

  return {
    booking: {
      id: result.booking.id,
      bookingNumber: result.booking.bookingNumber,
      status: result.booking.status,
      mobileWorkshop: result.booking.mobileWorkshop,
      totalPrice: Number(result.booking.totalPrice),
    },
    invoice: {
      id: result.invoice.id,
      invoiceNumber: result.invoice.invoiceNumber,
      totalAmount: Number(result.invoice.totalAmount),
      status: result.invoice.status,
      message: 'Pay this invoice to open tracking and chat with the workshop.',
      messageAr: 'ادفع الفاتورة لفتح التتبع والمحادثة مع الورشة.',
    },
  };
}

module.exports = {
  createRequest,
  getMyRequests,
  getRequestById,
  getRequestsForMyWorkshop,
  submitOffer,
  selectOffer,
};

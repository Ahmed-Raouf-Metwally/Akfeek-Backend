const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');
const { calculateDistance } = require('../utils/towing');
const { listMobileWorkshopCatalog } = require('../constants/mobileWorkshopCatalog');

function normalizeLatLng(value, fieldName) {
  const num = Number(value);
  if (Number.isNaN(num)) throw new AppError(`${fieldName} must be a number`, 400, 'VALIDATION_ERROR');
  return num;
}

async function assertCustomerVehicle(customerId, vehicleId) {
  const vehicle = await prisma.userVehicle.findFirst({ where: { id: vehicleId, userId: customerId } });
  if (!vehicle) throw new AppError('Vehicle not found or not owned by customer', 404, 'NOT_FOUND');
  return vehicle;
}

async function findNearestAvailableWorkshop(lat, lng) {
  const workshops = await prisma.mobileWorkshop.findMany({
    where: {
      isActive: true,
      isAvailable: true,
      latitude: { not: null },
      longitude: { not: null },
      vendor: {
        is: {
          status: 'ACTIVE',
        },
      },
    },
    include: {
      vendor: { select: { userId: true, businessName: true, businessNameAr: true } },
      workshopType: { select: { id: true, name: true, nameAr: true, serviceType: true } },
    },
    take: 200,
  });

  const scored = workshops
    .map((w) => ({
      workshop: w,
      distanceKm: calculateDistance(lat, lng, w.latitude, w.longitude),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return scored[0] || null;
}

function normalizeScheduledDate(value) {
  const d = value instanceof Date ? value : new Date(String(value || ''));
  if (Number.isNaN(d.getTime())) throw new AppError('scheduledDate must be a valid date', 400, 'VALIDATION_ERROR');
  return d;
}

function normalizeScheduledTime(value) {
  const t = String(value || '').trim();
  // Accept "HH:mm" (24h)
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t)) {
    throw new AppError('scheduledTime must be in HH:mm format', 400, 'VALIDATION_ERROR');
  }
  return t;
}

function buildBookingSummaryResponse(booking, invoice, selectedMwService, distanceKm) {
  return {
    booking: {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      customerId: booking.customerId,
      technicianId: booking.technicianId,
      mobileWorkshopId: booking.mobileWorkshopId,
      scheduledDate: booking.scheduledDate,
      scheduledTime: booking.scheduledTime,
      pickupLat: booking.pickupLat,
      pickupLng: booking.pickupLng,
      pickupAddress: booking.pickupAddress,
      subtotal: booking.subtotal,
      totalPrice: booking.totalPrice,
      status: booking.status,
      createdAt: booking.createdAt,
      service: selectedMwService
        ? {
            id: selectedMwService.id,
            name: selectedMwService.name,
            nameAr: selectedMwService.nameAr,
            price: selectedMwService.priceMin ?? null,
            currency: selectedMwService.currency || 'SAR',
          }
        : null,
      assignment: {
        distanceKm,
      },
    },
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      bookingId: invoice.bookingId,
      subtotal: invoice.subtotal,
      totalAmount: invoice.totalAmount,
      status: invoice.status,
      issuedAt: invoice.issuedAt,
    },
  };
}

async function createBooking(customerId, payload) {
  const { serviceId, latitude, longitude, addressText, scheduledDate, scheduledTime } = payload || {};

  let selectedMwService = null;

  if (!serviceId) {
    throw new AppError('serviceId is required', 400, 'VALIDATION_ERROR');
  }

  selectedMwService = await prisma.mobileWorkshopCatalogService.findFirst({
    where: { id: serviceId, isActive: true },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          nameAr: true,
          catalogId: true,
        },
      },
    },
  });
  if (!selectedMwService) throw new AppError('Invalid serviceId', 400, 'VALIDATION_ERROR');

  const lat = normalizeLatLng(latitude, 'latitude');
  const lng = normalizeLatLng(longitude, 'longitude');
  const schedDate = normalizeScheduledDate(scheduledDate);
  const schedTime = normalizeScheduledTime(scheduledTime);

  const nearest = await findNearestAvailableWorkshop(lat, lng);
  if (!nearest) {
    throw new AppError('No available mobile workshop found nearby', 404, 'NO_WORKSHOP_AVAILABLE');
  }

  const workshop = nearest.workshop;
  const bookingNumber = `MW-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const subtotal = Number(selectedMwService?.priceMin ?? 0);
  const totalPrice = subtotal;
  const distanceKm = Math.round(nearest.distanceKm * 100) / 100;

  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({
      data: {
        bookingNumber,
        customerId,
        vehicleId: null,
        addressId: null,
        scheduledDate: schedDate,
        scheduledTime: schedTime,
        pickupLat: lat,
        pickupLng: lng,
        pickupAddress: addressText || null,
        mobileWorkshopId: workshop.id,
        technicianId: workshop.vendor?.userId || null,
        status: 'TECHNICIAN_ASSIGNED',
        subtotal,
        laborFee: 0,
        deliveryFee: 0,
        partsTotal: 0,
        discount: 0,
        tax: 0,
        totalPrice,
        notes: null,
        metadata: {
          source: 'MOBILE_WORKSHOP_SIMPLE',
          serviceId: selectedMwService?.id || null,
          assignment: {
            distanceKm,
            assignedAt: new Date().toISOString(),
          },
        },
        services: {
          create: {
            quantity: 1,
            unitPrice: subtotal,
            totalPrice,
          },
        },
      },
    });

    await tx.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: null,
        toStatus: 'TECHNICIAN_ASSIGNED',
        changedBy: customerId,
        reason: 'Mobile workshop booking created (auto-assigned)',
        metadata: {
          serviceId: selectedMwService?.id || null,
          mobileWorkshopId: workshop.id,
          distanceKm,
        },
      },
    });

    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        bookingId: booking.id,
        customerId,
        subtotal,
        tax: 0,
        discount: 0,
        totalAmount: totalPrice,
        paidAmount: 0,
        status: 'PENDING',
      },
    });

    const serviceName = selectedMwService?.name || 'Mobile workshop service';
    const serviceNameAr = selectedMwService?.nameAr || 'خدمة ورشة متنقلة';
    const serviceCurrency = selectedMwService?.currency || 'SAR';
    const descAr = selectedMwService?.pricingNoteAr
      ? `${serviceNameAr} (${selectedMwService.pricingNoteAr})`
      : `${serviceNameAr} (${subtotal} ${serviceCurrency})`;
    await tx.invoiceLineItem.create({
      data: {
        invoiceId: invoice.id,
        description: serviceName,
        descriptionAr: descAr,
        itemType: 'SERVICE',
        quantity: 1,
        unitPrice: subtotal,
        totalPrice,
      },
    });

    return buildBookingSummaryResponse(booking, invoice, selectedMwService, distanceKm);
  });

  return result;
}

async function getCatalog() {
  return listMobileWorkshopCatalog();
}

async function getBookingById(bookingId, customerId) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, customerId },
    include: {
      mobileWorkshop: {
        select: {
          id: true,
          name: true,
          nameAr: true,
          city: true,
          latitude: true,
          longitude: true,
          imageUrl: true,
          vendor: { select: { businessName: true, businessNameAr: true } },
          workshopType: { select: { id: true, name: true, nameAr: true, serviceType: true } },
        },
      },
      vehicle: { select: { id: true, plateDigits: true, plateLettersEn: true } },
      statusHistory: { orderBy: { timestamp: 'desc' }, take: 20 },
    },
  });
  if (!booking) throw new AppError('Booking not found', 404, 'NOT_FOUND');
  return booking;
}

module.exports = {
  getCatalog,
  createBooking,
  getBookingById,
};


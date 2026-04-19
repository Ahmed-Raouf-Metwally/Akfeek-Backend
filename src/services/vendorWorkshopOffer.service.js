const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');
const logger = require('../utils/logger/logger');

async function getMyCertifiedWorkshopOrThrow(vendorUserId) {
  const workshop = await prisma.certifiedWorkshop.findFirst({
    where: { vendor: { userId: vendorUserId } },
    select: { id: true, vendorId: true, name: true, isActive: true, isVerified: true },
  });
  if (!workshop) {
    throw new AppError('No certified workshop linked to your vendor account', 404, 'WORKSHOP_NOT_FOUND');
  }
  return workshop;
}

function parseVehicleModelIds(raw) {
  if (raw === undefined || raw === null) return null;
  if (Array.isArray(raw)) {
    const ids = raw.map((x) => String(x).trim()).filter(Boolean);
    return ids.length ? ids : null;
  }
  return null;
}

function assertOfferPayload(data, { partial = false } = {}) {
  const {
    offerType,
    title,
    validUntil,
    discountScope,
    discountPercent,
    certifiedWorkshopServiceId,
    paidSlots,
    bonusSlots,
    bundlePrice,
    validityDays,
  } = data;

  if (!partial && (!title || String(title).trim() === '')) {
    throw new AppError('title is required', 400, 'VALIDATION_ERROR');
  }
  if (!partial && !validUntil) {
    throw new AppError('validUntil is required', 400, 'VALIDATION_ERROR');
  }
  if (!partial && !offerType) {
    throw new AppError('offerType is required', 400, 'VALIDATION_ERROR');
  }

  const type = offerType ? String(offerType).toUpperCase() : null;
  if (type && !['PERCENT_DISCOUNT', 'PREPAID_BUNDLE'].includes(type)) {
    throw new AppError('offerType must be PERCENT_DISCOUNT or PREPAID_BUNDLE', 400, 'VALIDATION_ERROR');
  }

  if (type === 'PERCENT_DISCOUNT' || (!partial && data.offerType === 'PERCENT_DISCOUNT')) {
    const scope = discountScope ? String(discountScope).toUpperCase() : null;
    if (!partial && !scope) {
      throw new AppError('discountScope is required for PERCENT_DISCOUNT', 400, 'VALIDATION_ERROR');
    }
    if (scope && !['ALL_SERVICES', 'ONE_SERVICE'].includes(scope)) {
      throw new AppError('discountScope must be ALL_SERVICES or ONE_SERVICE', 400, 'VALIDATION_ERROR');
    }
    const d = discountPercent !== undefined && discountPercent !== null ? Number(discountPercent) : null;
    if (!partial && (d === null || Number.isNaN(d) || d < 1 || d > 100)) {
      throw new AppError('discountPercent must be between 1 and 100', 400, 'VALIDATION_ERROR');
    }
    if (scope === 'ONE_SERVICE' && !partial) {
      if (!certifiedWorkshopServiceId) {
        throw new AppError('certifiedWorkshopServiceId is required when discountScope is ONE_SERVICE', 400, 'VALIDATION_ERROR');
      }
    }
    if (scope === 'ALL_SERVICES' && certifiedWorkshopServiceId && !partial) {
      throw new AppError('certifiedWorkshopServiceId must be empty when discountScope is ALL_SERVICES', 400, 'VALIDATION_ERROR');
    }
  }

  if (type === 'PREPAID_BUNDLE' || (!partial && data.offerType === 'PREPAID_BUNDLE')) {
    const p = paidSlots !== undefined && paidSlots !== null ? Number(paidSlots) : null;
    const b = bonusSlots !== undefined && bonusSlots !== null ? Number(bonusSlots) : null;
    if (!partial && (p === null || Number.isNaN(p) || p < 1)) {
      throw new AppError('paidSlots must be >= 1 for PREPAID_BUNDLE', 400, 'VALIDATION_ERROR');
    }
    if (!partial && (b === null || Number.isNaN(b) || b < 1)) {
      throw new AppError('bonusSlots must be >= 1 for PREPAID_BUNDLE', 400, 'VALIDATION_ERROR');
    }
    if (!partial && (bundlePrice === undefined || bundlePrice === null || Number(bundlePrice) <= 0)) {
      throw new AppError('bundlePrice is required for PREPAID_BUNDLE', 400, 'VALIDATION_ERROR');
    }
    const vd = validityDays !== undefined && validityDays !== null ? Number(validityDays) : null;
    if (!partial && (vd === null || Number.isNaN(vd) || vd < 1)) {
      throw new AppError('validityDays must be >= 1 for PREPAID_BUNDLE', 400, 'VALIDATION_ERROR');
    }
    if (!partial && !certifiedWorkshopServiceId) {
      throw new AppError('certifiedWorkshopServiceId is required for PREPAID_BUNDLE', 400, 'VALIDATION_ERROR');
    }
  }
}

async function assertServiceBelongsToWorkshop(workshopId, certifiedWorkshopServiceId) {
  const ws = await prisma.certifiedWorkshopService.findFirst({
    where: { id: certifiedWorkshopServiceId, workshopId, isActive: true },
    select: { id: true },
  });
  if (!ws) {
    throw new AppError('Workshop service not found for this workshop', 404, 'SERVICE_NOT_FOUND');
  }
}

async function listPublicOffers(workshopId, { vehicleModelId } = {}) {
  const workshop = await prisma.certifiedWorkshop.findFirst({
    where: { id: workshopId, isActive: true, isVerified: true },
    select: { id: true },
  });
  if (!workshop) {
    throw new AppError('Workshop not found', 404, 'NOT_FOUND');
  }

  const now = new Date();
  const offers = await prisma.vendorWorkshopOffer.findMany({
    where: {
      workshopId,
      isActive: true,
      validFrom: { lte: now },
      validUntil: { gte: now },
    },
    include: {
      certifiedWorkshopService: {
        select: { id: true, name: true, nameAr: true, price: true, serviceType: true },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  if (!vehicleModelId) {
    return offers;
  }

  return offers.filter((o) => {
    const ids = parseVehicleModelIds(o.vehicleModelIds);
    if (!ids || ids.length === 0) return true;
    return ids.includes(String(vehicleModelId));
  });
}

async function listMyOffers(vendorUserId) {
  const w = await getMyCertifiedWorkshopOrThrow(vendorUserId);
  return prisma.vendorWorkshopOffer.findMany({
    where: { workshopId: w.id },
    include: {
      certifiedWorkshopService: {
        select: { id: true, name: true, nameAr: true, price: true },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
}

async function createOffer(vendorUserId, body) {
  assertOfferPayload(body, { partial: false });
  const workshop = await getMyCertifiedWorkshopOrThrow(vendorUserId);
  if (!workshop.isActive || !workshop.isVerified) {
    throw new AppError('Workshop must be active and verified', 400, 'WORKSHOP_NOT_AVAILABLE');
  }

  const {
    offerType,
    title,
    titleAr,
    description,
    descriptionAr,
    validFrom,
    validUntil,
    isActive = true,
    sortOrder = 0,
    vehicleModelIds,
    discountScope,
    discountPercent,
    certifiedWorkshopServiceId,
    paidSlots,
    bonusSlots,
    bundlePrice,
    validityDays,
  } = body;

  if (certifiedWorkshopServiceId) {
    await assertServiceBelongsToWorkshop(workshop.id, certifiedWorkshopServiceId);
  }

  const type = String(offerType).toUpperCase();
  const data = {
    workshopId: workshop.id,
    offerType: type,
    title: String(title).trim(),
    titleAr: titleAr ? String(titleAr).trim() : null,
    description: description || null,
    descriptionAr: descriptionAr || null,
    validFrom: validFrom ? new Date(validFrom) : new Date(),
    validUntil: new Date(validUntil),
    isActive: !!isActive,
    sortOrder: Number(sortOrder) || 0,
    vehicleModelIds:
      vehicleModelIds !== undefined && Array.isArray(vehicleModelIds) && vehicleModelIds.length
        ? vehicleModelIds
        : null,
    discountScope: null,
    discountPercent: null,
    certifiedWorkshopServiceId: null,
    paidSlots: null,
    bonusSlots: null,
    bundlePrice: null,
    validityDays: null,
  };

  if (type === 'PERCENT_DISCOUNT') {
    data.discountScope = String(discountScope).toUpperCase();
    data.discountPercent = Number(discountPercent);
    if (data.discountScope === 'ONE_SERVICE') {
      data.certifiedWorkshopServiceId = certifiedWorkshopServiceId;
    }
  } else {
    data.paidSlots = Number(paidSlots);
    data.bonusSlots = Number(bonusSlots);
    data.bundlePrice = bundlePrice;
    data.validityDays = Number(validityDays);
    data.certifiedWorkshopServiceId = certifiedWorkshopServiceId;
  }

  const created = await prisma.vendorWorkshopOffer.create({
    data,
    include: {
      certifiedWorkshopService: {
        select: { id: true, name: true, nameAr: true, price: true },
      },
    },
  });
  logger.info(`VendorWorkshopOffer created ${created.id} for workshop ${workshop.id}`);
  return created;
}

async function updateOffer(vendorUserId, offerId, body) {
  const workshop = await getMyCertifiedWorkshopOrThrow(vendorUserId);
  const existing = await prisma.vendorWorkshopOffer.findFirst({
    where: { id: offerId, workshopId: workshop.id },
  });
  if (!existing) {
    throw new AppError('Offer not found', 404, 'NOT_FOUND');
  }

  const merged = {
    offerType: body.offerType !== undefined ? body.offerType : existing.offerType,
    title: body.title !== undefined ? body.title : existing.title,
    validUntil: body.validUntil !== undefined ? body.validUntil : existing.validUntil,
    discountScope: body.discountScope !== undefined ? body.discountScope : existing.discountScope,
    discountPercent: body.discountPercent !== undefined ? body.discountPercent : existing.discountPercent,
    certifiedWorkshopServiceId:
      body.certifiedWorkshopServiceId !== undefined ? body.certifiedWorkshopServiceId : existing.certifiedWorkshopServiceId,
    paidSlots: body.paidSlots !== undefined ? body.paidSlots : existing.paidSlots,
    bonusSlots: body.bonusSlots !== undefined ? body.bonusSlots : existing.bonusSlots,
    bundlePrice: body.bundlePrice !== undefined ? body.bundlePrice : existing.bundlePrice,
    validityDays: body.validityDays !== undefined ? body.validityDays : existing.validityDays,
  };
  const forAssert = {
    ...existing,
    ...merged,
    offerType: merged.offerType,
    discountPercent: merged.discountPercent != null ? Number(merged.discountPercent) : null,
    bundlePrice: merged.bundlePrice != null ? Number(merged.bundlePrice) : null,
    paidSlots: merged.paidSlots != null ? Number(merged.paidSlots) : null,
    bonusSlots: merged.bonusSlots != null ? Number(merged.bonusSlots) : null,
    validityDays: merged.validityDays != null ? Number(merged.validityDays) : null,
  };
  assertOfferPayload(forAssert, { partial: false });

  const nextCws = body.certifiedWorkshopServiceId !== undefined ? body.certifiedWorkshopServiceId : existing.certifiedWorkshopServiceId;
  if (nextCws) {
    await assertServiceBelongsToWorkshop(workshop.id, nextCws);
  }

  const updated = await prisma.vendorWorkshopOffer.update({
    where: { id: offerId },
    data: {
      ...(body.title !== undefined && { title: String(body.title).trim() }),
      ...(body.titleAr !== undefined && { titleAr: body.titleAr ? String(body.titleAr).trim() : null }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.descriptionAr !== undefined && { descriptionAr: body.descriptionAr || null }),
      ...(body.validFrom !== undefined && { validFrom: new Date(body.validFrom) }),
      ...(body.validUntil !== undefined && { validUntil: new Date(body.validUntil) }),
      ...(body.isActive !== undefined && { isActive: !!body.isActive }),
      ...(body.sortOrder !== undefined && { sortOrder: Number(body.sortOrder) || 0 }),
      ...(body.vehicleModelIds !== undefined && {
        vehicleModelIds: Array.isArray(body.vehicleModelIds) && body.vehicleModelIds.length ? body.vehicleModelIds : null,
      }),
      ...(body.offerType !== undefined && { offerType: String(body.offerType).toUpperCase() }),
      ...(body.discountScope !== undefined && { discountScope: String(body.discountScope).toUpperCase() }),
      ...(body.discountPercent !== undefined && { discountPercent: body.discountPercent === null ? null : Number(body.discountPercent) }),
      ...(body.certifiedWorkshopServiceId !== undefined && {
        certifiedWorkshopServiceId: body.certifiedWorkshopServiceId || null,
      }),
      ...(body.paidSlots !== undefined && { paidSlots: body.paidSlots === null ? null : Number(body.paidSlots) }),
      ...(body.bonusSlots !== undefined && { bonusSlots: body.bonusSlots === null ? null : Number(body.bonusSlots) }),
      ...(body.bundlePrice !== undefined && { bundlePrice: body.bundlePrice === null ? null : body.bundlePrice }),
      ...(body.validityDays !== undefined && { validityDays: body.validityDays === null ? null : Number(body.validityDays) }),
    },
    include: {
      certifiedWorkshopService: {
        select: { id: true, name: true, nameAr: true, price: true },
      },
    },
  });
  return updated;
}

async function deleteOffer(vendorUserId, offerId) {
  const workshop = await getMyCertifiedWorkshopOrThrow(vendorUserId);
  const existing = await prisma.vendorWorkshopOffer.findFirst({
    where: { id: offerId, workshopId: workshop.id },
  });
  if (!existing) {
    throw new AppError('Offer not found', 404, 'NOT_FOUND');
  }
  await prisma.vendorWorkshopOffer.delete({ where: { id: offerId } });
  return { deleted: true, id: offerId };
}

/**
 * Load offer for booking-time validation (percent or bundle rules).
 */
async function getActiveOfferForWorkshopOrThrow(offerId, workshopId) {
  const now = new Date();
  const offer = await prisma.vendorWorkshopOffer.findFirst({
    where: {
      id: offerId,
      workshopId,
      isActive: true,
      validFrom: { lte: now },
      validUntil: { gte: now },
    },
    include: { certifiedWorkshopService: true },
  });
  if (!offer) {
    throw new AppError('Offer not found or not active', 404, 'OFFER_NOT_FOUND');
  }
  return offer;
}

async function getActivePurchaseForUserOrThrow(purchaseId, userId) {
  const purchase = await prisma.userWorkshopOfferPurchase.findFirst({
    where: { id: purchaseId, userId },
    include: {
      offer: {
        include: {
          certifiedWorkshopService: {
            select: { id: true, workshopId: true, name: true, nameAr: true, price: true },
          },
        },
      },
    },
  });
  if (!purchase) {
    throw new AppError('Purchase not found', 404, 'NOT_FOUND');
  }
  if (purchase.status !== 'ACTIVE') {
    throw new AppError('Purchase is not active', 400, 'PURCHASE_NOT_ACTIVE');
  }
  if (new Date(purchase.expiresAt) < new Date()) {
    throw new AppError('Purchase has expired', 400, 'PURCHASE_EXPIRED');
  }
  const remaining = purchase.totalSlots - purchase.usedSlots;
  if (remaining <= 0) {
    throw new AppError('No remaining uses on this purchase', 400, 'PURCHASE_DEPLETED');
  }
  return purchase;
}

/**
 * After invoice is fully paid: activate prepaid bundle purchase if linked.
 */
async function activateWorkshopOfferPurchaseAfterInvoicePaid(tx, invoiceId) {
  const purchase = await tx.userWorkshopOfferPurchase.findFirst({
    where: { invoiceId, status: 'PENDING_PAYMENT' },
  });
  if (!purchase) return null;
  await tx.userWorkshopOfferPurchase.update({
    where: { id: purchase.id },
    data: { status: 'ACTIVE' },
  });
  logger.info(`UserWorkshopOfferPurchase ${purchase.id} activated after invoice ${invoiceId}`);
  return purchase.id;
}

/**
 * Customer buys PREPAID_BUNDLE: creates booking (payment shell) + invoice + purchase PENDING_PAYMENT.
 */
async function purchaseBundle(userId, workshopId, offerId, { scheduledDate, vehicleId, addressId, notes } = {}) {
  if (vehicleId) {
    const v = await prisma.userVehicle.findFirst({ where: { id: vehicleId, userId } });
    if (!v) throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
  }
  if (addressId) {
    const a = await prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!a) throw new AppError('Address not found', 404, 'NOT_FOUND');
  }

  const offer = await getActiveOfferForWorkshopOrThrow(offerId, workshopId);
  if (offer.offerType !== 'PREPAID_BUNDLE') {
    throw new AppError('This endpoint is only for PREPAID_BUNDLE offers', 400, 'VALIDATION_ERROR');
  }

  const ws = offer.certifiedWorkshopServiceId
    ? await prisma.certifiedWorkshopService.findFirst({
        where: { id: offer.certifiedWorkshopServiceId, workshopId, isActive: true },
      })
    : null;
  if (!ws) {
    throw new AppError('Bundle target service not found', 404, 'SERVICE_NOT_FOUND');
  }

  const bundlePrice = Number(offer.bundlePrice);
  const totalSlots = (offer.paidSlots || 0) + (offer.bonusSlots || 0);
  const validityDays = offer.validityDays || 30;

  const sched = scheduledDate ? new Date(scheduledDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  const bookingNumber = `BKG-BND-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + validityDays);

  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({
      data: {
        bookingNumber,
        customer: { connect: { id: userId } },
        ...(vehicleId ? { vehicle: { connect: { id: vehicleId } } } : {}),
        ...(addressId ? { address: { connect: { id: addressId } } } : {}),
        scheduledDate: sched,
        scheduledTime: null,
        workshop: { connect: { id: workshopId } },
        deliveryMethod: 'SELF_DELIVERY',
        status: 'PENDING',
        subtotal: bundlePrice,
        laborFee: 0,
        deliveryFee: 0,
        partsTotal: 0,
        discount: 0,
        tax: 0,
        totalPrice: bundlePrice,
        notes: notes || null,
        metadata: {
          workshopBundlePurchase: true,
          vendorWorkshopOfferId: offer.id,
        },
        services: {
          create: [
            {
              workshopService: { connect: { id: ws.id } },
              quantity: 1,
              unitPrice: bundlePrice,
              totalPrice: bundlePrice,
              estimatedMinutes: ws.estimatedDuration != null ? Number(ws.estimatedDuration) : null,
            },
          ],
        },
      },
      include: { services: true },
    });

    const invNum = `INV-BND-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber: invNum,
        bookingId: booking.id,
        customerId: userId,
        subtotal: bundlePrice,
        tax: 0,
        discount: 0,
        totalAmount: bundlePrice,
        paidAmount: 0,
        status: 'PENDING',
      },
    });

    await tx.invoiceLineItem.create({
      data: {
        invoiceId: invoice.id,
        description: `Workshop bundle: ${offer.title}`,
        descriptionAr: `باقة ورشة: ${offer.titleAr || offer.title}`,
        itemType: 'SERVICE',
        quantity: 1,
        unitPrice: bundlePrice,
        totalPrice: bundlePrice,
      },
    });

    const purchase = await tx.userWorkshopOfferPurchase.create({
      data: {
        userId,
        offerId: offer.id,
        workshopId,
        totalSlots,
        usedSlots: 0,
        expiresAt,
        status: 'PENDING_PAYMENT',
        purchaseBookingId: booking.id,
        invoiceId: invoice.id,
      },
      include: { offer: true },
    });

    await tx.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: null,
        toStatus: 'PENDING',
        changedBy: userId,
        reason: 'Workshop bundle purchase',
      },
    });

    return { booking, invoice, purchase };
  });

  return result;
}

/**
 * Adjust workshop booking lines for percent offer and/or prepaid bundle consumption.
 * Mutates each line object (unitPrice, totalPrice, workshopOfferPurchaseId).
 * Returns { discountTotal, appliedVendorWorkshopOfferId, purchaseToConsumeId }.
 * purchaseToConsumeId: caller must increment usedSlots in same transaction as booking create.
 */
async function prepareWorkshopBookingLines(bookingServiceData, {
  workshopId,
  vendorWorkshopOfferId,
  userWorkshopOfferPurchaseId,
  customerId,
}) {
  let discountTotal = 0;
  let appliedVendorWorkshopOfferId = null;
  let purchaseToConsumeId = null;

  if (vendorWorkshopOfferId && userWorkshopOfferPurchaseId) {
    throw new AppError('Use either vendorWorkshopOfferId or userWorkshopOfferPurchaseId, not both', 400, 'VALIDATION_ERROR');
  }

  if (vendorWorkshopOfferId) {
    const offer = await getActiveOfferForWorkshopOrThrow(vendorWorkshopOfferId, workshopId);
    if (offer.offerType !== 'PERCENT_DISCOUNT') {
      throw new AppError('vendorWorkshopOfferId must reference a PERCENT_DISCOUNT offer', 400, 'VALIDATION_ERROR');
    }
    const pct = Number(offer.discountPercent) / 100;
    for (const line of bookingServiceData) {
      if (!line.workshopServiceId) continue;
      let apply = false;
      if (offer.discountScope === 'ALL_SERVICES') {
        apply = true;
      } else if (offer.discountScope === 'ONE_SERVICE' && offer.certifiedWorkshopServiceId === line.workshopServiceId) {
        apply = true;
      }
      if (!apply) continue;
      const orig = Number(line.unitPrice);
      const newUnit = Math.round(orig * (1 - pct) * 100) / 100;
      const newTot = Math.round(newUnit * Number(line.quantity || 1) * 100) / 100;
      discountTotal += Math.round((orig * Number(line.quantity || 1) - newTot) * 100) / 100;
      line.unitPrice = newUnit;
      line.totalPrice = newTot;
    }
    appliedVendorWorkshopOfferId = offer.id;
  }

  if (userWorkshopOfferPurchaseId) {
    const purchase = await getActivePurchaseForUserOrThrow(userWorkshopOfferPurchaseId, customerId);
    if (purchase.workshopId !== workshopId) {
      throw new AppError('Purchase does not belong to this workshop', 400, 'VALIDATION_ERROR');
    }
    const targetId = purchase.offer.certifiedWorkshopServiceId;
    if (!targetId) {
      throw new AppError('Invalid bundle offer configuration', 400, 'VALIDATION_ERROR');
    }
    let consumed = false;
    for (const line of bookingServiceData) {
      if (line.workshopServiceId === targetId && !consumed) {
        const orig = Number(line.unitPrice) * Number(line.quantity || 1);
        discountTotal += orig;
        line.unitPrice = 0;
        line.totalPrice = 0;
        line.workshopOfferPurchaseId = purchase.id;
        consumed = true;
        purchaseToConsumeId = purchase.id;
        break;
      }
    }
    if (!consumed) {
      throw new AppError(
        'Booking must include the workshop service covered by this bundle purchase',
        400,
        'BUNDLE_SERVICE_MISSING'
      );
    }
  }

  return { discountTotal, appliedVendorWorkshopOfferId, purchaseToConsumeId };
}

module.exports = {
  getMyCertifiedWorkshopOrThrow,
  listPublicOffers,
  listMyOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  getActiveOfferForWorkshopOrThrow,
  getActivePurchaseForUserOrThrow,
  activateWorkshopOfferPurchaseAfterInvoicePaid,
  purchaseBundle,
  parseVehicleModelIds,
  prepareWorkshopBookingLines,
};

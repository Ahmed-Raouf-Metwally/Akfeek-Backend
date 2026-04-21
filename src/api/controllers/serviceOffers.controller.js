const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

const VALID_TARGET_TYPES = ['SERVICE', 'CERTIFIED_WORKSHOP_SERVICE', 'MOBILE_WORKSHOP_SERVICE'];

function normalizeTargetType(v) {
  const t = String(v || '').trim().toUpperCase();
  return VALID_TARGET_TYPES.includes(t) ? t : null;
}

async function buildTargetDetails(row) {
  const percent = Number(row.discountPercent || 0);
  const factor = 1 - percent / 100;

  if (row.targetType === 'SERVICE') {
    const service = await prisma.service.findFirst({
      where: { id: row.targetId, isActive: true },
      select: { id: true, name: true, nameAr: true, description: true, descriptionAr: true },
    });

    if (!service) return null;

    const pricing = await prisma.servicePricing.findMany({
      where: { serviceId: service.id, isActive: true },
      orderBy: [{ vehicleType: 'asc' }],
      select: { vehicleType: true, basePrice: true, discountedPrice: true },
    });

    const priceByVehicleType = pricing.map((p) => {
      const base = Number(p.basePrice);
      const current = Number(p.discountedPrice ?? p.basePrice);
      const after = Math.round(current * factor * 100) / 100;
      return { vehicleType: p.vehicleType, wasPrice: base, currentPrice: current, offerPrice: after, currency: 'SAR' };
    });

    const offerPrices = priceByVehicleType.map((x) => x.offerPrice).filter(Number.isFinite);
    const currentPrices = priceByVehicleType.map((x) => x.currentPrice).filter(Number.isFinite);
    const wasPrices = priceByVehicleType.map((x) => x.wasPrice).filter(Number.isFinite);
    const range = (arr) => (arr.length ? { min: Math.min(...arr), max: Math.max(...arr) } : null);

    return {
      type: 'SERVICE',
      id: service.id,
      name: service.name,
      nameAr: service.nameAr,
      description: service.description,
      descriptionAr: service.descriptionAr,
      currency: 'SAR',
      wasPriceRange: range(wasPrices),
      currentPriceRange: range(currentPrices),
      offerPriceRange: range(offerPrices),
      priceByVehicleType,
    };
  }

  if (row.targetType === 'CERTIFIED_WORKSHOP_SERVICE') {
    const ws = await prisma.certifiedWorkshopService.findFirst({
      where: { id: row.targetId, isActive: true },
      select: { id: true, name: true, nameAr: true, description: true, price: true, currency: true, workshop: { select: { id: true } } },
    });
    if (!ws) return null;
    const current = Number(ws.price);
    const after = Math.round(current * factor * 100) / 100;
    return {
      type: 'CERTIFIED_WORKSHOP_SERVICE',
      id: ws.id,
      name: ws.name,
      nameAr: ws.nameAr,
      description: ws.description,
      currency: ws.currency || 'SAR',
      wasPrice: current,
      currentPrice: current,
      offerPrice: after,
      workshopId: ws.workshop?.id || null,
    };
  }

  if (row.targetType === 'MOBILE_WORKSHOP_SERVICE') {
    const ms = await prisma.mobileWorkshopService.findFirst({
      where: { id: row.targetId, isActive: true },
      select: { id: true, name: true, nameAr: true, description: true, price: true, currency: true, mobileWorkshop: { select: { id: true } } },
    });
    if (!ms) return null;
    const current = Number(ms.price);
    const after = Math.round(current * factor * 100) / 100;
    return {
      type: 'MOBILE_WORKSHOP_SERVICE',
      id: ms.id,
      name: ms.name,
      nameAr: ms.nameAr,
      description: ms.description,
      currency: ms.currency || 'SAR',
      wasPrice: current,
      currentPrice: current,
      offerPrice: after,
      mobileWorkshopId: ms.mobileWorkshop?.id || null,
    };
  }

  return null;
}

// GET /api/service-offers?vendorId=&targetType=&targetId=
// Returns only currently active & valid offers (for customers)
async function listPublic(req, res, next) {
  try {
    const { vendorId, targetType, targetId } = req.query;
    const tt = targetType ? normalizeTargetType(targetType) : null;
    if (targetType && !tt) throw new AppError('Invalid targetType', 400, 'VALIDATION_ERROR');

    const now = new Date();

    const where = {
      isActive: true,
      validFrom: { lte: now },
      validUntil: { gte: now },
      ...(vendorId ? { vendorId: String(vendorId) } : {}),
      ...(tt ? { targetType: tt } : {}),
      ...(targetId ? { targetId: String(targetId) } : {}),
    };

    const rows = await prisma.vendorServiceOffer.findMany({
      where,
      orderBy: [{ discountPercent: 'desc' }, { createdAt: 'desc' }],
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            businessNameAr: true,
            vendorType: true,
          },
        },
      },
    });

    const data = await Promise.all(
      rows.map(async (row) => ({ ...row, targetDetails: await buildTargetDetails(row) }))
    );

    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

// GET /api/service-offers/:id
// Returns offer details only if currently active & valid (for customers)
async function getPublicById(req, res, next) {
  try {
    const { id } = req.params;
    const now = new Date();

    const row = await prisma.vendorServiceOffer.findFirst({
      where: {
        id: String(id),
        isActive: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            businessNameAr: true,
            vendorType: true,
          },
        },
      },
    });

    if (!row) throw new AppError('Offer not found', 404, 'NOT_FOUND');

    const targetDetails = await buildTargetDetails(row);

    res.json({ success: true, data: { ...row, targetDetails } });
  } catch (e) {
    next(e);
  }
}

module.exports = { listPublic, getPublicById };

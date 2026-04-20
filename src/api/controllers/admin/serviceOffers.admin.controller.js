const prisma = require('../../../utils/database/prisma');
const { AppError } = require('../../middlewares/error.middleware');

function normalizeTargetType(v) {
  const t = String(v || '').trim().toUpperCase();
  if (!t) return null;
  if (!['SERVICE', 'CERTIFIED_WORKSHOP_SERVICE', 'MOBILE_WORKSHOP_SERVICE'].includes(t)) return null;
  return t;
}

async function assertTargetBelongsToVendor({ vendorId, targetType, targetId }) {
  if (targetType === 'SERVICE') {
    const svc = await prisma.service.findFirst({ where: { id: targetId, vendorId }, select: { id: true } });
    if (!svc) throw new AppError('Service not found for this vendor', 404, 'NOT_FOUND');
    return;
  }
  if (targetType === 'CERTIFIED_WORKSHOP_SERVICE') {
    const row = await prisma.certifiedWorkshopService.findFirst({
      where: { id: targetId, workshop: { vendorId } },
      select: { id: true },
    });
    if (!row) throw new AppError('Workshop service not found for this vendor', 404, 'NOT_FOUND');
    return;
  }
  if (targetType === 'MOBILE_WORKSHOP_SERVICE') {
    const row = await prisma.mobileWorkshopService.findFirst({
      where: { id: targetId, mobileWorkshop: { vendorId } },
      select: { id: true },
    });
    if (!row) throw new AppError('Mobile workshop service not found for this vendor', 404, 'NOT_FOUND');
  }
}

// GET /api/admin/service-offers?vendorId=&targetType=&isActive=
async function list(req, res, next) {
  try {
    const { vendorId, isActive, targetType } = req.query;
    const tt = targetType ? normalizeTargetType(targetType) : null;
    if (targetType && !tt) throw new AppError('Invalid targetType', 400, 'VALIDATION_ERROR');

    const where = {
      ...(vendorId ? { vendorId: String(vendorId) } : {}),
      ...(tt ? { targetType: tt } : {}),
      ...(isActive !== undefined ? { isActive: isActive === 'true' || isActive === true } : {}),
    };

    const rows = await prisma.vendorServiceOffer.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        vendor: { select: { id: true, businessName: true, businessNameAr: true, vendorType: true } },
      },
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
}

// POST /api/admin/service-offers
async function create(req, res, next) {
  try {
    const { vendorId, targetType, targetId, discountPercent, validFrom, validUntil, isActive, title, titleAr } = req.body || {};
    if (!vendorId) throw new AppError('vendorId is required', 400, 'VALIDATION_ERROR');
    const tt = normalizeTargetType(targetType);
    if (!tt) throw new AppError('targetType is required', 400, 'VALIDATION_ERROR');
    if (!targetId) throw new AppError('targetId is required', 400, 'VALIDATION_ERROR');
    const d = Number(discountPercent);
    if (Number.isNaN(d) || d < 1 || d > 100) throw new AppError('discountPercent must be 1..100', 400, 'VALIDATION_ERROR');
    if (!validUntil) throw new AppError('validUntil is required', 400, 'VALIDATION_ERROR');

    const vendor = await prisma.vendorProfile.findUnique({
      where: { id: String(vendorId) },
      select: { id: true },
    });
    if (!vendor) throw new AppError('Vendor not found', 404, 'NOT_FOUND');

    await assertTargetBelongsToVendor({ vendorId: String(vendorId), targetType: tt, targetId: String(targetId) });

    const row = await prisma.vendorServiceOffer.create({
      data: {
        vendorId: String(vendorId),
        targetType: tt,
        targetId: String(targetId),
        discountPercent: Math.round(d),
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: new Date(validUntil),
        isActive: isActive === undefined ? true : Boolean(isActive),
        title: title != null ? String(title) : null,
        titleAr: titleAr != null ? String(titleAr) : null,
      },
    });

    res.status(201).json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
}

// DELETE /api/admin/service-offers/:id
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.vendorServiceOffer.findUnique({ where: { id } });
    if (!existing) throw new AppError('Offer not found', 404, 'NOT_FOUND');
    await prisma.vendorServiceOffer.delete({ where: { id } });
    res.json({ success: true, data: { deleted: true } });
  } catch (e) {
    next(e);
  }
}

module.exports = { list, create, remove };


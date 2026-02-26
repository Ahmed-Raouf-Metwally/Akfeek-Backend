const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');

/**
 * Vendor Coupon Service
 * كوبونات الفيندور — كل فيندور يضيف كوبوناته وتطبق على خدماته فقط
 */

/**
 * Get vendor profile id by user id (for VENDOR role)
 */
async function getVendorIdByUserId(userId) {
  const v = await prisma.vendorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!v) throw new AppError('Vendor profile not found', 404, 'VENDOR_NOT_FOUND');
  return v.id;
}

/**
 * List coupons for a vendor (by vendor profile id)
 */
async function listByVendorId(vendorId, options = {}) {
  const { isActive } = options;
  const where = { vendorId };
  if (isActive !== undefined) where.isActive = isActive === true || isActive === 'true';

  return prisma.vendorCoupon.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Create coupon (vendor can only create for self)
 */
async function create(vendorId, data) {
  const {
    code,
    discountType,
    discountValue,
    minOrderAmount,
    validFrom,
    validUntil,
    maxUses,
  } = data;

  if (!code || typeof code !== 'string' || !code.trim()) {
    throw new AppError('Coupon code is required', 400, 'VALIDATION_ERROR');
  }
  const codeNorm = code.trim().toUpperCase();
  if (!['PERCENT', 'FIXED'].includes(discountType)) {
    throw new AppError('discountType must be PERCENT or FIXED', 400, 'VALIDATION_ERROR');
  }
  const value = Number(discountValue);
  if (Number.isNaN(value) || value < 0) {
    throw new AppError('Invalid discountValue', 400, 'VALIDATION_ERROR');
  }
  if (discountType === 'PERCENT' && value > 100) {
    throw new AppError('Percent discount cannot exceed 100', 400, 'VALIDATION_ERROR');
  }

  const validFromDate = validFrom ? new Date(validFrom) : new Date();
  const validUntilDate = validUntil ? new Date(validUntil) : null;
  if (!validUntilDate || validUntilDate <= validFromDate) {
    throw new AppError('validUntil must be after validFrom', 400, 'VALIDATION_ERROR');
  }

  const existing = await prisma.vendorCoupon.findUnique({
    where: { vendorId_code: { vendorId, code: codeNorm } },
  });
  if (existing) {
    throw new AppError('Coupon code already exists for your account', 409, 'ALREADY_EXISTS');
  }

  return prisma.vendorCoupon.create({
    data: {
      vendorId,
      code: codeNorm,
      discountType,
      discountValue: value,
      minOrderAmount: minOrderAmount != null ? Number(minOrderAmount) : null,
      validFrom: validFromDate,
      validUntil: validUntilDate,
      maxUses: maxUses != null ? Math.max(0, parseInt(maxUses, 10)) : null,
    },
  });
}

/**
 * Update coupon (vendor can only update own)
 */
async function update(couponId, vendorId, data) {
  const coupon = await prisma.vendorCoupon.findUnique({
    where: { id: couponId },
  });
  if (!coupon) throw new AppError('Coupon not found', 404, 'NOT_FOUND');
  if (coupon.vendorId !== vendorId) {
    throw new AppError('You can only update your own coupons', 403, 'FORBIDDEN');
  }

  const {
    code,
    discountType,
    discountValue,
    minOrderAmount,
    validFrom,
    validUntil,
    maxUses,
    isActive,
  } = data;

  const updateData = {};
  if (code !== undefined) {
    const codeNorm = String(code).trim().toUpperCase();
    if (!codeNorm) throw new AppError('Code cannot be empty', 400, 'VALIDATION_ERROR');
    const existing = await prisma.vendorCoupon.findFirst({
      where: {
        vendorId,
        code: codeNorm,
        id: { not: couponId },
      },
    });
    if (existing) throw new AppError('Coupon code already exists for your account', 409, 'ALREADY_EXISTS');
    updateData.code = codeNorm;
  }
  if (discountType !== undefined) {
    if (!['PERCENT', 'FIXED'].includes(discountType)) throw new AppError('discountType must be PERCENT or FIXED', 400, 'VALIDATION_ERROR');
    updateData.discountType = discountType;
  }
  if (discountValue !== undefined) {
    const value = Number(discountValue);
    if (Number.isNaN(value) || value < 0) throw new AppError('Invalid discountValue', 400, 'VALIDATION_ERROR');
    if ((updateData.discountType || coupon.discountType) === 'PERCENT' && value > 100) {
      throw new AppError('Percent discount cannot exceed 100', 400, 'VALIDATION_ERROR');
    }
    updateData.discountValue = value;
  }
  if (minOrderAmount !== undefined) updateData.minOrderAmount = minOrderAmount == null ? null : Number(minOrderAmount);
  if (validFrom !== undefined) updateData.validFrom = new Date(validFrom);
  if (validUntil !== undefined) updateData.validUntil = new Date(validUntil);
  if (maxUses !== undefined) updateData.maxUses = maxUses == null ? null : Math.max(0, parseInt(maxUses, 10));
  if (typeof isActive === 'boolean') updateData.isActive = isActive;

  return prisma.vendorCoupon.update({
    where: { id: couponId },
    data: updateData,
  });
}

/**
 * Delete coupon (vendor can only delete own)
 */
async function remove(couponId, vendorId) {
  const coupon = await prisma.vendorCoupon.findUnique({
    where: { id: couponId },
  });
  if (!coupon) throw new AppError('Coupon not found', 404, 'NOT_FOUND');
  if (coupon.vendorId !== vendorId) {
    throw new AppError('You can only delete your own coupons', 403, 'FORBIDDEN');
  }
  await prisma.vendorCoupon.delete({ where: { id: couponId } });
  return { deleted: true };
}

/**
 * Find valid coupon by code and vendor id (for application at checkout)
 * Returns coupon or null if not found/invalid
 */
async function findValidByCode(code, vendorId) {
  if (!code || !vendorId) return null;
  const codeNorm = String(code).trim().toUpperCase();
  const now = new Date();
  const coupon = await prisma.vendorCoupon.findUnique({
    where: {
      vendorId_code: { vendorId, code: codeNorm },
    },
  });
  if (!coupon || !coupon.isActive) return null;
  if (coupon.validFrom > now || coupon.validUntil < now) return null;
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return null;
  return coupon;
}

/**
 * Compute discount amount for a given subtotal (vendor services only)
 * coupon: VendorCoupon, vendorSubtotal: number
 * Returns { discountAmount: number }
 */
function computeDiscount(coupon, vendorSubtotal) {
  if (!coupon || vendorSubtotal <= 0) return { discountAmount: 0 };
  const minOrder = coupon.minOrderAmount != null ? Number(coupon.minOrderAmount) : 0;
  if (vendorSubtotal < minOrder) return { discountAmount: 0 };
  const value = Number(coupon.discountValue);
  let discountAmount = 0;
  if (coupon.discountType === 'PERCENT') {
    discountAmount = Math.round((vendorSubtotal * value / 100) * 100) / 100;
  } else {
    discountAmount = Math.min(value, vendorSubtotal);
  }
  return { discountAmount };
}

/**
 * Increment usedCount for a coupon (after booking is confirmed/created)
 */
async function incrementUsedCount(couponId) {
  await prisma.vendorCoupon.update({
    where: { id: couponId },
    data: { usedCount: { increment: 1 } },
  });
}

/**
 * List all coupons (Admin)
 */
async function listAllCoupons(options = {}) {
  const { isActive, vendorId, search } = options;
  const where = {};
  if (isActive !== undefined) where.isActive = isActive === true || isActive === 'true';
  if (vendorId) where.vendorId = vendorId;
  if (search) {
    where.OR = [
      { code: { contains: search.toUpperCase() } },
      { vendor: { businessName: { contains: search } } },
      { vendor: { businessNameAr: { contains: search } } }
    ];
  }

  return prisma.vendorCoupon.findMany({
    where,
    include: {
      vendor: { select: { id: true, businessName: true, businessNameAr: true } }
    },
    orderBy: { createdAt: 'desc' },
  });
}

module.exports = {
  getVendorIdByUserId,
  listByVendorId,
  listAllCoupons,
  create,
  update,
  remove,
  findValidByCode,
  computeDiscount,
  incrementUsedCount,
};

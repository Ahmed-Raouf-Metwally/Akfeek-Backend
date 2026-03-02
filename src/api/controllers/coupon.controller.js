const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Coupon Controller — كوبونات الخصم للفيندور
 * Admin: GET /api/vendors/coupons
 * Vendor: GET/POST /api/vendors/profile/me/coupons, PATCH/DELETE .../coupons/:id
 */
class CouponController {
  /** GET /api/vendors/coupons — كل الكوبونات (أدمن فقط) */
  async getAllCoupons(req, res, next) {
    try {
      const { search, page = 1, limit = 50 } = req.query;
      const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, Math.max(1, parseInt(limit) || 50));
      const take = Math.min(100, Math.max(1, parseInt(limit) || 50));

      const where = {};
      if (search && String(search).trim()) {
        const term = String(search).trim();
        where.OR = [
          { code: { contains: term } },
          { vendor: { businessName: { contains: term } } },
          { vendor: { businessNameAr: { contains: term } } },
        ];
      }

      const [coupons, total] = await Promise.all([
        prisma.coupon.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            vendor: {
              select: {
                id: true,
                businessName: true,
                businessNameAr: true,
                userId: true,
              },
            },
          },
        }),
        prisma.coupon.count({ where }),
      ]);

      const data = coupons.map((c) => ({
        id: c.id,
        code: c.code,
        discountType: c.discountType,
        discountValue: Number(c.discountValue),
        minOrderAmount: c.minOrderAmount != null ? Number(c.minOrderAmount) : null,
        validFrom: c.validFrom,
        validUntil: c.validUntil,
        maxUses: c.maxUses,
        usedCount: c.usedCount,
        isActive: c.isActive,
        createdAt: c.createdAt,
        vendor: c.vendor,
      }));

      res.json({
        success: true,
        data,
        pagination: {
          page: Math.max(1, parseInt(page)),
          limit: take,
          total,
          totalPages: Math.ceil(total / take) || 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/vendors/profile/me/coupons — كوبونات الفيندور الحالي */
  async getMyCoupons(req, res, next) {
    try {
      const vendor = await prisma.vendorProfile.findUnique({
        where: { userId: req.user.id },
        select: { id: true },
      });
      if (!vendor) throw new AppError('Vendor profile not found', 404, 'NOT_FOUND');

      const coupons = await prisma.coupon.findMany({
        where: { vendorId: vendor.id },
        orderBy: { createdAt: 'desc' },
      });

      const data = coupons.map((c) => ({
        id: c.id,
        code: c.code,
        discountType: c.discountType,
        discountValue: Number(c.discountValue),
        minOrderAmount: c.minOrderAmount != null ? Number(c.minOrderAmount) : null,
        validFrom: c.validFrom,
        validUntil: c.validUntil,
        maxUses: c.maxUses,
        usedCount: c.usedCount,
        isActive: c.isActive,
        createdAt: c.createdAt,
      }));

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/vendors/profile/me/coupons */
  async createCoupon(req, res, next) {
    try {
      const vendor = await prisma.vendorProfile.findUnique({
        where: { userId: req.user.id },
        select: { id: true },
      });
      if (!vendor) throw new AppError('Vendor profile not found', 404, 'NOT_FOUND');

      const {
        code,
        discountType = 'PERCENT',
        discountValue,
        minOrderAmount,
        validFrom,
        validUntil,
        maxUses,
      } = req.body;

      if (!code || !String(code).trim()) throw new AppError('Coupon code is required', 400, 'VALIDATION_ERROR');
      if (discountType !== 'PERCENT' && discountType !== 'FIXED') throw new AppError('discountType must be PERCENT or FIXED', 400, 'VALIDATION_ERROR');
      const numValue = Number(discountValue);
      if (Number.isNaN(numValue) || numValue < 0) throw new AppError('Invalid discount value', 400, 'VALIDATION_ERROR');
      if (discountType === 'PERCENT' && numValue > 100) throw new AppError('Percent discount cannot exceed 100', 400, 'VALIDATION_ERROR');
      if (!validFrom || !validUntil) throw new AppError('validFrom and validUntil are required', 400, 'VALIDATION_ERROR');
      const fromDate = new Date(validFrom);
      const toDate = new Date(validUntil);
      if (toDate < fromDate) throw new AppError('validUntil must be after validFrom', 400, 'VALIDATION_ERROR');

      const normalizedCode = String(code).trim().toUpperCase();
      const existing = await prisma.coupon.findUnique({
        where: { vendorId_code: { vendorId: vendor.id, code: normalizedCode } },
      });
      if (existing) throw new AppError('A coupon with this code already exists for your store', 409, 'ALREADY_EXISTS');

      const coupon = await prisma.coupon.create({
        data: {
          vendorId: vendor.id,
          code: normalizedCode,
          discountType,
          discountValue: numValue,
          minOrderAmount: minOrderAmount != null && minOrderAmount !== '' ? Number(minOrderAmount) : null,
          validFrom: fromDate,
          validUntil: toDate,
          maxUses: maxUses != null && maxUses !== '' ? parseInt(maxUses, 10) : null,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          id: coupon.id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: Number(coupon.discountValue),
          minOrderAmount: coupon.minOrderAmount != null ? Number(coupon.minOrderAmount) : null,
          validFrom: coupon.validFrom,
          validUntil: coupon.validUntil,
          maxUses: coupon.maxUses,
          usedCount: coupon.usedCount,
          isActive: coupon.isActive,
          createdAt: coupon.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /** PATCH /api/vendors/profile/me/coupons/:id */
  async updateCoupon(req, res, next) {
    try {
      const vendor = await prisma.vendorProfile.findUnique({
        where: { userId: req.user.id },
        select: { id: true },
      });
      if (!vendor) throw new AppError('Vendor profile not found', 404, 'NOT_FOUND');

      const coupon = await prisma.coupon.findFirst({
        where: { id: req.params.id, vendorId: vendor.id },
      });
      if (!coupon) throw new AppError('Coupon not found', 404, 'NOT_FOUND');

      const { discountType, discountValue, minOrderAmount, validFrom, validUntil, maxUses, isActive } = req.body;
      const updateData = {};
      if (discountType !== undefined) {
        if (discountType !== 'PERCENT' && discountType !== 'FIXED') throw new AppError('discountType must be PERCENT or FIXED', 400, 'VALIDATION_ERROR');
        updateData.discountType = discountType;
      }
      if (discountValue !== undefined) {
        const numValue = Number(discountValue);
        if (Number.isNaN(numValue) || numValue < 0) throw new AppError('Invalid discount value', 400, 'VALIDATION_ERROR');
        if ((updateData.discountType || coupon.discountType) === 'PERCENT' && numValue > 100) throw new AppError('Percent discount cannot exceed 100', 400, 'VALIDATION_ERROR');
        updateData.discountValue = numValue;
      }
      if (minOrderAmount !== undefined) updateData.minOrderAmount = minOrderAmount === null || minOrderAmount === '' ? null : Number(minOrderAmount);
      if (validFrom !== undefined) updateData.validFrom = new Date(validFrom);
      if (validUntil !== undefined) updateData.validUntil = new Date(validUntil);
      if (maxUses !== undefined) updateData.maxUses = maxUses === null || maxUses === '' ? null : parseInt(maxUses, 10);
      if (typeof isActive === 'boolean') updateData.isActive = isActive;

      const updated = await prisma.coupon.update({
        where: { id: req.params.id },
        data: updateData,
      });

      res.json({
        success: true,
        data: {
          id: updated.id,
          code: updated.code,
          discountType: updated.discountType,
          discountValue: Number(updated.discountValue),
          minOrderAmount: updated.minOrderAmount != null ? Number(updated.minOrderAmount) : null,
          validFrom: updated.validFrom,
          validUntil: updated.validUntil,
          maxUses: updated.maxUses,
          usedCount: updated.usedCount,
          isActive: updated.isActive,
          createdAt: updated.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /api/vendors/profile/me/coupons/:id */
  async deleteCoupon(req, res, next) {
    try {
      const vendor = await prisma.vendorProfile.findUnique({
        where: { userId: req.user.id },
        select: { id: true },
      });
      if (!vendor) throw new AppError('Vendor profile not found', 404, 'NOT_FOUND');

      const coupon = await prisma.coupon.findFirst({
        where: { id: req.params.id, vendorId: vendor.id },
      });
      if (!coupon) throw new AppError('Coupon not found', 404, 'NOT_FOUND');

      await prisma.coupon.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Coupon deleted' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CouponController();

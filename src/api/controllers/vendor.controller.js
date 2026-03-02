const vendorService = require('../../services/vendor.service');
const bcrypt = require('bcrypt');
const prisma = require('../../utils/database/prisma');

/**
 * Vendor Controller
 * Handles requests for vendor management
 */
class VendorController {
  /**
   * Get all vendors
   * GET /api/vendors
   */
  async getAllVendors(req, res, next) {
    try {
      const { status, search, isVerified, vendorType, page, limit } = req.query;
      const result = await vendorService.getAllVendors({
        status,
        search,
        isVerified,
        vendorType,
        page: page || 1,
        limit: limit || 12,
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get vendor by ID
   * GET /api/vendors/:id
   */
  async getVendorById(req, res, next) {
    try {
      const vendor = await vendorService.getVendorById(req.params.id);

      res.json({
        success: true,
        data:vendor,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user's vendor profile
   * GET /api/vendors/profile/me
   */
  async getMyVendorProfile(req, res, next) {
    try {
      const vendor = await vendorService.getVendorByUserId(req.user.id);

      res.json({
        success: true,
        data: vendor,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get comprehensive care bookings for current vendor (مواعيد الحجوزات)
   * GET /api/vendors/profile/me/comprehensive-care-bookings
   */
  async getMyComprehensiveCareBookings(req, res, next) {
    try {
      const result = await vendorService.getComprehensiveCareBookings(req.user.id, {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
      });

      res.json({
        success: true,
        data: result.list,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new vendor profile
   * POST /api/vendors
   */
  async createVendor(req, res, next) {
    try {
      let userId;

      if (req.user.role === 'ADMIN') {
        if (req.body.newAccount) {
          // Create a brand-new user with VENDOR role, then link
          const { email, password, firstName, lastName } = req.body.newAccount;
          if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required for new account creation' });
          }
          const existing = await prisma.user.findFirst({ where: { email } });
          if (existing) {
            return res.status(409).json({ success: false, error: 'البريد الإلكتروني مسجل مسبقاً. استخدم بريداً آخر أو اختر "ربط بمستخدم موجود".' });
          }
          const hashedPassword = await bcrypt.hash(password, 10);
          const newUser = await prisma.user.create({
            data: {
              email,
              passwordHash: hashedPassword,
              role: 'VENDOR',
              status: 'ACTIVE',
              profile: {
                create: {
                  firstName: firstName || '',
                  lastName: lastName || '',
                },
              },
            },
          });
          userId = newUser.id;
        } else {
          userId = req.body.userId || null;
        }
      } else {
        userId = req.user.id;
      }

      if (!userId) {
        return res.status(400).json({ success: false, error: 'يجب تحديد مستخدم أو إنشاء حساب جديد' });
      }

      const vendor = await vendorService.createVendor(userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Vendor profile created successfully',
        messageAr: 'تم إنشاء ملف المورد بنجاح',
        data: vendor,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update vendor profile
   * PUT /api/vendors/:id
   */
  async updateVendor(req, res, next) {
    try {
      // If vendor, ensure they can only update their own profile
      if (req.user.role === 'VENDOR') {
        const vendorProfile = await vendorService.getVendorByUserId(req.user.id);
        if (vendorProfile.id !== req.params.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only update your own profile',
            messageAr: 'يمكنك فقط تحديث ملفك الشخصي',
          });
        }
      }

      const vendor = await vendorService.updateVendor(req.params.id, req.body);

      res.json({
        success: true,
        message: 'Vendor profile updated successfully',
        messageAr: 'تم تحديث ملف المورد بنجاح',
        data: vendor,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update vendor status (Admin only)
   * PUT /api/vendors/:id/status
   */
  async updateVendorStatus(req, res, next) {
    try {
      const { status } = req.body;
      const vendor = await vendorService.updateVendorStatus(req.params.id, status);

      res.json({
        success: true,
        message: 'Vendor status updated successfully',
        messageAr: 'تم تحديث حالة المورد بنجاح',
        data: vendor,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get vendor statistics
   * GET /api/vendors/:id/stats
   */
  async getVendorStats(req, res, next) {
    try {
      const stats = await vendorService.getVendorStats(req.params.id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete vendor (Admin only)
   * DELETE /api/vendors/:id
   */
  async deleteVendor(req, res, next) {
    try {
      await vendorService.deleteVendor(req.params.id);

      res.json({
        success: true,
        message: 'Vendor deleted successfully',
        messageAr: 'تم حذف المورد بنجاح',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/vendors/:id/reviews
   */
  async getVendorReviews(req, res, next) {
    try {
      const { id } = req.params;
      const page  = Math.max(1, parseInt(req.query.page)  || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
      const skip  = (page - 1) * limit;

      const [reviews, total, agg] = await Promise.all([
        prisma.vendorReview.findMany({
          where: { vendorId: id },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: { select: { firstName: true, lastName: true, avatar: true } },
              },
            },
          },
        }),
        prisma.vendorReview.count({ where: { vendorId: id } }),
        prisma.vendorReview.aggregate({
          where: { vendorId: id },
          _avg: { rating: true },
        }),
      ]);

      res.json({
        success: true,
        data: reviews,
        averageRating: agg._avg.rating ?? 0,
        totalReviews: total,
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/vendors/:id/reviews
   */
  async submitVendorReview(req, res, next) {
    try {
      const { id: vendorId } = req.params;
      const userId = req.user.id;
      const { rating, comment } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
      }

      // Upsert — update if exists, create if not
      const review = await prisma.vendorReview.upsert({
        where: { vendorId_userId: { vendorId, userId } },
        update: { rating: parseInt(rating), comment: comment || null },
        create: { vendorId, userId, rating: parseInt(rating), comment: comment || null },
      });

      // Recalculate vendor averageRating & totalReviews
      const agg = await prisma.vendorReview.aggregate({
        where: { vendorId },
        _avg: { rating: true },
        _count: { id: true },
      });
      await prisma.vendorProfile.update({
        where: { id: vendorId },
        data: {
          averageRating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
          totalReviews: agg._count.id,
        },
      });

      res.status(201).json({ success: true, data: review });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VendorController();
